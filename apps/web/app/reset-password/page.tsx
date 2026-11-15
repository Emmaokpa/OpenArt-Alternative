"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p style={{ color: "#8b8b99" }}>Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
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
      <section style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: "1.5rem" }}>Reset link is invalid</h1>
        <p style={{ color: "#b9b9c6" }}>
          <Link href="/forgot-password" style={{ color: "#7cc4ff" }}>
            Request a new link
          </Link>
          .
        </p>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Choose a new password</h1>

      <form
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
        style={{ display: "grid", gap: "0.85rem", marginTop: "1.5rem" }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          New password (8 characters or more)
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
        </label>

        {error ? <p style={{ color: "#ff8b8b", margin: 0 }}>{error}</p> : null}

        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "Saving…" : "Save password"}
        </button>
      </form>
    </section>
  );
}

const inputStyle = {
  background: "#15151c",
  border: "1px solid #2c2c36",
  borderRadius: 6,
  color: "#f5f5f7",
  padding: "0.55rem 0.7rem",
} as const;

const buttonStyle = {
  background: "#3b6cf6",
  border: "none",
  borderRadius: 6,
  color: "#fff",
  padding: "0.65rem 0.9rem",
  cursor: "pointer",
  fontWeight: 600,
} as const;
