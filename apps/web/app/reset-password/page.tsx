"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Lock } from "lucide-react";
import { Suspense, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  PasswordStrength,
  SubmitButton,
} from "@/components/auth/AuthForm";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="h-[420px] animate-pulse rounded-[24px] border border-white/[0.06] bg-white/[0.02]" />
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <AuthCard
        title="This link looks broken"
        subtitle="Reset links expire after an hour. Request a fresh one and try again."
      >
        <div className="flex flex-col items-center pt-1 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.03]">
            <KeyRound className="h-7 w-7 text-white/40" strokeWidth={1.7} />
          </div>
          <Link
            href="/forgot-password"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-xl bg-[linear-gradient(180deg,#c3ff3d,#a6f400)] text-[13.5px] font-bold text-[#080c02] shadow-[0_18px_38px_-18px_rgba(170,255,0,0.85)] transition hover:brightness-105"
          >
            Request a new link
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Pick something long and unique — this replaces your old password everywhere."
    >
      <form
        className="flex flex-col gap-3.5"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError(null);

          const { error: resetError } = await authClient.resetPassword({
            newPassword: password,
            token,
          });

          setBusy(false);
          if (resetError) {
            setError(resetError.message ?? "Could not reset the password");
            return;
          }
          router.push("/login");
        }}
      >
        <div>
          <AuthField
            id="new-password"
            label="New password"
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

        {error ? <AuthAlert>{error}</AuthAlert> : null}

        <SubmitButton busy={busy} busyLabel="Saving password…">
          Save password
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
