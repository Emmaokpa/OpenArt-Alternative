"use client";

import { createAuthClient } from "better-auth/react";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { API_URL } from "@/lib/api";

const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include",
  },
});

const AuthContext = createContext<{
  user: { id: string; name: string; email: string; emailVerified: boolean; image?: string | null } | null;
  session: { id: string; userId: string; expiresAt: Date } | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {  const [user, setUser] = useState<{ id: string; name: string; email: string; emailVerified: boolean; image?: string | null } | null>(null);
  const [session, setSession] = useState<{ id: string; userId: string; expiresAt: Date } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await authClient.getSession();
      if (data && data.data) {
        const { user: u, session: s } = data.data;
        setUser({
          id: u.id,
          name: u.name,
          email: u.email,
          emailVerified: u.emailVerified,
          image: u.image ?? null,
        });
        setSession({
          id: s.id,
          userId: s.userId,
          expiresAt: s.expiresAt,
        });
      } else {
        setUser(null);
        setSession(null);
      }
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // Ignore errors
    }
    setUser(null);
    setSession(null);
    window.location.href = "/login";
  }, []);

  const value = {
    user,
    session,
    isLoading,
    signOut,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

export { authClient };
