import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import type {
  AssetKind,
  JobAssetView,
  JobStatus,
  JobStepView,
  JobType,
  JobView,
} from "@app/shared";
import type { Db } from "../../db/client.js";
import { assets, creditLedger, jobs, jobSteps } from "../../db/schema/core.js";
import {
  AppError,
  badRequest,
  conflict,
  isUniqueViolation,
  notFound,
} from "../../lib/errors.js";
import type { Storage } from "../../lib/storage.js";
import type { Logger } from "../../logger.js";
import type { ProviderRegistry } from "../../providers/registry.js";
import { enqueueJobRun, type Queues } from "../../queue/queues.js";
import {
  refundCredits,
  spendCredits,
} from "../credits/credits.js";
import { recordModeration, screenText } from "../moderation/moderation.js";
import { assertInputAssets } from "./input-assets.js";
import { resolveQuote } from "./quote.js";
import { calculateUnits } from "./pricing.js";
import type { JobEnvelope } from "./schemas.js";
import type { AssetRecord, JobRecord, JobStepRecord } from "./types.js";
import type { Env } from "../../env.js";
import type { PricingUnit } from "@app/shared";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export interface CreateJobInput {
  userId: string;
  envelope: JobEnvelope;
  idempotencyKey: string;
}

export interface CreateJobResult {
  job: JobRecord;
  created: boolean;
}

/**
 * The critical path from `02-backend-api.md`: screen, quote, then spend and
 * insert in one transaction. A replay of the same `Idempotency-Key` returns
 * the original job without charging again.
 */
export async function createJob(
  env: Pick<Env, "DAILY_SPEND_CAP_USD_MICROS" | "MAX_CONCURRENT_JOBS_PER_USER">,
  db: Db,
  queues: Pick<Queues, "providerJobs">,
  logger: Logger,
  input: CreateJobInput,
): Promise<CreateJobResult> {
  const key = input.idempotencyKey.trim();
  if (key.length === 0 || key.length > 200) {
    throw badRequest("Idempotency-Key must be between 1 and 200 characters");
  }

  const existing = await findJobByIdempotencyKey(db, input.userId, key);
  if (existing) return { job: existing, created: false };

  const quote = await resolveQuote(db, input.envelope);
  const prompt = typeof quote.params.prompt === "string" ? quote.params.prompt : null;

  if (prompt) {
    const screen = screenText(prompt);
    if (!screen.allowed) {
      await recordModeration(db, {
        userId: input.userId,
        stage: "prompt",
        result: "rejected",
        detail: { reason: screen.reason },
      });
      throw new AppError(422, "CONTENT_REJECTED", screen.reason ?? "This content is not allowed");
    }
  }

  await assertInputAssets(db, input.userId, input.envelope.type, quote.params);

  // --- Phase 2 spend limits -------------------------------------------------
  const dailyCap = env.DAILY_SPEND_CAP_USD_MICROS ?? 0;
  const maxConcurrent = env.MAX_CONCURRENT_JOBS_PER_USER ?? 0;

  if (dailyCap > 0 || maxConcurrent > 0) {
    const creditValueUsdMicros = 8000; // $0.008 per credit
    const unit = quote.model.unit as PricingUnit;
    const units = calculateUnits(unit, quote.params);
    const estimatedCostMicros = Math.round(quote.model.costUsdMicrosPerUnit * units);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    if (dailyCap > 0) {
      // Sum of today's spend (delta is negative for spend entries).
      const [spendRow] = await db
        .select({ total: sql<number>`coalesce(sum(${creditLedger.delta}), 0)` })
        .from(creditLedger)
        .where(
          and(
            eq(creditLedger.userId, input.userId),
            eq(creditLedger.type, "spend"),
            gte(creditLedger.createdAt, today),
          ),
        );

      const todaySpendMicros = Math.abs(Number(spendRow?.total ?? 0)) * creditValueUsdMicros;
      if (todaySpendMicros + estimatedCostMicros > dailyCap) {
        throw new AppError(402, "INSUFFICIENT_CREDITS", "Daily spend cap exceeded");
      }
    }

    if (maxConcurrent > 0) {
      const rows = (await db
        .select({ count: sql`count(*)::int` })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, input.userId),
            isNull(jobs.deletedAt),
            or(eq(jobs.status, "queued"), eq(jobs.status, "running")),
          ),
        )) as Array<{ count: number }>;

      const count = rows[0]?.count ?? 0;
      if (count >= maxConcurrent) {
        throw new AppError(429, "RATE_LIMITED", "Too many concurrent jobs");
      }
    }
  }

  let job: JobRecord;
  try {
    job = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(jobs)
        .values({
          userId: input.userId,
          type: input.envelope.type,
          status: "queued",
          modelId: quote.model.id,
          templateId: quote.template?.id ?? null,
          params: quote.params,
          creditCost: quote.credits,
          idempotencyKey: key,
        })
        .returning();

      if (!row) throw new AppError(500, "INTERNAL", "Could not create the job");

      // Same transaction: a failed spend rolls the job row back too.
      await spendCredits(tx, {
        userId: input.userId,
        amount: quote.credits,
        jobId: row.id,
      });

      return row;
    });
  } catch (error) {
    if (isUniqueViolation(error, "jobs_idem")) {
      const replay = await findJobByIdempotencyKey(db, input.userId, key);
      if (replay) return { job: replay, created: false };
    }
    throw error;
  }

  try {
    await enqueueJobRun(queues, job.id);
  } catch (error) {
    // The job is already paid for and stored. The sweeper re-enqueues any
    // `queued` job that is missing from Redis, so a queue blip is recoverable.
    logger.error({ err: error, jobId: job.id }, "could not enqueue job");
  }

  return { job, created: true };
}

