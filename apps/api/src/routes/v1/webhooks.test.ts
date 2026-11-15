import request from "supertest";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { jobSteps, webhookEvents } from "../../db/schema/index.js";
import type { Auth } from "../../modules/auth/auth.js";
import type { ProviderRegistry } from "../../providers/registry.js";
import type { ApiContext } from "./context.js";
import {
  createQueueStub,
  createTestModel,
  createTestUser,
  createTestJob,
  testEnv,
  testLogger,
} from "../../test-utils/fixtures.js";
import { openTestDatabase, resetDatabase, testDatabaseAvailable } from "../../test-utils/db.js";
import { createMemoryStorage } from "../../test-utils/storage.js";

const available = await testDatabaseAvailable();
const { pool, db } = openTestDatabase();

afterAll(async () => {
  await pool.end();
});

const env = testEnv();

function buildApp(stub: ReturnType<typeof createQueueStub>) {
  const api: ApiContext = {
    env,
    logger: testLogger,
    db,
    // The webhook route never authenticates; a stub keeps the test focused.
    auth: {} as unknown as Auth,
    storage: createMemoryStorage(),
    providers: {} as unknown as ProviderRegistry,
    queues: stub.queues,
    rateLimiter: {
      hit: async () => ({ allowed: true, remaining: 10, retryAfterSeconds: 0 }),
    },
  };

  return createApp({
    env,
    logger: testLogger,
    checks: { database: async () => undefined, redis: async () => undefined },
    api,
  });
}

describe.skipIf(!available)("provider webhooks", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("records a provider event once and ignores a replay", async () => {
    const userId = await createTestUser(db);
    const modelId = await createTestModel(db, {
      id: "test-video",
      capability: "text_to_video",
    });
    const jobId = await createTestJob(db, { userId, modelId });

    await db.insert(jobSteps).values({
      jobId,
      seq: 0,
      kind: "submit",
      status: "succeeded",
      provider: "fake",
      externalId: "fake-external-1",
    });

    const stub = createQueueStub();
    const app = buildApp(stub);
    const body = { externalId: "fake-external-1", status: "succeeded" };

    const first = await request(app)
      .post("/v1/webhooks/providers/fake")
      .set("x-webhook-id", "event-1")
      .send(body);
    const replay = await request(app)
      .post("/v1/webhooks/providers/fake")
      .set("x-webhook-id", "event-1")
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ received: true, duplicate: false });
    expect(replay.status).toBe(200);
    expect(replay.body).toMatchObject({ received: true, duplicate: true });

    const events = await db.select().from(webhookEvents);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventId).toBe("event-1");
    expect(events[0]?.processedAt).not.toBeNull();

    // Only the first delivery resumes the job.
    expect(stub.runs).toEqual([{ jobId }]);
  });

  it("rejects an unknown provider", async () => {
    const app = buildApp(createQueueStub());
    const response = await request(app)
      .post("/v1/webhooks/providers/unknown-provider")
      .send({ externalId: "x", status: "succeeded" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });

  it("stops trusting a provider event twice when it has no id header", async () => {
    const app = buildApp(createQueueStub());
    const body = { externalId: "fake-external-2", status: "failed" };

    const first = await request(app).post("/v1/webhooks/providers/fake").send(body);
    const replay = await request(app).post("/v1/webhooks/providers/fake").send(body);

    expect(first.body.duplicate).toBe(false);
    expect(replay.body.duplicate).toBe(true);

    const events = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.eventId, "fake:fake-external-2:failed"));
    expect(events).toHaveLength(1);
  });
});
