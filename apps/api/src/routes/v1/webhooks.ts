import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { jobSteps, webhookEvents } from "../../db/schema/core.js";
import { notFound } from "../../lib/errors.js";
import { validateBody } from "../../http/validate.js";
import { providerWebhookSchema } from "../../modules/jobs/schemas.js";
import { enqueueJobRun } from "../../queue/queues.js";
import type { ApiContext } from "./context.js";

/**
 * Provider completion webhooks. Phase 1 only accepts the fake provider, which
 * has no shared secret; real adapters add signature verification before this
 * route is exposed in Phase 2. Replays are ignored by the `webhook_events`
 * primary key.
 */
export function webhooksRouter(ctx: ApiContext): Router {
  const router = Router();

  router.post("/providers/:provider", validateBody(providerWebhookSchema), async (req, res) => {
    const provider = req.params.provider ?? "";
    if (provider !== "fake") throw notFound("Unknown provider");

    const body = req.body as {
      externalId: string;
      status: "succeeded" | "failed";
      error?: string;
    };

    const eventId =
      req.header("x-webhook-id")?.slice(0, 200) ?? `${body.externalId}:${body.status}`;

    const inserted = await ctx.db
      .insert(webhookEvents)
      .values({ provider, eventId, payload: body as Record<string, unknown> })
      .onConflictDoNothing()
      .returning({ eventId: webhookEvents.eventId });

    if (inserted.length === 0) {
      res.json({ received: true, duplicate: true });
      return;
    }

    const [step] = await ctx.db
      .select({ jobId: jobSteps.jobId })
      .from(jobSteps)
      .where(eq(jobSteps.externalId, body.externalId))
      .limit(1);

    if (step) {
      try {
        await enqueueJobRun(ctx.queues, step.jobId);
      } catch (error) {
        // Polling still completes the job; the sweeper also recovers it.
        ctx.logger.warn({ err: error, jobId: step.jobId }, "could not enqueue after a webhook");
      }
    }

    await ctx.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));

    res.json({ received: true, duplicate: false });
  });

  return router;
}
