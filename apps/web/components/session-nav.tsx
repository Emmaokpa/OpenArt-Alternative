"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

export function SessionNav() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  if (isLoading) return null;

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
        {user ? user.email : null}
      </span>

      {!user ? (
        <Link href="/login" style={{ color: "#7cc4ff", textDecoration: "none" }}>
          Sign in
        </Link>
      ) : (
        <button
          type="button"
          onClick={async () => {
            await signOut();
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
      )}
    </nav>
  );
}
