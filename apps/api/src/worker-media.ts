import { eq } from "drizzle-orm";
import { Worker } from "bullmq";
import { createWorkerRuntime, installShutdown } from "./bootstrap.js";
import { assets, jobSteps } from "./db/schema/core.js";
import { probeMedia, type MediaProbe } from "./lib/ffmpeg.js";
import { applyProbeResult } from "./modules/assets/assets.js";
import { getModel } from "./modules/catalog/catalog.js";
import { executeStep } from "./modules/jobs/pipelines.js";
import type { JobRunnerDeps } from "./modules/jobs/runner.js";
import { completeStep, failStep, loadRunnableJob } from "./modules/jobs/runner.js";
import { QUEUE_NAMES, enqueueJobRun, type MediaJobData } from "./queue/queues.js";
import { redisConnectionOptions } from "./redis.js";

const runtime = createWorkerRuntime({ poolSize: 3 });
const { env, logger, db, queues } = runtime;

const deps: JobRunnerDeps = {
  env,
  logger,
  db,
  redis: runtime.redis,
  storage: runtime.storage,
  providers: runtime.providers,
  queues,
};

async function runMediaStep(jobId: string, stepId: string): Promise<void> {
  const job = await loadRunnableJob(db, jobId);
  if (!job || job.status !== "running") return;

  const [step] = await db.select().from(jobSteps).where(eq(jobSteps.id, stepId)).limit(1);
  if (!step || step.status === "succeeded" || step.status === "failed") return;
  if (!job.modelId) return;

  const model = await getModel(db, job.modelId);
  const steps = await db
    .select()
    .from(jobSteps)
    .where(eq(jobSteps.jobId, job.id))
    .orderBy(jobSteps.seq);

  try {
    const result = await executeStep({
      env,
      db,
      logger,
      storage: runtime.storage,
      provider: runtime.providers.forModel(model),
      job,
      step,
      steps,
      model,
    });

    if (result.status !== "done") {
      // A media step should never wait; schedule another run if it does.
      await enqueueJobRun(queues, job.id, result.retryInMs);
      return;
    }

    await completeStep(deps, job, step, result);
    await enqueueJobRun(queues, job.id);
  } catch (error) {
    await failStep(deps, job, step, error);
  }
}

async function probeAsset(assetId: string): Promise<void> {
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset || asset.status !== "ready") return;

  let probe: MediaProbe | null;
  try {
    const signed = await runtime.storage.presignGet({
      key: asset.objectKey,
      expiresInSeconds: 300,
    });
    probe = await probeMedia(signed);
  } catch (error) {
    logger.warn({ err: error, assetId }, "asset probe failed");
    return;
  }

  await applyProbeResult({ db, storage: runtime.storage, queues, logger }, assetId, probe);
}

const mediaWorker = new Worker<MediaJobData>(
  QUEUE_NAMES.mediaJobs,
  async (job) => {
    if (job.data.kind === "probe-asset") {
      await probeAsset(job.data.assetId);
      return;
    }
    await runMediaStep(job.data.jobId, job.data.stepId);
  },
  { connection: redisConnectionOptions(env.REDIS_URL), concurrency: 1 },
);

mediaWorker.on("failed", (job, error) => {
  logger.error({ err: error, jobId: job?.id, jobName: job?.name }, "media job failed");
});
mediaWorker.on("error", (error) => {
  logger.error({ err: error }, "media worker error");
});

logger.info("worker-media ready");

installShutdown(logger, runtime, async () => {
  await mediaWorker.close();
});
