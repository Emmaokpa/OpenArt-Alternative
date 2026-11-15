import { and, eq } from "drizzle-orm";
import type { Redis } from "ioredis";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { assets, creditLedger, jobSteps, jobs } from "../../db/schema/index.js";
import { ProviderError } from "../../providers/types.js";
import { createFakeProvider } from "../../providers/fake/fake.js";
import type { ProviderRegistry } from "../../providers/registry.js";
import type { JobRunnerDeps } from "./runner.js";
import { failStep, runJob } from "./runner.js";
import { createJob } from "./service.js";
import {
  createQueueStub,
  createReadyAsset,
  createTestModel,
  createTestUser,
  testEnv,
  testLogger,
  type QueueStub,
} from "../../test-utils/fixtures.js";
import { openTestDatabase, resetDatabase, testDatabaseAvailable } from "../../test-utils/db.js";
import { createMemoryStorage, type MemoryStorage } from "../../test-utils/storage.js";
import { ensureCreditAccount, getBalance, grantCredits } from "../credits/credits.js";

const available = await testDatabaseAvailable();
const { pool, db } = openTestDatabase();

afterAll(async () => {
  await pool.end();
});

/** The runner only uses `set`/`eval` for its lock; a map is enough here. */
function fakeRedis(): Redis {
  return {
    set: async () => "OK",
    eval: async () => 1,
  } as unknown as Redis;
}

function buildDeps(input: {
  envOverrides?: Record<string, string>;
  storage: MemoryStorage;
  stub: QueueStub;
  counters: { submits: number };
}): JobRunnerDeps {
  const env = testEnv(input.envOverrides);
  const fake = createFakeProvider(env, testLogger);

  const adapter = {
    ...fake,
    async submit(...args: Parameters<typeof fake.submit>) {
      input.counters.submits += 1;
      return fake.submit(...args);
    },
  };

  const providers: ProviderRegistry = {
    forModel: () => adapter,
    forProvider: () => adapter,
  };

  return {
    env,
    logger: testLogger,
    db,
    redis: fakeRedis(),
    storage: input.storage,
    providers,
    queues: input.stub.queues,
  };
}

async function fundedUser(modelId: string, type: "text_to_image" | "captions") {
  const userId = await createTestUser(db);
  await ensureCreditAccount(db, userId);
  await grantCredits(db, {
    userId,
    amount: 1_000,
    type: "grant_trial",
    idempotencyKey: `test:${userId}`,
  });

  const stub = createQueueStub();
  const params =
    type === "captions"
      ? { inputAssetId: await createReadyAsset(db, { userId, kind: "video" }), durationS: 60, burnIn: false }
      : { prompt: "a lighthouse at dusk", size: "1024x1024" };

  const created = await createJob(testEnv(), db, stub.queues, testLogger, {
    userId,
    idempotencyKey: `job:${userId}`,
    envelope: { type, modelId, templateId: undefined, params },
  });

  return { userId, stub, jobId: created.job.id };
}

