import { Router } from "express";
import { auditLog } from "../../db/schema/ops.js";
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

  // bull-board inspects the queue objects, so it is skipped in tests (which
  // use lightweight queue stubs) and mounted wherever real BullMQ queues exist.
  if (ctx.env.NODE_ENV !== "test") {
    const board = createQueueBoardRouter(ctx.queues);
    router.use("/queues", ...admin, board);
  }

  return router;
}
