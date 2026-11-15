import type { Env } from "../env.js";
import type { Logger } from "../logger.js";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(email: OutgoingEmail): Promise<void>;
}

/**
 * Resend over plain HTTP, so no extra SDK is needed. Without a key (local
 * development, tests) the message is logged instead — never in production,
 * where `loadEnv` requires RESEND_API_KEY.
 */
export function createMailer(env: Pick<Env, "RESEND_API_KEY" | "EMAIL_FROM">, logger: Logger): Mailer {
  return {
    async send({ to, subject, text }) {
      if (!env.RESEND_API_KEY) {
        logger.info({ to, subject, text }, "email (development fallback, not sent)");
        return;
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text }),
      });

      if (!response.ok) {
        // Never log the response body: it can echo the recipient address.
        logger.error({ status: response.status, subject }, "resend rejected an email");
        throw new Error("Could not send email");
      }
    },
  };
}
