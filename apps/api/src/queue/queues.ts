import { Queue } from "bullmq";
import type { Env } from "../env.js";
import type { Logger } from "../logger.js";
import { redisConnectionOptions } from "../redis.js";

export const QUEUE_NAMES = {
  providerJobs: "provider-jobs",
  mediaJobs: "media-jobs",
  maintenance: "maintenance",
} as const;

export const JOB_NAMES = {
  runJob: "run-job",
  mediaStep: "media-step",
  probeAsset: "probe-asset",
  sweep: "sweep",
  reconcile: "reconcile",
} as const;

export interface RunJobData {
  jobId: string;
}

export type MediaJobData =
  | { kind: "job-step"; jobId: string; stepId: string }
  | { kind: "probe-asset"; assetId: string };

export interface MaintenanceJobData {
  task: "sweep" | "reconcile";
}

export interface Queues {
  providerJobs: Queue<RunJobData>;
  mediaJobs: Queue<MediaJobData>;
  maintenance: Queue<MaintenanceJobData>;
  close(): Promise<void>;
}

const RETENTION = {
  removeOnComplete: { count: 1_000 },
  removeOnFail: { age: 14 * 24 * 60 * 60 },
  // A queue-level retry would fight the resumable runner, which owns retries
  // and refunds itself. Stalled jobs are still recovered by BullMQ.
  attempts: 1,
};

export function createQueues(env: Env, logger: Logger): Queues {
  const connection = redisConnectionOptions(env.REDIS_URL);
  const defaults = { connection, defaultJobOptions: RETENTION };

  const providerJobs = new Queue<RunJobData>(QUEUE_NAMES.providerJobs, defaults);
  const mediaJobs = new Queue<MediaJobData>(QUEUE_NAMES.mediaJobs, defaults);
  const maintenance = new Queue<MaintenanceJobData>(QUEUE_NAMES.maintenance, defaults);

  for (const queue of [providerJobs, mediaJobs, maintenance]) {
    queue.on("error", (error: Error) => {
      logger.error({ err: error, queue: queue.name }, "queue error");
    });
  }

  return {
    providerJobs,
    mediaJobs,
    maintenance,
    async close() {
      await Promise.all([providerJobs.close(), mediaJobs.close(), maintenance.close()]);
    },
  };
}

/**
 * Enqueues a run. Every enqueue gets a unique BullMQ id so a failed or
 * completed entry that is still retained never blocks a later retry; the
 * runner's Redis lock prevents two entries from running at the same time.
 */
export async function enqueueJobRun(
  queues: Pick<Queues, "providerJobs">,
  jobId: string,
  delayMs = 0,
): Promise<void> {
  await queues.providerJobs.add(
    JOB_NAMES.runJob,
    { jobId },
    { jobId: `${jobId}:${Date.now()}`, delay: Math.max(0, delayMs) },
  );
}

export async function enqueueMediaStep(
  queues: Pick<Queues, "mediaJobs">,
  jobId: string,
  stepId: string,
): Promise<void> {
  await queues.mediaJobs.add(
    JOB_NAMES.mediaStep,
    { kind: "job-step", jobId, stepId },
    { jobId: `${stepId}:${Date.now()}` },
  );
}

export async function enqueueAssetProbe(
  queues: Pick<Queues, "mediaJobs">,
  assetId: string,
): Promise<void> {
  await queues.mediaJobs.add(
    JOB_NAMES.probeAsset,
    { kind: "probe-asset", assetId },
    { jobId: `probe:${assetId}:${Date.now()}` },
  );
}
