"use client";

import Link from "next/link";
import { useState } from "react";
import { TurnstileWidget } from "../../components/turnstile";
import { authClient } from "../../lib/auth-client";

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
      <section style={{ maxWidth: 460 }}>
        <h1 style={{ fontSize: "1.5rem" }}>Check your email</h1>
        <p style={{ color: "#b9b9c6", lineHeight: 1.6 }}>
          We sent a verification link to <strong>{email}</strong>. Open it, then{" "}
          <Link href="/login" style={{ color: "#7cc4ff" }}>
            sign in
          </Link>
          .
        </p>
        <p style={{ color: "#8b8b99", lineHeight: 1.6 }}>
          In local development the email is printed in the API logs instead of being sent.
        </p>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Create an account</h1>
      <p style={{ color: "#b9b9c6", lineHeight: 1.6 }}>
        Already registered? <Link href="/login" style={{ color: "#7cc4ff" }}>Sign in</Link>.
      </p>

      <form
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
        style={{ display: "grid", gap: "0.85rem", marginTop: "1.5rem" }}
      >
        <label style={{ display: "grid", gap: "0.35rem" }}>
          Name
          <input
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={inputStyle}
          />
        </label>

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

        <label style={{ display: "grid", gap: "0.35rem" }}>
          Password (8 characters or more)
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

        {TURNSTILE_SITE_KEY ? (
          <TurnstileWidget siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} />
        ) : null}

        {error ? <p style={{ color: "#ff8b8b", margin: 0 }}>{error}</p> : null}

        <button type="submit" disabled={busy} style={buttonStyle}>
          {busy ? "Creating…" : "Create account"}
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
