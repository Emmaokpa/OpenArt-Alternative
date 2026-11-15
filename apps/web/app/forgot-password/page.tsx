"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell>
      {sent ? (
        <AuthCard
          title="Check your inbox"
          subtitle={
            <>
              If <span className="font-medium text-white">{email}</span> has an account, a reset
              link is on its way.
            </>
          }
        >
          <div className="flex flex-col items-center pt-1 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-lime/25 bg-lime/[0.07]">
              <span
                aria-hidden="true"
                className="animate-halo absolute inset-0 rounded-2xl bg-lime/20 blur-xl"
              />
              <MailCheck className="relative h-7 w-7 text-lime" strokeWidth={1.8} />
            </div>
            <p className="mt-4 text-[13.5px] leading-[21px] text-[rgba(214,225,255,0.6)]">
              The link expires in one hour. Check the API logs when running locally.
            </p>
            <Link
              href="/login"
              className="mt-5 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] text-[13.5px] font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Back to sign in
            </Link>
          </div>
        </AuthCard>
      ) : (
        <AuthCard
          title="Reset your password"
          subtitle="Enter the email tied to your studio and we'll send a secure link."
        >
          <form
            className="flex flex-col gap-3.5"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError(null);

              const { error: resetError } = await authClient.requestPasswordReset({
                email,
                redirectTo: `${window.location.origin}/reset-password`,
              });

              setBusy(false);
              if (resetError) {
                setError(resetError.message ?? "Could not send the reset email");
                return;
              }
              setSent(true);
            }}
          >
            <AuthField
              id="reset-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />

            {error ? <AuthAlert>{error}</AuthAlert> : null}

            <SubmitButton busy={busy} busyLabel="Sending link…">
              Send reset link
            </SubmitButton>
          </form>

          <Link
            href="/login"
            className="group mt-4 flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-white/40 transition hover:text-white"
          >
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5"
              strokeWidth={2.2}
            />
            Back to sign in
          </Link>
        </AuthCard>
      )}
    </AuthShell>
  );
}
