import { badRequest } from "../../lib/errors.js";

export type UploadKind = "video" | "image" | "audio";

export interface UploadLimit {
  maxBytes: number;
  maxDurationS: number | null;
  mimes: readonly string[];
}

/** Launch limits from `05-storage-and-cloudflare.md`. Raise only with evidence. */
export const UPLOAD_LIMITS: Record<UploadKind, UploadLimit> = {
  video: {
    maxBytes: 500 * 1024 * 1024,
    maxDurationS: 5 * 60,
    mimes: ["video/mp4", "video/quicktime", "video/webm"],
  },
  image: {
    maxBytes: 20 * 1024 * 1024,
    maxDurationS: null,
    mimes: ["image/jpeg", "image/png", "image/webp"],
  },
  audio: {
    maxBytes: 50 * 1024 * 1024,
    maxDurationS: 10 * 60,
    mimes: ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"],
  },
};

export function normalizeMime(mime: string): string {
  return mime.trim().toLowerCase();
}

export function validateUploadRequest(input: {
  kind: UploadKind;
  mime: string;
  sizeBytes: number;
}): void {
  const limit = UPLOAD_LIMITS[input.kind];
  if (!limit) throw badRequest("Unknown upload kind");

  const mime = normalizeMime(input.mime);
  if (!limit.mimes.includes(mime)) {
    throw badRequest(`Unsupported file type for ${input.kind}`, {
      allowed: limit.mimes,
    });
  }

  if (input.sizeBytes <= 0) throw badRequest("The file is empty");
  if (input.sizeBytes > limit.maxBytes) {
    throw badRequest(`The file is too large (limit ${Math.round(limit.maxBytes / 1024 / 1024)} MB)`);
  }
}

export function validateUploadedObject(input: {
  kind: UploadKind;
  sizeBytes: number | undefined;
  durationMs?: number | null;
}): void {
  const limit = UPLOAD_LIMITS[input.kind];
  if (!limit) throw badRequest("Unknown upload kind");

  if (input.sizeBytes !== undefined && input.sizeBytes > limit.maxBytes) {
    throw badRequest(`The file is too large (limit ${Math.round(limit.maxBytes / 1024 / 1024)} MB)`);
  }

  if (
    input.durationMs !== undefined &&
    input.durationMs !== null &&
    limit.maxDurationS !== null &&
    input.durationMs > limit.maxDurationS * 1_000
  ) {
    throw badRequest(`The file is longer than ${Math.round(limit.maxDurationS / 60)} minutes`);
  }
}
