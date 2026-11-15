import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { jobs } from "../../db/schema/index.js";
import { isAppError } from "../../lib/errors.js";
import { createTestModel, createTestUser, createQueueStub, testLogger } from "../../test-utils/fixtures.js";
import { openTestDatabase, resetDatabase, testDatabaseAvailable } from "../../test-utils/db.js";
import { ensureCreditAccount, getBalance, grantCredits } from "../credits/credits.js";
import { createJob } from "./service.js";

const available = await testDatabaseAvailable();
const { pool, db } = openTestDatabase();

afterAll(async () => {
  await pool.end();
});

async function userWithCredits(amount = 1_000): Promise<string> {
  const userId = await createTestUser(db);
  await ensureCreditAccount(db, userId);
  await grantCredits(db, {
    userId,
    amount,
    type: "grant_trial",
    idempotencyKey: `test:${userId}`,
  });
  return userId;
}

describe.skipIf(!available)("createJob", () => {
  let modelId: string;

  beforeEach(async () => {
    await resetDatabase(db);
    modelId = await createTestModel(db, {
      id: "test-video",
      capability: "text_to_video",
      unit: "second",
      creditsPerUnit: "10",
    });
  });

  it("quotes, charges and enqueues exactly once", async () => {
    const userId = await userWithCredits();
    const stub = createQueueStub();

    const result = await createJob(db, stub.queues, testLogger, {
      userId,
      idempotencyKey: "request-1",
      envelope: {
        type: "text_to_video",
        modelId,
        templateId: undefined,
        params: { prompt: "a cat surfing", durationS: 5 },
      },
    });

    expect(result.created).toBe(true);
    expect(result.job.creditCost).toBe(50);
    expect(await getBalance(db, userId)).toBe(950);
    expect(stub.runs).toEqual([{ jobId: result.job.id }]);
  });

  it("returns the original job for a replayed idempotency key without charging again", async () => {
    const userId = await userWithCredits();
    const stub = createQueueStub();
    const input = {
      userId,
      idempotencyKey: "request-1",
      envelope: {
        type: "text_to_video" as const,
        modelId,
        templateId: undefined,
        params: { prompt: "a cat surfing", durationS: 5 },
      },
    };

    const first = await createJob(db, stub.queues, testLogger, input);
    const replay = await createJob(db, stub.queues, testLogger, input);

    expect(first.created).toBe(true);
    expect(replay.created).toBe(false);
    expect(replay.job.id).toBe(first.job.id);
    expect(await getBalance(db, userId)).toBe(950);
    expect(stub.runs).toHaveLength(1);
  });

  it("refuses a job the balance cannot cover and writes no job row", async () => {
    const userId = await userWithCredits(10);
    const stub = createQueueStub();

    await expect(
      createJob(db, stub.queues, testLogger, {
        userId,
        idempotencyKey: "request-1",
        envelope: {
          type: "text_to_video",
          modelId,
          templateId: undefined,
          params: { prompt: "a cat surfing", durationS: 5 },
        },
      }),
    ).rejects.toSatisfy((error: unknown) => isAppError(error) && error.code === "INSUFFICIENT_CREDITS");

    const rows = await db.select().from(jobs).where(eq(jobs.userId, userId));
    expect(rows).toHaveLength(0);
    expect(await getBalance(db, userId)).toBe(10);
    expect(stub.runs).toHaveLength(0);
  });

  it("rejects blocked prompts before taking money", async () => {
    const userId = await userWithCredits();
    const stub = createQueueStub();

    await expect(
      createJob(db, stub.queues, testLogger, {
        userId,
        idempotencyKey: "request-1",
        envelope: {
          type: "text_to_video",
          modelId,
          templateId: undefined,
          params: { prompt: "csam", durationS: 5 },
        },
      }),
    ).rejects.toSatisfy((error: unknown) => isAppError(error) && error.code === "CONTENT_REJECTED");

    expect(await getBalance(db, userId)).toBe(1_000);
  });

  it("rejects an empty idempotency key", async () => {
    const userId = await userWithCredits();
    const stub = createQueueStub();

    await expect(
      createJob(db, stub.queues, testLogger, {
        userId,
        idempotencyKey: "  ",
        envelope: {
          type: "text_to_video",
          modelId,
          templateId: undefined,
          params: { prompt: "a cat surfing", durationS: 5 },
        },
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