export async function findJobByIdempotencyKey(
  db: Db,
  userId: string,
  idempotencyKey: string,
): Promise<JobRecord | undefined> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, userId),
        eq(jobs.idempotencyKey, idempotencyKey),
        isNull(jobs.deletedAt),
      ),
    )
    .limit(1);

  return job;
}

export async function getJobForUser(
  db: Db,
  userId: string,
  jobId: string,
): Promise<JobRecord> {
  if (!isUuid(jobId)) throw notFound("Job not found");

  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId), isNull(jobs.deletedAt)))
    .limit(1);

  if (!job) throw notFound("Job not found");
  return job;
}

export async function loadJobSteps(db: Db, jobId: string): Promise<JobStepRecord[]> {
  return db.select().from(jobSteps).where(eq(jobSteps.jobId, jobId)).orderBy(jobSteps.seq);
}

export async function loadJobAssets(db: Db, jobIds: string[]): Promise<AssetRecord[]> {
  if (jobIds.length === 0) return [];

  return db
    .select()
    .from(assets)
    .where(and(inArray(assets.jobId, jobIds), ne(assets.status, "deleted")))
    .orderBy(assets.createdAt);
}

export interface ListJobsOptions {
  userId: string;
  limit: number;
  cursor?: string;
  status?: JobStatus;
}

export interface ListJobsResult {
  jobs: JobRecord[];
  nextCursor: string | null;
}

export async function listJobs(db: Db, options: ListJobsOptions): Promise<ListJobsResult> {
  const conditions = [eq(jobs.userId, options.userId), isNull(jobs.deletedAt)];

  if (options.status) conditions.push(eq(jobs.status, options.status));

  if (options.cursor) {
    const cursor = decodeCursor(options.cursor);
    const older = or(
      lt(jobs.createdAt, cursor.createdAt),
      and(eq(jobs.createdAt, cursor.createdAt), lt(jobs.id, cursor.id)),
    );
    if (older) conditions.push(older);
  }

  const rows = await db
    .select()
    .from(jobs)
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const page = hasMore ? rows.slice(0, options.limit) : rows;
  const last = page.at(-1);

  return {
    jobs: page,
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  };
}

function encodeCursor(job: JobRecord): string {
  return Buffer.from(JSON.stringify({ createdAt: job.createdAt.toISOString(), id: job.id })).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") {
      throw new Error("bad cursor");
    }
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime()) || !isUuid(parsed.id)) throw new Error("bad cursor");
    return { createdAt, id: parsed.id };
  } catch {
    throw badRequest("Invalid pagination cursor");
  }
}

export async function toJobView(
  storage: Storage,
  job: JobRecord,
  options: {
    steps?: JobStepRecord[];
    assets?: AssetRecord[];
    includeDownloadUrls?: boolean;
  } = {},
): Promise<JobView> {
  const includeUrls = options.includeDownloadUrls ?? true;
  const views = await Promise.all(
    (options.assets ?? []).map((asset) => toAssetView(storage, asset, includeUrls)),
  );

  return {
    id: job.id,
    type: job.type as JobType,
    status: job.status as JobStatus,
    modelId: job.modelId,
    templateId: job.templateId,
    params: job.params,
    creditCost: job.creditCost,
    progress: job.progress,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    ...(options.steps ? { steps: options.steps.map(toStepView) } : {}),
    assets: views,
  };
}

export function toStepView(step: JobStepRecord): JobStepView {
  return {
    seq: step.seq,
    kind: step.kind,
    status: step.status,
    provider: step.provider,
    error: step.error,
    startedAt: step.startedAt?.toISOString() ?? null,
    finishedAt: step.finishedAt?.toISOString() ?? null,
  };
}

