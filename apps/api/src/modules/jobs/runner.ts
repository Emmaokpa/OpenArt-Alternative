import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { JobType } from "@app/shared";
import type { Db } from "../../db/client.js";
import { jobs, jobSteps } from "../../db/schema/core.js";
import type { Env } from "../../env.js";
import { AppError, isAppError } from "../../lib/errors.js";
import type { Storage } from "../../lib/storage.js";
import type { Logger } from "../../logger.js";
import { getModel, type ModelRecord } from "../catalog/catalog.js";
import type { ProviderRegistry } from "../../providers/registry.js";
import { ProviderError } from "../../providers/types.js";
import { enqueueJobRun, enqueueMediaStep, type Queues } from "../../queue/queues.js";
import { refundCredits } from "../credits/credits.js";
import { executeStep, type StepResult } from "./pipelines.js";
import {
  JOB_PIPELINES,
  MEDIA_STEP_KINDS,
  isTerminalStatus,
  type JobRecord,
  type JobStepRecord,
} from "./types.js";

const LOCK_TTL_MS = 15 * 60_000;

const RELEASE_LOCK = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

export interface JobRunnerDeps {
  env: Env;
  logger: Logger;
  db: Db;
  redis: Redis;
  storage: Storage;
  providers: ProviderRegistry;
  queues: Queues;
}

/**
 * Resumable runner. Every step is recorded in `job_steps`; the provider id is
 * stored before waiting, so a worker killed mid-wait resumes polling instead of
 * resubmitting. Only one runner may work a job at a time (Redis lock).
 */
export async function runJob(jobId: string, deps: JobRunnerDeps): Promise<void> {
  const lockKey = `lock:job:${jobId}`;
  const token = randomUUID();

  let acquired: string | null;
  try {
    acquired = await deps.redis.set(lockKey, token, "PX", LOCK_TTL_MS, "NX");
  } catch (error) {
    deps.logger.error({ err: error, jobId }, "could not acquire the job lock");
    return;
  }

  if (acquired !== "OK") return;

  try {
    await runLocked(jobId, deps);
  } finally {
    try {
      await deps.redis.eval(RELEASE_LOCK, 1, lockKey, token);
    } catch (error) {
      deps.logger.warn({ err: error, jobId }, "could not release the job lock");
    }
  }
}

async function runLocked(jobId: string, deps: JobRunnerDeps): Promise<void> {
  let job = await loadRunnableJob(deps.db, jobId);
  if (!job) return;

  if (job.status === "queued") {
    const [started] = await deps.db
      .update(jobs)
      .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(jobs.id, job.id), eq(jobs.status, "queued")))
      .returning();

    if (started) job = started;
  }

  if (job.status !== "running") return;

  const plan = JOB_PIPELINES[job.type as JobType];
  if (!plan) {
    await failEarly(deps, job, new AppError(500, "INTERNAL", "Unknown job type"));
    return;
  }

  let model: ModelRecord;
  try {
    if (!job.modelId) throw new AppError(500, "INTERNAL", "The job has no model");
    model = await getModel(deps.db, job.modelId);
  } catch (error) {
    await failEarly(deps, job, error);
    return;
  }

  await deps.db
    .insert(jobSteps)
    .values(
      plan.map((kind, seq) => ({
        jobId: job.id,
        seq,
        kind,
        provider: model.provider,
        status: "pending",
      })),
    )
    .onConflictDoNothing();

  const steps = await deps.db
    .select()
    .from(jobSteps)
    .where(eq(jobSteps.jobId, job.id))
    .orderBy(jobSteps.seq);

  for (const [index, kind] of plan.entries()) {
    const step = steps.find((candidate) => candidate.seq === index && candidate.kind === kind);
    if (!step) continue;
    if (step.status === "succeeded" || step.status === "skipped") continue;

    const status = await currentStatus(deps.db, job.id);
    if (status !== "running") return;

    if (MEDIA_STEP_KINDS.has(kind)) {
      await deps.db
        .update(jobSteps)
        .set({ status: "running", startedAt: step.startedAt ?? new Date() })
        .where(eq(jobSteps.id, step.id));

      await setProgress(deps.db, job.id, progressFor(index, plan.length));
      await enqueueMediaStep(deps.queues, job.id, step.id);
      return;
    }

    let result: StepResult;
    try {
      result = await executeStep({
        env: deps.env,
        db: deps.db,
        logger: deps.logger,
        storage: deps.storage,
        provider: deps.providers.forModel(model),
        job,
        step,
        steps,
        model,
      });
    } catch (error) {
      await failStep(deps, job, step, error);
      return;
    }

    if (result.status === "wait") {
      await deps.db
        .update(jobSteps)
        .set({
          status: "running",
          attempt: step.attempt + 1,
          startedAt: step.startedAt ?? new Date(),
          error: null,
        })
        .where(eq(jobSteps.id, step.id));

      const progress = Math.max(
        progressFor(index, plan.length),
        typeof result.progress === "number" ? result.progress : 0,
      );
      await setProgress(deps.db, job.id, progress);
      await enqueueJobRun(deps.queues, job.id, result.retryInMs);
      return;
    }

    await completeStep(deps, job, step, result);

    // Keep the in-memory list current for the next step (store reads wait).
    step.status = "succeeded";
    step.output = result.output ?? null;
    step.externalId = result.externalId ?? step.externalId;
  }

  const [finished] = await deps.db
    .update(jobs)
    .set({
      status: "succeeded",
      progress: 100,
      finishedAt: new Date(),
      updatedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    })
    .where(and(eq(jobs.id, job.id), eq(jobs.status, "running")))
    .returning();

  if (finished) {
    deps.logger.info({ jobId: job.id, type: job.type }, "job succeeded");
  }
}

