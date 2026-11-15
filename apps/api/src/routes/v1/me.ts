import { eq } from "drizzle-orm";
import { Router } from "express";
import type { MeView } from "@app/shared";
import { plans, profiles } from "../../db/schema/core.js";
import { ensureCreditAccount, getBalance } from "../../modules/credits/credits.js";
import { getAuthContext, requireAuth } from "../../modules/auth/middleware.js";
import type { ApiContext } from "./context.js";

export function meRouter(ctx: ApiContext): Router {
  const router = Router();

  router.get("/", requireAuth(ctx.auth), async (_req, res) => {
    const { user } = getAuthContext(res);

    let [profile] = await ctx.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1);

    if (!profile) {
      // Users created before Phase 1 have no profile row yet.
      const isAdmin = ctx.env.ADMIN_EMAILS.includes(user.email.toLowerCase());
      [profile] = await ctx.db
        .insert(profiles)
        .values({
          userId: user.id,
          displayName: user.name,
          role: isAdmin ? "admin" : "user",
        })
        .onConflictDoNothing()
        .returning();

      if (!profile) {
        [profile] = await ctx.db
          .select()
          .from(profiles)
          .where(eq(profiles.userId, user.id))
          .limit(1);
      }
    }

    await ensureCreditAccount(ctx.db, user.id);
    const balance = await getBalance(ctx.db, user.id);

    let plan: MeView["plan"] = null;
    if (profile?.planId) {
      const [row] = await ctx.db
        .select({ id: plans.id, name: plans.name, monthlyCredits: plans.monthlyCredits })
        .from(plans)
        .where(eq(plans.id, profile.planId))
        .limit(1);
      plan = row ?? null;
    }

    const payload: MeView = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image ?? null,
      },
      profile: {
        displayName: profile?.displayName ?? null,
        role: (profile?.role as "user" | "admin" | undefined) ?? "user",
        planId: profile?.planId ?? null,
        suspendedAt: profile?.suspendedAt?.toISOString() ?? null,
      },
      balance,
      plan,
    };

    res.json(payload);
  });

  return router;
}
