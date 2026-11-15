import { eq } from "drizzle-orm";
import { Router } from "express";
import { jobs } from "../../db/schema/core.js";
import { badRequest } from "../../lib/errors.js";
import { rateLimit } from "../../http/rate-limit.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { getAuthContext, requireAuth } from "../../modules/auth/middleware.js";
import {
  listJobsQuerySchema,
  jobEnvelopeSchema,
  type JobEnvelope,
} from "../../modules/jobs/schemas.js";
import {
  cancelJob,
  createJob,
  deleteJob,
  getJobDetails,
  getJobForUser,
  listJobs,
  loadJobAssets,
  loadJobSteps,
  toJobView,
  toStepView,
} from "../../modules/jobs/service.js";
import { isTerminalStatus } from "../../modules/jobs/types.js";
import { param } from "../../lib/http-params.js";
import type { ApiContext } from "./context.js";

const SSE_POLL_MS = 1_000;
const SSE_HEARTBEAT_MS = 15_000;

export function jobsRouter(ctx: ApiContext): Router {
  const router = Router();
  const auth = requireAuth(ctx.auth);

  router.post(
    "/",
    auth,
    rateLimit({
      limiter: ctx.rateLimiter,
      scope: "jobs:create",
      limit: 10,
      windowSeconds: 60,
    }),
    validateBody(jobEnvelopeSchema),
    async (req, res) => {
      const { user } = getAuthContext(res);
      const idempotencyKey = req.header("idempotency-key");

      if (!idempotencyKey) {
        throw badRequest("The Idempotency-Key header is required when creating a job");
      }

      const result = await createJob(ctx.env, ctx.db, ctx.queues, ctx.logger, {
        userId: user.id,
        envelope: req.body as JobEnvelope,
        idempotencyKey,
      });

      const jobAssets = await loadJobAssets(ctx.db, [result.job.id]);
      const view = await toJobView(ctx.storage, result.job, {
        assets: jobAssets,
        includeDownloadUrls: result.created === false,
      });

      res.setHeader("Location", `/v1/jobs/${result.job.id}`);
      res.status(result.created ? 202 : 200).json({ job: view });
    },
  );

  router.get("/", auth, validateQuery(listJobsQuerySchema), async (req, res) => {
    const { user } = getAuthContext(res);
    const query = req.query as unknown as {
      limit: number;
      cursor?: string;
      status?: string;
    };

    const page = await listJobs(ctx.db, {
      userId: user.id,
      limit: query.limit,
      cursor: query.cursor,
      status: query.status as never,
    });

    const jobAssets = await loadJobAssets(
      ctx.db,
      page.jobs.map((job) => job.id),
    );
    const byJob = new Map<string, typeof jobAssets>();
    for (const asset of jobAssets) {
      if (!asset.jobId) continue;
      const bucket = byJob.get(asset.jobId) ?? [];
      bucket.push(asset);
      byJob.set(asset.jobId, bucket);
    }

    const views = await Promise.all(
      page.jobs.map((job) =>
        toJobView(ctx.storage, job, { assets: byJob.get(job.id) ?? [] }),
      ),
    );

    res.json({ jobs: views, nextCursor: page.nextCursor });
  });

  router.get("/:id/events", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    const job = await getJobForUser(ctx.db, user.id, param(req.params.id));

    res.status(200);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    let closed = false;
    let busy = false;
    let lastSignature = "";
    // eslint-disable-next-line prefer-const -- reassigned to a setInterval handle below
    let timer: NodeJS.Timeout | undefined;
    // eslint-disable-next-line prefer-const -- reassigned to a setInterval handle below
    let heartbeat: NodeJS.Timeout | undefined;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (timer) clearInterval(timer);
      if (heartbeat) clearInterval(heartbeat);
    };

    const send = (event: string, data: unknown) => {
      if (closed || res.writableEnded) return;
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    req.on("close", cleanup);

    const details = await getJobDetails(ctx.db, ctx.storage, user.id, job.id);
    lastSignature = signature(details.job.status, details.job.progress, details.steps);
    send("snapshot", details.view);

    if (isTerminalStatus(details.job.status)) {
      send("done", details.view);
      cleanup();
      res.end();
      return;
    }

    heartbeat = setInterval(() => {
      if (!closed) res.write(": ping\n\n");
    }, SSE_HEARTBEAT_MS);

    timer = setInterval(async () => {
      if (closed || busy) return;
      busy = true;

      try {
        const [row] = await ctx.db
          .select({
            status: jobs.status,
            progress: jobs.progress,
            errorCode: jobs.errorCode,
            errorMessage: jobs.errorMessage,
          })
          .from(jobs)
          .where(eq(jobs.id, job.id))
          .limit(1);

        if (!row) {
          cleanup();
          res.end();
          return;
        }

        const steps = await loadJobSteps(ctx.db, job.id);
        const nextSignature = signature(row.status, row.progress, steps);

        if (nextSignature !== lastSignature) {
          lastSignature = nextSignature;
          send("progress", {
            status: row.status,
            progress: row.progress,
            errorCode: row.errorCode,
            errorMessage: row.errorMessage,
            steps: steps.map(toStepView),
          });
        }

        if (isTerminalStatus(row.status)) {
          const final = await getJobDetails(ctx.db, ctx.storage, user.id, job.id);
          send("done", final.view);
          cleanup();
          res.end();
        }
      } catch (error) {
        ctx.logger.warn({ err: error, jobId: job.id }, "SSE poll failed");
      } finally {
        busy = false;
      }
    }, SSE_POLL_MS);
  });

  router.get("/:id", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    const details = await getJobDetails(ctx.db, ctx.storage, user.id, param(req.params.id));
    res.json({ job: details.view });
  });

  router.post("/:id/cancel", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    await cancelJob(
      {
        db: ctx.db,
        queues: ctx.queues,
        providers: ctx.providers,
        logger: ctx.logger,
      },
      user.id,
      param(req.params.id),
    );

    const details = await getJobDetails(ctx.db, ctx.storage, user.id, param(req.params.id));
    res.json({ job: details.view });
  });

  router.delete("/:id", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    await deleteJob(
      { db: ctx.db, logger: ctx.logger, storage: ctx.storage },
      user.id,
      param(req.params.id),
    );
    res.status(204).end();
  });

  return router;
}

function signature(status: string, progress: number, steps: Array<{ seq: number; status: string }>): string {
  return `${status}:${progress}:${steps.map((step) => `${step.seq}:${step.status}`).join(",")}`;
}