describe.skipIf(!available)("job runner", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("runs a captions job to success and stores the produced VTT", async () => {
    const modelId = await createTestModel(db, {
      id: "test-stt",
      capability: "stt",
      unit: "minute",
      creditsPerUnit: "3",
    });
    const { userId, stub, jobId } = await fundedUser(modelId, "captions");
    const storage = createMemoryStorage();
    const counters = { submits: 0 };
    const deps = buildDeps({ envOverrides: { FAKE_DELAY_MS: "0" }, storage, stub, counters });

    await runJob(jobId, deps);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job?.status).toBe("succeeded");
    expect(job?.progress).toBe(100);
    expect(counters.submits).toBe(1);

    const produced = await db
      .select()
      .from(assets)
      .where(and(eq(assets.jobId, jobId), eq(assets.role, "captions")));
    expect(produced).toHaveLength(1);
    expect(produced[0]?.mime).toBe("text/vtt");

    const stored = storage.objects.get(produced[0]!.objectKey);
    expect(stored?.body.toString("utf8")).toContain("WEBVTT");

    expect(await getBalance(db, userId)).toBe(997);
    const refunds = await db
      .select()
      .from(creditLedger)
      .where(and(eq(creditLedger.jobId, jobId), eq(creditLedger.type, "refund")));
    expect(refunds).toHaveLength(0);
  });

  it("resumes a waiting job after a crash without submitting twice", async () => {
    const modelId = await createTestModel(db, {
      id: "test-image",
      capability: "text_to_image",
      unit: "image",
      creditsPerUnit: "2",
    });
    const { jobId } = await fundedUser(modelId, "text_to_image");
    const storage = createMemoryStorage();
    const counters = { submits: 0 };

    // First worker run: the fake provider is still generating.
    await runJob(
      jobId,
      buildDeps({ envOverrides: { FAKE_DELAY_MS: "60000" }, storage, stub: createQueueStub(), counters }),
    );

    const stepsAfterFirst = await db
      .select()
      .from(jobSteps)
      .where(eq(jobSteps.jobId, jobId))
      .orderBy(jobSteps.seq);
    const submit = stepsAfterFirst.find((step) => step.kind === "submit");
    expect(submit?.status).toBe("succeeded");
    expect(submit?.externalId).toBeTruthy();
    expect(stepsAfterFirst.find((step) => step.kind === "wait")?.status).toBe("running");
    expect(counters.submits).toBe(1);

    // Second worker run (a different process after the crash): it must poll the
    // saved provider id, not call submit again.
    const secondStub = createQueueStub();
    await runJob(
      jobId,
      buildDeps({ envOverrides: { FAKE_DELAY_MS: "0" }, storage, stub: secondStub, counters }),
    );

    expect(counters.submits).toBe(1);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId));
    expect(job?.status).toBe("running");

    const produced = await db
      .select()
      .from(assets)
      .where(and(eq(assets.jobId, jobId), eq(assets.role, "output")));
    expect(produced).toHaveLength(1);
    expect(produced[0]?.mime).toBe("image/png");

    // The thumbnail step is ffmpeg work and is handed to worker-media.
    expect(secondStub.media).toHaveLength(1);
  });

  it("fails a job with exactly one refund, even if failure is reported twice", async () => {
    const modelId = await createTestModel(db, {
      id: "test-video",
      capability: "text_to_video",
      unit: "second",
      creditsPerUnit: "10",
    });
    const userId = await createTestUser(db);
    await ensureCreditAccount(db, userId);
    await grantCredits(db, {
      userId,
      amount: 100,
      type: "grant_trial",
      idempotencyKey: `test:${userId}`,
    });
    const stub = createQueueStub();
    const created = await createJob(testEnv(), db, stub.queues, testLogger, {
      userId,
      idempotencyKey: "job-1",
      envelope: {
        type: "text_to_video",
        modelId,
        templateId: undefined,
        params: { prompt: "a kite in a storm", durationS: 5 },
      },
    });

    const storage = createMemoryStorage();
    const deps = buildDeps({ envOverrides: { FAKE_DELAY_MS: "60000" }, storage, stub, counters: { submits: 0 } });
    await runJob(created.job.id, deps);

    const [job] = await db.select().from(jobs).where(eq(jobs.id, created.job.id));
    const [step] = await db
      .select()
      .from(jobSteps)
      .where(and(eq(jobSteps.jobId, created.job.id), eq(jobSteps.kind, "wait")));

    expect(job).toBeDefined();
    expect(step).toBeDefined();

    await failStep(deps, job!, step!, new ProviderError("PROVIDER_ERROR", "boom", false));
    await failStep(deps, job!, step!, new ProviderError("PROVIDER_ERROR", "boom again", false));

    const [failed] = await db.select().from(jobs).where(eq(jobs.id, created.job.id));
    expect(failed?.status).toBe("failed");
    expect(failed?.errorCode).toBe("PROVIDER_ERROR");
    expect(await getBalance(db, userId)).toBe(100);

    const refunds = await db
      .select()
      .from(creditLedger)
      .where(and(eq(creditLedger.jobId, created.job.id), eq(creditLedger.type, "refund")));
    expect(refunds).toHaveLength(1);
  });
});
