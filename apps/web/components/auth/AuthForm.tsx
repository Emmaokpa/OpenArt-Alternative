"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { authClient } from "@/lib/auth-client";

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-[24px] border border-white/[0.075] bg-[linear-gradient(180deg,rgba(23,25,26,0.92)_0%,rgba(11,12,13,0.97)_100%)] p-5 shadow-[0_50px_100px_-50px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl sm:p-7">
      {/* lime hairline along the top edge */}
      <span
        aria-hidden="true"
        className="absolute inset-x-12 top-0 h-px bg-[linear-gradient(to_right,transparent,rgba(170,255,0,0.65),transparent)]"
      />
      {/* quiet bloom behind the heading */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-44 w-64 -translate-x-1/2 rounded-full bg-lime/[0.06] blur-3xl"
      />

      <div className="relative">
        <h1 className="font-display text-[24px] font-bold leading-[30px] tracking-[-0.7px] text-white sm:text-[26px] sm:leading-[32px]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-[13px] leading-[20px] text-[rgba(214,225,255,0.5)]">
            {subtitle}
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Divider                                                            */
/* ------------------------------------------------------------------ */

export function AuthDivider({ children }: { children: ReactNode }) {
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-[linear-gradient(to_right,transparent,rgba(255,255,255,0.1))]" />
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.1em] text-white/30">
        {children}
      </span>
      <span className="h-px flex-1 bg-[linear-gradient(to_left,transparent,rgba(255,255,255,0.1))]" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Google                                                             */
/* ------------------------------------------------------------------ */

function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a11.99 11.99 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function friendlyAuthError(message?: string) {
  const text = (message ?? "").toLowerCase();
  if (
    text.includes("provider") ||
    text.includes("not found") ||
    text.includes("404") ||
    text.includes("config")
  ) {
    return "Google sign-in isn’t enabled on this server yet — use your email and password below.";
  }
  if (
    text.includes("fetch") ||
    text.includes("network") ||
    text.includes("connection") ||
    text.includes("load failed")
  ) {
    return "Can’t reach the auth server. Check that the API is running.";
  }
  return message?.trim() || "Google sign-in failed. Please try again.";
}

export function GoogleButton({
  label = "Continue with Google",
  onError,
}: {
  label?: string;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/`,
      });
      if (result?.error) {
        setBusy(false);
        onError?.(friendlyAuthError(result.error.message));
      }
    } catch (caught) {
      setBusy(false);
      onError?.(friendlyAuthError(caught instanceof Error ? caught.message : undefined));
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="group relative flex h-11 w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.015))] text-[13.5px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-white/[0.16] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.085),rgba(255,255,255,0.03))] active:scale-[0.995] disabled:cursor-progress disabled:opacity-70"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.1)_50%,transparent_62%)] transition-transform duration-[900ms] ease-out group-hover:translate-x-full"
      />
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin text-white/70" strokeWidth={2} />
      ) : (
        <GoogleGlyph className="h-[17px] w-[17px]" />
      )}
      <span className="relative">{busy ? "Opening Google…" : label}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Field                                                              */
/* ------------------------------------------------------------------ */

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  icon: Icon,
  action,
  required = true,
  minLength,
}: {
  id: string;
  label: string;
  type?: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  required?: boolean;
  minLength?: number;
}) {
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && revealed ? "text" : type;

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-[12.5px] font-medium text-[rgba(214,225,255,0.6)]">
          {label}
        </label>
        {action}
      </div>

      <div className="group relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25 transition-colors duration-200 group-focus-within:text-lime/80"
            strokeWidth={1.9}
          />
        )}
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          data-auth-input
          className={cn(
            "h-11 w-full rounded-xl border border-white/[0.085] bg-[#090a0b]/80 text-[13.5px] text-white outline-none",
            "placeholder:text-[13px] placeholder:text-white/25",
            "transition-[border-color,box-shadow,background-color] duration-200",
            "hover:border-white/[0.15]",
            "focus:border-lime/45 focus:bg-[#0b0d0c] focus:shadow-[0_0_0_3px_rgba(170,255,0,0.09)]",
            Icon ? "pl-10" : "pl-3.5",
            isPassword ? "pr-11" : "pr-3.5",
          )}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/30 transition-colors duration-200 hover:bg-white/[0.06] hover:text-white/80"
          >
            {revealed ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.9} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.9} />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Password strength                                                  */
/* ------------------------------------------------------------------ */

const STRENGTH = [
  { label: "Too short", bar: "bg-red-500/80", text: "text-red-300/80" },
  { label: "Weak", bar: "bg-red-500/80", text: "text-red-300/80" },
  { label: "Fair", bar: "bg-amber-400/90", text: "text-amber-200/80" },
  { label: "Good", bar: "bg-lime/70", text: "text-lime/70" },
  { label: "Strong", bar: "bg-lime", text: "text-lime" },
];

const WEAKEST = { label: "Too short", bar: "bg-red-500/80", text: "text-red-300/80" };

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = password.length < 8 ? 0 : Math.max(1, checks.filter(Boolean).length);
  const level = STRENGTH[score] ?? WEAKEST;

  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div className="flex flex-1 items-center gap-1">
        {checks.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-300",
              i < score ? level.bar : "bg-white/[0.09]",
            )}
          />
        ))}
      </div>
      <span className={cn("w-[52px] shrink-0 text-right text-[10.5px] font-semibold", level.text)}>
        {level.label}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Alert + submit                                                     */
/* ------------------------------------------------------------------ */

export function AuthAlert({
  children,
  tone = "error",
}: {
  children: ReactNode;
  tone?: "error" | "success";
}) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "animate-fade-up flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12.5px] leading-[18px]",
        isError
          ? "border-red-500/25 bg-red-500/[0.07] text-red-200"
          : "border-lime/25 bg-lime/[0.06] text-[#d8ff9a]",
      )}
    >
      {isError ? (
        <AlertCircle className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
      ) : (
        <CheckCircle2 className="mt-px h-4 w-4 shrink-0" strokeWidth={2} />
      )}
      <span className="min-w-0">{children}</span>
    </div>
  );
}

export function SubmitButton({
  busy,
  busyLabel,
  children,
}: {
  busy: boolean;
  busyLabel: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group relative mt-1 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[linear-gradient(180deg,#c3ff3d,#a6f400)] text-[13.5px] font-bold text-[#080c02] shadow-[0_18px_38px_-18px_rgba(170,255,0,0.85),inset_0_1px_0_rgba(255,255,255,0.5)] transition-all duration-200 hover:brightness-105 active:scale-[0.995] disabled:cursor-progress disabled:opacity-65"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.45)_50%,transparent_62%)] transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative flex items-center gap-2">
        {busy && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.4} />}
        {busy ? busyLabel : children}
        {!busy && (
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            strokeWidth={2.6}
          />
        )}
      </span>
    </button>
  );
}
