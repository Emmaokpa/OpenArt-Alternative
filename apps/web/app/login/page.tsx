"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { TurnstileWidget } from "../../components/turnstile";
import { authClient } from "../../lib/auth-client";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section style={{ maxWidth: 420 }}>
      <h1 style={{ fontSize: "1.5rem" }}>Sign in</h1>
      <p style={{ color: "#b9b9c6", lineHeight: 1.6 }}>
        New here? <Link href="/signup" style={{ color: "#7cc4ff" }}>Create an account</Link>.
      </p>

      <form
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

        <label style={{ display: "grid", gap: "0.35rem" }}>
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
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
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: "1.25rem" }}>
        <Link href="/forgot-password" style={{ color: "#7cc4ff" }}>
          Forgot your password?
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
