import { randomUUID } from "node:crypto";
import { and, eq, ne } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { assets } from "../../db/schema/core.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { uploadKey } from "../../lib/object-keys.js";
import type { Logger } from "../../logger.js";
import type { Storage } from "../../lib/storage.js";
import { enqueueAssetProbe, type Queues } from "../../queue/queues.js";
import { isUuid } from "../jobs/service.js";
import {
  normalizeMime,
  validateUploadedObject,
  validateUploadRequest,
  type UploadKind,
} from "./limits.js";

const PRESIGN_EXPIRES_S = 15 * 60;
const INPUT_RETENTION_MS = 7 * 24 * 60 * 60_000;

export interface AssetDeps {
  db: Db;
  storage: Storage;
  queues: Pick<Queues, "mediaJobs">;
  logger: Logger;
}

export interface PresignResult {
  assetId: string;
  uploadUrl: string;
  expiresInSeconds: number;
}

/**
 * Creates a pending asset row and a direct-to-R2 PUT URL. The browser never
 * sends the file through the API, so the 8 GB VPS never buffers an upload.
 */
export async function presignUpload(
  deps: AssetDeps,
  userId: string,
  input: {
    kind: UploadKind;
    mime: string;
    sizeBytes: number;
    originalName?: string;
  },
): Promise<PresignResult> {
  validateUploadRequest(input);

  const assetId = randomUUID();
  const mime = normalizeMime(input.mime);
  const key = uploadKey({ userId, assetId, mime });

  await deps.db.insert(assets).values({
    id: assetId,
    userId,
    role: "input",
    kind: input.kind,
    bucket: deps.storage.privateBucket,
    objectKey: key,
    mime,
    originalName: input.originalName?.trim() || null,
    sizeBytes: input.sizeBytes,
    status: "pending",
  });

  const uploadUrl = await deps.storage.presignPut({
    key,
    contentType: mime,
    expiresInSeconds: PRESIGN_EXPIRES_S,
  });

  return { assetId, uploadUrl, expiresInSeconds: PRESIGN_EXPIRES_S };
}

/**
 * Confirms an upload. The object is checked with HEAD, size is enforced
 * server-side, and a media job probes duration/dimensions when ffprobe is
 * available.
 */
export async function completeUpload(
  deps: AssetDeps,
  userId: string,
  assetId: string,
) {
  if (!isUuid(assetId)) throw notFound("Upload not found");

  const [asset] = await deps.db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId), ne(assets.status, "deleted")))
    .limit(1);

  if (!asset) throw notFound("Upload not found");
  if (asset.status === "ready") return asset;

  const stored = await deps.storage.head(asset.objectKey);
  if (!stored) throw badRequest("The upload was not found in storage; try again");

  try {
    validateUploadedObject({
      kind: asset.kind as UploadKind,
      sizeBytes: stored.contentLength ?? asset.sizeBytes ?? undefined,
    });
  } catch (error) {
    await deps.storage.delete(asset.objectKey).catch(() => undefined);
    await deps.db.update(assets).set({ status: "deleted" }).where(eq(assets.id, asset.id));
    throw error;
  }

  const [updated] = await deps.db
    .update(assets)
    .set({
      status: "ready",
      sizeBytes: stored.contentLength ?? asset.sizeBytes,
      mime: asset.mime ?? stored.contentType ?? null,
      expiresAt: new Date(Date.now() + INPUT_RETENTION_MS),
    })
    .where(eq(assets.id, asset.id))
    .returning();

  if (!updated) throw badRequest("Could not complete the upload");

  try {
    await enqueueAssetProbe(deps.queues, updated.id);
  } catch (error) {
    // Validation is an enhancement; the file is already usable without it.
    deps.logger.warn({ err: error, assetId: updated.id }, "could not enqueue asset probe");
  }

  return updated;
}

export async function getAssetForUser(db: Db, userId: string, assetId: string) {
  if (!isUuid(assetId)) throw notFound("Asset not found");

  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.userId, userId), ne(assets.status, "deleted")))
    .limit(1);

  if (!asset) throw notFound("Asset not found");
  return asset;
}

/** Validates a probed input and removes it if it breaks a launch limit. */
export async function applyProbeResult(
  deps: AssetDeps,
  assetId: string,
  probe: { durationMs?: number; width?: number; height?: number } | null,
): Promise<void> {
  const [asset] = await deps.db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset || asset.status !== "ready" || !probe) return;

  try {
    validateUploadedObject({
      kind: asset.kind as UploadKind,
      sizeBytes: asset.sizeBytes ?? undefined,
      durationMs: probe.durationMs ?? null,
    });
  } catch (error) {
    await deps.storage.delete(asset.objectKey).catch(() => undefined);
    await deps.db.update(assets).set({ status: "deleted" }).where(eq(assets.id, asset.id));
    deps.logger.warn({ err: error, assetId }, "removed an upload that broke a launch limit");
    return;
  }

  await deps.db
    .update(assets)
    .set({
      durationMs: probe.durationMs ?? null,
      width: probe.width ?? null,
      height: probe.height ?? null,
    })
    .where(eq(assets.id, asset.id));
}
