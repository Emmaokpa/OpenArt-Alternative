import { Worker } from "bullmq";
import { createWorkerRuntime, installShutdown } from "./bootstrap.js";
import type { JobRunnerDeps } from "./modules/jobs/runner.js";
import { runJob } from "./modules/jobs/runner.js";
import { reconcileLedger, sweep } from "./queue/maintenance.js";
import {
  JOB_NAMES,
  QUEUE_NAMES,
  type MaintenanceJobData,
  type RunJobData,
} from "./queue/queues.js";
import { redisConnectionOptions } from "./redis.js";

const runtime = createWorkerRuntime({ poolSize: 5 });
const { env, logger, queues } = runtime;

const deps: JobRunnerDeps = {
  env,
  logger,
  db: runtime.db,
  redis: runtime.redis,
  storage: runtime.storage,
  providers: runtime.providers,
  queues,
};

const connection = redisConnectionOptions(env.REDIS_URL);

const providerWorker = new Worker<RunJobData>(
  QUEUE_NAMES.providerJobs,
  async (job) => {
    await runJob(job.data.jobId, deps);
  },
  { connection, concurrency: 10 },
);

const maintenanceWorker = new Worker<MaintenanceJobData>(
  QUEUE_NAMES.maintenance,
  async (job) => {
    if (job.name === JOB_NAMES.reconcile || job.data.task === "reconcile") {
      await reconcileLedger(deps);
      return;
    }
    await sweep(deps);
  },
  { connection, concurrency: 1 },
);

for (const worker of [providerWorker, maintenanceWorker]) {
  worker.on("failed", (job, error) => {
    logger.error(
      { err: error, queue: worker.name, jobId: job?.id, jobName: job?.name },
      "queue job failed",
    );
  });
  worker.on("error", (error) => {
    logger.error({ err: error, queue: worker.name }, "worker error");
  });
}

await queues.maintenance.upsertJobScheduler(
  "sweep",
  { every: 60_000, immediately: true },
  { name: JOB_NAMES.sweep, data: { task: "sweep" } },
);

await queues.maintenance.upsertJobScheduler(
  "reconcile",
  { pattern: "0 3 * * *" },
  { name: JOB_NAMES.reconcile, data: { task: "reconcile" } },
);

logger.info("worker-io ready");

installShutdown(logger, runtime, async () => {
  await Promise.all([providerWorker.close(), maintenanceWorker.close()]);
});
