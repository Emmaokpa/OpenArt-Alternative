"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";

export function SessionNav() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
        maxWidth: 880,
        margin: "0 auto",
        padding: "1rem 1.25rem",
        borderBottom: "1px solid #23232c",
      }}
    >
      <Link href="/" style={{ color: "#f5f5f7", fontWeight: 600, textDecoration: "none" }}>
        OpenArt
      </Link>
      <Link href="/library" style={{ color: "#b9b9c6", textDecoration: "none" }}>
        Library
      </Link>

      <span style={{ marginLeft: "auto", color: "#8b8b99", fontSize: "0.9rem" }}>
        {isPending
          ? "Checking session…"
          : session
            ? session.user.email
            : null}
      </span>

      {!isPending && !session ? (
        <Link href="/login" style={{ color: "#7cc4ff", textDecoration: "none" }}>
          Sign in
        </Link>
      ) : null}

      {!isPending && session ? (
        <button
          type="button"
          onClick={async () => {
            await authClient.signOut();
            router.push("/login");
            router.refresh();
          }}
          style={{
            background: "transparent",
            border: "1px solid #35353f",
            borderRadius: 6,
            color: "#f5f5f7",
            padding: "0.35rem 0.7rem",
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      ) : null}
    </nav>
  );
}