async function toAssetView(
  storage: Storage,
  asset: AssetRecord,
  includeUrl: boolean,
): Promise<JobAssetView> {
  let downloadUrl: string | undefined;

  if (
    includeUrl &&
    asset.status === "ready" &&
    (asset.role === "output" || asset.role === "thumbnail" || asset.role === "captions")
  ) {
    try {
      downloadUrl = await storage.presignGet({ key: asset.objectKey, expiresInSeconds: 3_600 });
    } catch {
      downloadUrl = undefined;
    }
  }

  return {
    id: asset.id,
    role: asset.role,
    kind: asset.kind as AssetKind,
    mime: asset.mime,
    durationMs: asset.durationMs,
    width: asset.width,
    height: asset.height,
    ...(downloadUrl ? { downloadUrl } : {}),
  };
}

export interface JobWithDetails {
  job: JobRecord;
  steps: JobStepRecord[];
  assets: AssetRecord[];
  view: JobView;
}

export async function getJobDetails(
  db: Db,
  storage: Storage,
  userId: string,
  jobId: string,
): Promise<JobWithDetails> {
  const job = await getJobForUser(db, userId, jobId);
  const [steps, jobAssets] = await Promise.all([
    loadJobSteps(db, job.id),
    loadJobAssets(db, [job.id]),
  ]);

  return {
    job,
    steps,
    assets: jobAssets,
    view: await toJobView(storage, job, { steps, assets: jobAssets }),
  };
}

export interface CancelDeps {
  db: Db;
  queues: Pick<Queues, "providerJobs">;
  providers: ProviderRegistry;
  logger: Logger;
}

/**
 * Queued jobs refund in full. Running jobs stop at the next step boundary but
 * are not refunded, because the provider may already have been paid.
 */
export async function cancelJob(
  deps: CancelDeps,
  userId: string,
  jobId: string,
): Promise<JobRecord> {
  if (!isUuid(jobId)) throw notFound("Job not found");

  const canceled = await deps.db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId), isNull(jobs.deletedAt)))
      .for("update")
      .limit(1);

    if (!job) throw notFound("Job not found");
    if (job.status === "canceled") return job;
    if (job.status === "succeeded" || job.status === "failed") {
      throw conflict("This job has already finished");
    }

    if (job.status === "queued") {
      await refundCredits(tx, {
        userId,
        amount: job.creditCost,
        jobId: job.id,
        note: "Canceled before the provider was called",
      });
    }

    const [updated] = await tx
      .update(jobs)
      .set({
        status: "canceled",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id))
      .returning();

    if (!updated) throw new AppError(500, "INTERNAL", "Could not cancel the job");
    return updated;
  });

  // Remote cancellation is best effort; the runner also stops at the next
  // step because the database status is now `canceled`.
  const steps = await deps.db
    .select()
    .from(jobSteps)
    .where(and(eq(jobSteps.jobId, canceled.id), isNotNull(jobSteps.externalId)));

  for (const step of steps) {
    if (!step.externalId || !step.provider) continue;
    try {
      await deps.providers.forProvider(step.provider).cancel(step.externalId);
    } catch (error) {
      deps.logger.warn({ err: error, jobId: canceled.id }, "provider cancel failed");
    }
  }

  return canceled;
}

export interface DeleteJobResult {
  deletedAssetKeys: string[];
}

/** Soft-deletes because `credit_ledger.job_id` must keep pointing at the job. */
export async function deleteJob(
  deps: { db: Db; logger: Logger; storage: Storage },
  userId: string,
  jobId: string,
): Promise<DeleteJobResult> {
  if (!isUuid(jobId)) throw notFound("Job not found");

  const deletedKeys = await deps.db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId), isNull(jobs.deletedAt)))
      .for("update")
      .limit(1);

    if (!job) throw notFound("Job not found");

    if (job.status === "queued") {
      await refundCredits(tx, {
        userId,
        amount: job.creditCost,
        jobId: job.id,
        note: "Job deleted before the provider was called",
      });
    }

    const jobAssets = await tx
      .select()
      .from(assets)
      .where(and(eq(assets.jobId, job.id), ne(assets.status, "deleted")));

    const active = job.status === "queued" || job.status === "running";

    await tx
      .update(jobs)
      .set({
        status: active ? "canceled" : job.status,
        deletedAt: new Date(),
        updatedAt: new Date(),
        finishedAt: active ? new Date() : job.finishedAt,
      })
      .where(eq(jobs.id, job.id));

    if (jobAssets.length > 0) {
      await tx
        .update(assets)
        .set({ status: "deleted" })
        .where(inArray(assets.id, jobAssets.map((asset) => asset.id)));
    }

    return jobAssets.map((asset) => asset.objectKey);
  });

  for (const key of deletedKeys) {
    try {
      await deps.storage.delete(key);
    } catch (error) {
      deps.logger.warn({ err: error, key }, "could not delete a stored object");
    }
  }

  return { deletedAssetKeys: deletedKeys };
}

