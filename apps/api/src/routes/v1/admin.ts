import { Router } from "express";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { auditLog } from "../../db/schema/ops.js";
import { jobs, jobSteps, models } from "../../db/schema/core.js";
import { adjustCredits } from "../../modules/credits/credits.js";
import { getAuthContext, requireAdmin } from "../../modules/auth/middleware.js";
import { adminCreditSchema } from "../../modules/jobs/schemas.js";
import { validateBody } from "../../http/validate.js";
import { createQueueBoardRouter } from "../../queue/bull-board.js";
import type { ApiContext } from "./context.js";

export function adminRouter(ctx: ApiContext): Router {
  const router = Router();
  const admin = requireAdmin(ctx.db, ctx.auth);

  router.post("/credits", ...admin, validateBody(adminCreditSchema), async (req, res) => {
    const actor = getAuthContext(res).user;
    const { userId, delta, note } = req.body as {
      userId: string;
      delta: number;
      note: string;
    };

    const balance = await ctx.db.transaction(async (tx) => {
      const next = await adjustCredits(tx, { userId, delta, note });

      await tx.insert(auditLog).values({
        actorId: actor.id,
        action: "credits.adjust",
        target: userId,
        detail: { delta, note, balance: next },
      });

      return next;
    });

    res.json({ userId, balance });
  });

  // Margin report: credits charged vs provider cost per model.
  router.get(
    "/margin-report",
    ...admin,
    async (_req, res) => {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const rows = await ctx.db
        .select({
          modelId: jobs.modelId,
          modelLabel: models.label,
          capability: models.capability,
          provider: models.provider,
          jobsCount: sql<number>`count(*)::int`,
          creditsCharged: sql<number>`coalesce(sum(${jobs.creditCost}), 0)`,
          providerCostUsdMicros: sql<number>`coalesce(sum(${jobSteps.costUsdMicros}), 0)`,
        })
        .from(jobs)
        .leftJoin(models, eq(models.id, jobs.modelId))
        .leftJoin(jobSteps, and(eq(jobSteps.jobId, jobs.id), eq(jobSteps.status, "succeeded")))
        .where(
          and(
            eq(jobs.status, "succeeded"),
            isNotNull(jobs.modelId),
            gte(jobs.createdAt, today),
          ),
        )
        .groupBy(jobs.modelId, models.label, models.capability, models.provider)
        .orderBy(sql`credits_charged DESC`);

      const report = rows.map((row) => {
        const creditsCharged = Number(row.creditsCharged ?? 0);
        const providerCostUsd = Number(row.providerCostUsdMicros ?? 0) / 1_000_000;
        const marginUsd = creditsCharged * 0.008 - providerCostUsd; // $0.008 per credit
        const marginPercent =
          creditsCharged > 0
            ? ((marginUsd / (creditsCharged * 0.008)) * 100).toFixed(1)
            : "0.0";

        return {
          modelId: row.modelId,
          modelLabel: row.modelLabel,
          capability: row.capability,
          provider: row.provider,
          jobsCount: Number(row.jobsCount),
          creditsCharged,
          providerCostUsdMicros: Number(row.providerCostUsdMicros ?? 0),
          providerCostUsd: providerCostUsd,
          marginUsd,
          marginPercent,
        };
      });

      res.json({ report, generatedAt: new Date().toISOString() });
    },
  );

  // bull-board inspects the queue objects, so it is skipped in tests (which
  // use lightweight queue stubs) and mounted wherever real BullMQ queues exist.
  if (ctx.env.NODE_ENV !== "test") {
    const board = createQueueBoardRouter(ctx.queues);
    router.use("/queues", ...admin, board);
  }

  return router;
}
