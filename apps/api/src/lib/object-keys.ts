import type { AssetKind } from "@app/shared";

const MIME_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "text/plain": "txt",
  "text/vtt": "vtt",
  "application/json": "json",
};

export function extensionForMime(mime: string): string {
  return MIME_EXTENSIONS[mime.toLowerCase()] ?? "bin";
}

export function mimeForKind(kind: AssetKind): string {
  switch (kind) {
    case "video":
      return "video/mp4";
    case "image":
      return "image/png";
    case "audio":
      return "audio/wav";
    case "text":
      return "text/vtt";
  }
}

export function uploadKey(input: { userId: string; assetId: string; mime: string }): string {
  return `u/${input.userId}/uploads/${input.assetId}.${extensionForMime(input.mime)}`;
}

export function outputKey(input: {
  userId: string;
  jobId: string;
  assetId: string;
  folder: "output" | "thumb" | "captions";
  extension: string;
}): string {
  return `u/${input.userId}/jobs/${input.jobId}/${input.folder}/${input.assetId}.${input.extension}`;
}
