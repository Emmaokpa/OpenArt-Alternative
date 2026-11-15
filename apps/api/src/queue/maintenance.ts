import { JOB_TYPE_CAPABILITY } from "@app/shared";
import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";
import type { Redis } from "ioredis";
import type { Db } from "../db/client.js";
import { assets, jobs } from "../db/schema/core.js";
import { cleanScratch } from "../lib/scratch.js";
import type { Storage } from "../lib/storage.js";
import type { Logger } from "../logger.js";
import type { Queues } from "../queue/queues.js";
import { enqueueJobRun } from "../queue/queues.js";
import { findLedgerMismatches, refundCredits } from "../modules/credits/credits.js";
import { PROVIDER_TIMEOUT_MS } from "../modules/jobs/types.js";

export interface MaintenanceDeps {
  db: Db;
  redis: Redis;
  queues: Queues;
  storage: Storage;
  logger: Logger;
}

const REQUEUE_MARKER_TTL_S = 10 * 60;
const RUNNING_GRACE_MS = 5 * 60_000;
const QUEUED_GRACE_MS = 60_000;

/**
 * The maintenance queue's minute tick: recover lost enqueues, fail stuck
 * jobs (refunding them), expire assets and clean scratch files.
 */
export async function sweep(deps: MaintenanceDeps): Promise<void> {
  await requeueLostJobs(deps);
  await failStuckJobs(deps);
  await expireAssets(deps);
  await cleanScratch(2 * 60 * 60_000);
}

async function requeueLostJobs(deps: MaintenanceDeps): Promise<void> {
  const cutoff = new Date(Date.now() - QUEUED_GRACE_MS);
  const rows = await deps.db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "queued"), isNull(jobs.deletedAt), lt(jobs.createdAt, cutoff)))
    .limit(50);

  for (const job of rows) {
    const marker = `sweep:requeue:${job.id}`;
    const first = await deps.redis.set(marker, "1", "EX", REQUEUE_MARKER_TTL_S, "NX");
    if (first !== "OK") continue;

    try {
      await enqueueJobRun(deps.queues, job.id);
      deps.logger.warn({ jobId: job.id }, "re-enqueued a queued job missing from the queue");
    } catch (error) {
      await deps.redis.del(marker).catch(() => undefined);
      deps.logger.error({ err: error, jobId: job.id }, "could not re-enqueue a lost job");
    }
  }
}

async function failStuckJobs(deps: MaintenanceDeps): Promise<void> {
  const cutoff = new Date(Date.now() - RUNNING_GRACE_MS);
  const rows = await deps.db
    .select()
    .from(jobs)
    .where(and(eq(jobs.status, "running"), isNull(jobs.deletedAt), lt(jobs.startedAt, cutoff)))
    .limit(50);

  for (const job of rows) {
    const capability = JOB_TYPE_CAPABILITY[job.type as keyof typeof JOB_TYPE_CAPABILITY];
    const timeout = PROVIDER_TIMEOUT_MS[capability] ?? 15 * 60_000;
    const startedAt = job.startedAt?.getTime() ?? 0;
    if (Date.now() - startedAt < timeout + RUNNING_GRACE_MS) continue;

    await deps.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: jobs.status })
        .from(jobs)
        .where(eq(jobs.id, job.id))
        .for("update")
        .limit(1);

      if (current?.status !== "running") return;

      await tx
        .update(jobs)
        .set({
          status: "failed",
          errorCode: "PROVIDER_TIMEOUT",
          errorMessage: "The job timed out and was refunded",
          progress: 100,
          finishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(jobs.id, job.id));

      await refundCredits(tx, {
        userId: job.userId,
        amount: job.creditCost,
        jobId: job.id,
        note: "Automatic refund: stuck job swept",
      });
    });

    deps.logger.error({ jobId: job.id }, "failed a stuck job and refunded it");
  }
}

async function expireAssets(deps: MaintenanceDeps): Promise<void> {
  const rows = await deps.db
    .select()
    .from(assets)
    .where(and(eq(assets.status, "ready"), isNotNull(assets.expiresAt), lt(assets.expiresAt, new Date())))
    .limit(100);

  for (const asset of rows) {
    try {
      await deps.storage.delete(asset.objectKey);
    } catch (error) {
      deps.logger.warn({ err: error, key: asset.objectKey }, "could not delete an expired object");
    }

    await deps.db.update(assets).set({ status: "deleted" }).where(eq(assets.id, asset.id));
  }

  if (rows.length > 0) {
    deps.logger.info({ count: rows.length }, "expired assets removed");
  }
}

/** Nightly ledger reconciliation: balances must equal the sum of entries. */
export async function reconcileLedger(deps: Pick<MaintenanceDeps, "db" | "logger">): Promise<void> {
  const mismatches = await findLedgerMismatches(deps.db);

  if (mismatches.length === 0) {
    deps.logger.info("ledger reconciliation passed");
    return;
  }

  for (const mismatch of mismatches) {
    deps.logger.error(mismatch, "ledger mismatch: balance does not equal the ledger sum");
  }
}
