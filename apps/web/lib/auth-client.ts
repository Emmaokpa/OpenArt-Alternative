"use client";

import { createAuthClient } from "better-auth/react";
import { API_URL } from "./api";

/**
 * Better Auth mounts at `/api/auth` on the API origin, so the base URL is the
 * API origin rather than the web origin. Cookies are shared because both use
 * `credentials: "include"` (and cross-site cookies are enabled server-side).
 */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    credentials: "include",
  },
});
