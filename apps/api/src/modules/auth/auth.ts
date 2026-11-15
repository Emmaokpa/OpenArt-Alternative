import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { captcha } from "better-auth/plugins";
import type { Env } from "../../env.js";
import type { Db } from "../../db/client.js";
import { account, session, user, verification } from "../../db/schema/auth.js";
import { profiles } from "../../db/schema/core.js";
import { grantCredits, ensureCreditAccount } from "../credits/credits.js";
import type { Logger } from "../../logger.js";
import type { Mailer } from "../../lib/mailer.js";

export type Auth = ReturnType<typeof createAuth>;

export interface AuthDependencies {
  env: Env;
  db: Db;
  logger: Logger;
  mailer: Mailer;
}

/**
 * Better Auth owns the `user`/`session`/`account`/`verification` rows. On
 * signup we create the application-owned `profiles` and `credit_accounts`
 * rows in the same database hook, so every user is immediately usable.
 */
export function createAuth({ env, db, logger, mailer }: AuthDependencies) {
  const plugins = env.TURNSTILE_SECRET_KEY
    ? [
        captcha({
          provider: "cloudflare-turnstile",
          secretKey: env.TURNSTILE_SECRET_KEY,
        }),
      ]
    : [];

  const socialProviders =
    env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {};

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: env.CORS_ORIGINS,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user: resetUser, url }) => {
        await mailer.send({
          to: resetUser.email,
          subject: "Reset your password",
          text: `Reset your password: ${url}\n\nIf you did not ask for this, ignore the email.`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user: newUser, url }) => {
        await mailer.send({
          to: newUser.email,
          subject: "Verify your email address",
          text: `Verify your email address: ${url}`,
        });
      },
    },
    socialProviders,
    plugins,
    advanced: {
      // The web app and the API are different origins in production
      // (workers.dev / custom domain and api.domain.com).
      defaultCookieAttributes: {
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        secure: env.NODE_ENV === "production",
        httpOnly: true,
      },
    },
    rateLimit: {
      enabled: env.NODE_ENV !== "test",
      window: 60,
      max: 10,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (createdUser) => {
            const isAdmin = env.ADMIN_EMAILS.includes(createdUser.email.toLowerCase());

            await db
              .insert(profiles)
              .values({
                userId: createdUser.id,
                displayName: createdUser.name,
                role: isAdmin ? "admin" : "user",
              })
              .onConflictDoNothing();

            await ensureCreditAccount(db, createdUser.id);

            if (env.SIGNUP_GRANT_CREDITS > 0) {
              try {
                await grantCredits(db, {
                  userId: createdUser.id,
                  amount: env.SIGNUP_GRANT_CREDITS,
                  type: "grant_trial",
                  idempotencyKey: `signup:${createdUser.id}`,
                  note: "Development signup grant",
                });
              } catch (error) {
                // A failed welcome grant must not undo a successful signup.
                logger.error({ err: error, userId: createdUser.id }, "signup grant failed");
              }
            }
          },
        },
      },
    },
  });
}
