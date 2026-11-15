import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { assets } from "../../db/schema/index.js";
import { normalizeMime } from "./limits.js";
import { completeUpload, presignUpload, type AssetDeps } from "./assets.js";
import {
  createQueueStub,
  createTestUser,
  testLogger,
} from "../../test-utils/fixtures.js";
import { openTestDatabase, resetDatabase, testDatabaseAvailable } from "../../test-utils/db.js";
import { createMemoryStorage, type MemoryStorage } from "../../test-utils/storage.js";

const available = await testDatabaseAvailable();
const { pool, db } = openTestDatabase();

afterAll(async () => {
  await pool.end();
});

function deps(storage: MemoryStorage, stub: ReturnType<typeof createQueueStub>): AssetDeps {
  return { db, storage, queues: stub.queues, logger: testLogger };
}

describe.skipIf(!available)("presigned uploads", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("creates a pending asset and a direct upload URL", async () => {
    const userId = await createTestUser(db);
    const storage = createMemoryStorage();
    const stub = createQueueStub();

    const result = await presignUpload(deps(storage, stub), userId, {
      kind: "video",
      mime: "video/mp4",
      sizeBytes: 1_048_576,
      originalName: "holiday.mp4",
    });

    expect(result.uploadUrl).toContain("memory://put/");
    expect(result.expiresInSeconds).toBe(900);

    const [asset] = await db.select().from(assets).where(eq(assets.id, result.assetId));
    expect(asset?.status).toBe("pending");
    expect(asset?.kind).toBe("video");
    expect(asset?.objectKey).toContain(`u/${userId}/uploads/`);
    expect(asset?.originalName).toBe("holiday.mp4");
  });

  it("rejects a file type outside the launch limits", async () => {
    const userId = await createTestUser(db);
    const storage = createMemoryStorage();
    const stub = createQueueStub();

    await expect(
      presignUpload(deps(storage, stub), userId, {
        kind: "video",
        mime: "video/x-msvideo",
        sizeBytes: 1_000,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    expect(await db.select().from(assets)).toHaveLength(0);
  });

  it("completes an upload only when the object exists", async () => {
    const userId = await createTestUser(db);
    const storage = createMemoryStorage();
    const stub = createQueueStub();

    const presigned = await presignUpload(deps(storage, stub), userId, {
      kind: "image",
      mime: "image/png",
      sizeBytes: 2_048,
    });

    await expect(completeUpload(deps(storage, stub), userId, presigned.assetId)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const [pending] = await db.select().from(assets).where(eq(assets.id, presigned.assetId));
    storage.objects.set(pending!.objectKey, {
      body: Buffer.alloc(2_048),
      contentType: "image/png",
    });

    const completed = await completeUpload(deps(storage, stub), userId, presigned.assetId);
    expect(completed.status).toBe("ready");
    expect(completed.sizeBytes).toBe(2_048);
    expect(completed.expiresAt).not.toBeNull();
    expect(stub.probes).toEqual([presigned.assetId]);
  });

  it("normalizes mime case and whitespace", () => {
    expect(normalizeMime(" IMAGE/PNG ")).toBe("image/png");
  });
});
