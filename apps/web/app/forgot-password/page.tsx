"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Reset your password</h1>

      {sent ? (
        <p style={{ color: "#b9b9c6", lineHeight: 1.6 }}>
          If <strong>{email}</strong> has an account, a reset link is on its way. Check the API
          logs in local development.
        </p>
      ) : (
        <>
          <p style={{ color: "#b9b9c6", lineHeight: 1.6 }}>
            Enter your email and we will send a reset link.
          </p>
          <form
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
            style={{ display: "grid", gap: "0.85rem", marginTop: "1.5rem" }}
          >
            <label style={{ display: "grid", gap: "0.35rem" }}>
              Email
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={inputStyle}
              />
            </label>

            {error ? <p style={{ color: "#ff8b8b", margin: 0 }}>{error}</p> : null}

            <button type="submit" disabled={busy} style={buttonStyle}>
              {busy ? "Sending…" : "Send reset link"}
            </button>
          </form>
        </>
      )}

      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/login" style={{ color: "#7cc4ff" }}>
          Back to sign in
        </Link>
      </p>
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
