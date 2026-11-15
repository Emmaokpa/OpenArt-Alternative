import { and, eq, sql } from "drizzle-orm";
import { Router } from "express";
import { jobSteps, webhookEvents } from "../../db/schema/core.js";
import { notFound, unauthorized } from "../../lib/errors.js";
import { validateBody } from "../../http/validate.js";
import { providerWebhookSchema } from "../../modules/jobs/schemas.js";
import { enqueueJobRun } from "../../queue/queues.js";
import type { ApiContext } from "./context.js";
import type { Env } from "../../env.js";

/**
 * Provider completion webhooks.
 *
 * Phase 1 accepted only the fake provider. Phase 2 adds fal.ai with optional
 * HMAC signature verification (via FAL_WEBHOOK_SECRET). Replays are ignored
 * by the `webhook_events` primary key. On receipt, the job is re-enqueued so
 * the runner polls for the final result (webhook is a hint, not a source of
 * truth).
 *
 * A raw-body capture middleware (`express.json({ verify })` in `app.ts`)
 * populates `req.rawBody` before JSON parsing, so signature verification can
 * run against the exact bytes fal.ai sent.
 */
export function webhooksRouter(ctx: ApiContext): Router {
  const router = Router();

  router.post("/providers/:provider", validateBody(providerWebhookSchema), async (req, res) => {
    const provider = req.params.provider ?? "";
    if (provider !== "fake" && provider !== "fal") throw notFound("Unknown provider");

    const body = req.body as {
      externalId: string;
      status: "succeeded" | "failed";
      error?: string;
      request_id?: string;
      output?: Record<string, unknown>;
    };

    // --- fal.ai signature verification -------------------------------------
    if (provider === "fal") {
      const env = ctx.env as Env & { FAL_WEBHOOK_SECRET?: string };
      const secret = env.FAL_WEBHOOK_SECRET;
      if (secret) {
        const signature =
          req.header("fal-signature") ?? req.header("X-Fal-Signature") ?? "";
        if (!signature) {
          throw unauthorized("Missing fal.ai webhook signature");
        }

        const rawBody = (req as { rawBody?: string }).rawBody;
        if (!rawBody) {
          throw unauthorized("Cannot verify signature without raw body");
        }

        const expected = await crypto.subtle
          .digest(
            "SHA-256",
            new TextEncoder().encode(`${secret}|${rawBody}`),
          )
          .then((buf) => Buffer.from(buf).toString("hex"));

        const provided = signature.startsWith("sha256=")
          ? signature.slice(7)
          : signature;
        if (!timingSafeEqual(provided, expected)) {
          throw unauthorized("Invalid fal.ai webhook signature");
        }
      }
    }

    // Use the fal.ai request_id if present, otherwise fall back to externalId.
    const requestId = body.request_id ?? body.externalId;
    const eventId =
      req.header("x-webhook-id")?.slice(0, 200) ?? `${provider}:${requestId}:${body.status}`;

    const inserted = await ctx.db
      .insert(webhookEvents)
      .values({ provider, eventId, payload: body as Record<string, unknown> })
      .onConflictDoNothing()
      .returning({ eventId: webhookEvents.eventId });

    if (inserted.length === 0) {
      res.json({ received: true, duplicate: true });
      return;
    }

    // Look up the job step by externalId.
    // - fake: externalId is the base64url-encoded state, match exactly.
    // - fal: externalId is `fal:{endpoint}:{request_id}`, match by suffix.
    let step;
    if (provider === "fal" && body.request_id) {
      const [s] = await ctx.db
        .select({ jobId: jobSteps.jobId })
        .from(jobSteps)
        .where(sql`${jobSteps.externalId} LIKE ${`%:${body.request_id}`}`)
        .limit(1);
      step = s;
    } else {
      const [s] = await ctx.db
        .select({ jobId: jobSteps.jobId })
        .from(jobSteps)
        .where(eq(jobSteps.externalId, body.externalId))
        .limit(1);
      step = s;
    }

    if (!step) {
      await ctx.db
        .update(webhookEvents)
        .set({ processedAt: new Date() })
        .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
      res.json({ received: true, duplicate: false, matched: false });
      return;
    }

    try {
      await enqueueJobRun(ctx.queues, step.jobId);
    } catch (error) {
      ctx.logger.warn({ err: error, jobId: step.jobId }, "could not enqueue after a webhook");
    }

    await ctx.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));

    res.json({ received: true, duplicate: false, matched: true });
  });

  return router;
}

/**
 * Constant-time string comparison to avoid timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
