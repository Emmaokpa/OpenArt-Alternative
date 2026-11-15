import { Router } from "express";
import { JOB_TYPE_CAPABILITY } from "@app/shared";
import { validateBody } from "../../http/validate.js";
import { getBalance } from "../../modules/credits/credits.js";
import { getAuthContext, requireAuth } from "../../modules/auth/middleware.js";
import { jobEnvelopeSchema, type JobEnvelope } from "../../modules/jobs/schemas.js";
import { resolveQuote } from "../../modules/jobs/quote.js";
import { toModelSummary } from "../../modules/catalog/catalog.js";
import type { ApiContext } from "./context.js";

export function quotesRouter(ctx: ApiContext): Router {
  const router = Router();

  router.post(
    "/",
    requireAuth(ctx.auth),
    validateBody(jobEnvelopeSchema),
    async (req, res) => {
      const { user } = getAuthContext(res);
      const envelope = req.body as JobEnvelope;
      const quote = await resolveQuote(ctx.db, envelope);
      const balance = await getBalance(ctx.db, user.id);

      res.json({
        quote: {
          type: envelope.type,
          capability: JOB_TYPE_CAPABILITY[envelope.type],
          model: toModelSummary(quote.model),
          unit: quote.unit,
          units: quote.units,
          credits: quote.credits,
        },
        balance,
      });
    },
  );

  return router;
}
