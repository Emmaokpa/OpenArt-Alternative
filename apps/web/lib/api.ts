export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

/**
 * Calls the Express API with cookies. Every request is same-site in
 * development but cross-site in production, so credentials must be explicit.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 204) return undefined as T;

  const payload = (await response.json().catch(() => null)) as
    | { error?: ApiErrorPayload }
    | T
    | null;

  if (!response.ok) {
    const error = (payload as { error?: ApiErrorPayload } | null)?.error;
    throw new ApiError(
      response.status,
      error ?? { code: "INTERNAL", message: `Request failed (${response.status})` },
    );
  }

  return payload as T;
}

export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} credit${credits === 1 ? "" : "s"}`;
}
