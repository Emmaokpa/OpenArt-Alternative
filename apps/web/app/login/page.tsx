"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthAlert,
  AuthCard,
  AuthDivider,
  AuthField,
  GoogleButton,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { TurnstileWidget } from "@/components/turnstile";
import { authClient } from "@/lib/auth-client";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<AuthCardSkeleton />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}

function AuthCardSkeleton() {
  return (
    <div className="h-[520px] animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.02]" />
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified") === "1";
  const providerError = params.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    providerError ? "That sign-in didn’t complete. Please try again." : null,
  );
  const [busy, setBusy] = useState(false);

  return (
    <AuthCard
      title="Welcome back"
      subtitle={
        <>
          New to OpenArt?{" "}
          <Link
            href="/signup"
            className="font-semibold text-lime underline decoration-lime/30 underline-offset-2 transition hover:decoration-lime"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {verified && (
          <AuthAlert tone="success">Email verified — sign in to open your studio.</AuthAlert>
        )}

        <GoogleButton onError={setError} />

        <AuthDivider>or use email</AuthDivider>

        <form
          className="flex flex-col gap-3.5"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);

            const { error: signInError } = await authClient.signIn.email(
              { email, password },
              {
                headers: captchaToken ? { "x-captcha-response": captchaToken } : {},
              },
            );

            setBusy(false);
            if (signInError) {
              setError(signInError.message ?? "Could not sign in");
              return;
            }
            router.push("/");
            router.refresh();
          }}
        >
          <AuthField
            id="login-email"
            label="Email"
            type="email"
            icon={Mail}
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            autoComplete="email"
          />

          <AuthField
            id="login-password"
            label="Password"
            type="password"
            icon={Lock}
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            autoComplete="current-password"
            action={
              <Link
                href="/forgot-password"
                className="text-[12px] font-medium text-[rgba(214,225,255,0.45)] transition hover:text-lime"
              >
                Forgot password?
              </Link>
            }
          />

          {TURNSTILE_SITE_KEY ? (
            <div className="flex justify-center">
              <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />
            </div>
          ) : null}

          {error ? <AuthAlert>{error}</AuthAlert> : null}

          <SubmitButton busy={busy} busyLabel="Signing in…">
            Sign in
          </SubmitButton>
        </form>

        <p className="flex items-center justify-center gap-1.5 pt-1 text-[11.5px] text-white/25">
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
          Secured with encrypted sessions
        </p>
      </div>
    </AuthCard>
  );
}
