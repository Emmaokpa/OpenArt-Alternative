import { eq } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import type { Db } from "../../db/client.js";
import { profiles } from "../../db/schema/core.js";
import { forbidden, unauthorized } from "../../lib/errors.js";
import type { Auth } from "./auth.js";

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
  };
  session: { id: string; userId: string; expiresAt: Date };
}

export function getAuthContext(res: Response): AuthContext {
  const context = res.locals.auth as AuthContext | undefined;
  if (!context) throw unauthorized();
  return context;
}

/** Resolves the Better Auth session from the request cookies/headers. */
export function requireAuth(auth: Auth): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });

      if (!result) {
        next(unauthorized());
        return;
      }

      res.locals.auth = {
        user: result.user,
        session: result.session,
      } satisfies AuthContext;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Requires an authenticated user whose profile role is `admin`. */
export function requireAdmin(db: Db, auth: Auth): RequestHandler[] {
  const authenticate = requireAuth(auth);

  const checkRole = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = getAuthContext(res);
      const [profile] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .limit(1);

      if (profile?.role !== "admin") {
        next(forbidden("Admin access required"));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };

  return [authenticate, checkRole];
}