export async function loadRunnableJob(db: Db, jobId: string): Promise<JobRecord | undefined> {
  const [job] = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
    .limit(1);

  return job;
}

async function currentStatus(db: Db, jobId: string): Promise<string | null> {
  const [row] = await db.select({ status: jobs.status }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  return row?.status ?? null;
}

async function setProgress(db: Db, jobId: string, percent: number): Promise<void> {
  const progress = Math.max(0, Math.min(95, Math.round(percent)));
  await db
    .update(jobs)
    .set({ progress, updatedAt: new Date() })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "running")));
}

function progressFor(index: number, total: number): number {
  return Math.min(95, Math.round(((index + 1) / total) * 90));
}

/** Marks one step done. Also used by worker-media after an ffmpeg step. */
export async function completeStep(
  deps: JobRunnerDeps,
  job: JobRecord,
  step: JobStepRecord,
  result: Extract<StepResult, { status: "done" }>,
): Promise<void> {
  await deps.db
    .update(jobSteps)
    .set({
      status: "succeeded",
      output: result.output ?? null,
      externalId: result.externalId ?? step.externalId,
      attempt: step.attempt + 1,
      costUsdMicros: result.costUsdMicros ?? step.costUsdMicros,
      error: null,
      startedAt: step.startedAt ?? new Date(),
      finishedAt: new Date(),
    })
    .where(eq(jobSteps.id, step.id));

  const plan = JOB_PIPELINES[job.type as JobType];
  if (plan) {
    await setProgress(deps.db, job.id, progressFor(step.seq, plan.length));
  }
}

/**
 * Retries transient provider failures three times, then fails the job and
 * refunds exactly once in the same transaction that records the failure.
 */
export async function failStep(
  deps: JobRunnerDeps,
  job: JobRecord,
  step: JobStepRecord,
  error: unknown,
): Promise<void> {
  const message = messageOf(error);
  const retryable = error instanceof ProviderError && error.retryable;

  if (retryable && step.attempt < 3) {
    await deps.db
      .update(jobSteps)
      .set({ status: "pending", attempt: step.attempt + 1, error: message })
      .where(eq(jobSteps.id, step.id));

    await enqueueJobRun(deps.queues, job.id, Math.min(1_000 * 2 ** step.attempt, 30_000));
    deps.logger.warn({ jobId: job.id, step: step.kind, err: error }, "retrying a provider step");
    return;
  }

  const code = codeOf(error);

  await deps.db.transaction(async (tx) => {
    await tx
      .update(jobSteps)
      .set({
        status: "failed",
        attempt: step.attempt + 1,
        error: message,
        finishedAt: new Date(),
      })
      .where(eq(jobSteps.id, step.id));

    const [current] = await tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, job.id))
      .for("update")
      .limit(1);

    if (!current || isTerminalStatus(current.status)) return;

    await tx
      .update(jobs)
      .set({
        status: "failed",
        errorCode: code,
        errorMessage: message.slice(0, 1_000),
        progress: 100,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    await refundCredits(tx, {
      userId: job.userId,
      amount: job.creditCost,
      jobId: job.id,
      note: `Automatic refund: ${code}`,
    });
  });

  deps.logger.error({ jobId: job.id, step: step.kind, err: error }, "job failed");
}

/** Failure before the first step (wrong model, unknown type). */
async function failEarly(deps: JobRunnerDeps, job: JobRecord, error: unknown): Promise<void> {
  const code = codeOf(error);
  const message = messageOf(error);

  await deps.db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: jobs.status })
      .from(jobs)
      .where(eq(jobs.id, job.id))
      .for("update")
      .limit(1);

    if (!current || isTerminalStatus(current.status)) return;

    await tx
      .update(jobs)
      .set({
        status: "failed",
        errorCode: code,
        errorMessage: message.slice(0, 1_000),
        progress: 100,
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, job.id));

    await refundCredits(tx, {
      userId: job.userId,
      amount: job.creditCost,
      jobId: job.id,
      note: `Automatic refund: ${code}`,
    });
  });

  deps.logger.error({ jobId: job.id, err: error }, "job failed before starting");
}

function codeOf(error: unknown): string {
  if (error instanceof ProviderError) return error.code;
  if (isAppError(error)) return error.code;
  return "INTERNAL";
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  return "Unexpected error";
}
