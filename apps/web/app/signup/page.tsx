"use client";

import Link from "next/link";
import { Lock, Mail, MailCheck, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  GoogleButton,
  PasswordStrength,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { TurnstileWidget } from "@/components/turnstile";
import { authClient } from "@/lib/auth-client";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (sent) {
    return (
      <AuthShell>
        <AuthCard
          title="Check your inbox"
          subtitle={
            <>
              We sent a verification link to{" "}
              <span className="font-medium text-white">{email}</span>.
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
              Open the link to activate your studio, then sign in to start creating.
            </p>
            <p className="mt-1.5 text-[11.5px] leading-[17px] text-white/25">
              In local development the email is printed in the API logs instead of being sent.
            </p>

            <Link
              href="/login"
              className="group relative mt-5 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(180deg,#c3ff3d,#a6f400)] text-[13.5px] font-bold text-[#080c02] shadow-[0_18px_38px_-18px_rgba(170,255,0,0.85)] transition-all duration-200 hover:brightness-105 active:scale-[0.995]"
            >
              Continue to sign in
            </Link>

            <button
              type="button"
              onClick={() => {
                setSent(false);
                setPassword("");
              }}
              className="mt-3 text-[12px] font-medium text-white/35 transition hover:text-white"
            >
              Wrong email? Start over
            </button>
          </div>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthCard
        title="Create your account"
        subtitle={
          <>
            Already have one?{" "}
            <Link
              href="/login"
              className="font-semibold text-lime underline decoration-lime/30 underline-offset-2 transition hover:decoration-lime"
            >
              Sign in
            </Link>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <GoogleButton label="Sign up with Google" onError={setError} />

          <AuthDivider>or use email</AuthDivider>

          <form
            className="flex flex-col gap-3.5"
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError(null);

              const { error: signUpError } = await authClient.signUp.email(
                {
                  name,
                  email,
                  password,
                  callbackURL: `${window.location.origin}/login?verified=1`,
                },
                {
                  headers: captchaToken ? { "x-captcha-response": captchaToken } : {},
                },
              );

              setBusy(false);
              if (signUpError) {
                setError(signUpError.message ?? "Could not create the account");
                return;
              }
              setSent(true);
            }}
          >
            <AuthField
              id="signup-name"
              label="Name"
              icon={UserRound}
              value={name}
              onChange={setName}
              placeholder="How should we call you?"
              autoComplete="name"
            />

            <AuthField
              id="signup-email"
              label="Email"
              type="email"
              icon={Mail}
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />

            <div>
              <AuthField
                id="signup-password"
                label="Password"
                type="password"
                icon={Lock}
                value={password}
                onChange={setPassword}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
              />
              <PasswordStrength password={password} />
            </div>

            {TURNSTILE_SITE_KEY ? (
              <div className="flex justify-center">
                <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />
              </div>
            ) : null}

            {error ? <AuthAlert>{error}</AuthAlert> : null}

            <SubmitButton busy={busy} busyLabel="Creating your studio…">
              Create account
            </SubmitButton>
          </form>

          <p className="flex items-center justify-center gap-1.5 pt-1 text-[11.5px] text-white/25">
            <Sparkles className="h-3.5 w-3.5 text-lime/60" strokeWidth={1.9} />
            No card required
          </p>
        </div>
      </AuthCard>
    </AuthShell>
  );
}
