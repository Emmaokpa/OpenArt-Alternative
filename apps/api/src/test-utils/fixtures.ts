import { randomUUID } from "node:crypto";
import type { Capability } from "@app/shared";
import type { Db } from "../db/client.js";
import { assets, jobs, models, user } from "../db/schema/index.js";
import { loadEnv } from "../env.js";
import { createLogger } from "../logger.js";
import type { Queues, RunJobData } from "../queue/queues.js";

export function testEnv(overrides: Record<string, string> = {}) {
  return loadEnv({
    DATABASE_URL: "postgres://app:app@localhost:5432/app",
    REDIS_URL: "redis://localhost:6379",
    NODE_ENV: "test",
    ...overrides,
  });
}

export const testLogger = createLogger(testEnv());

export interface QueueStub {
  queues: Queues;
  runs: RunJobData[];
  media: Array<{ jobId: string; stepId: string }>;
  probes: string[];
}

/** Records enqueues instead of talking to Redis. */
export function createQueueStub(): QueueStub {
  const runs: RunJobData[] = [];
  const media: Array<{ jobId: string; stepId: string }> = [];
  const probes: string[] = [];

  const providerJobs = {
    add: async (_name: string, data: RunJobData) => {
      runs.push(data);
      return {};
    },
  };

  const mediaJobs = {
    add: async (_name: string, data: { kind: string; jobId?: string; stepId?: string; assetId?: string }) => {
      if (data.kind === "job-step" && data.jobId && data.stepId) {
        media.push({ jobId: data.jobId, stepId: data.stepId });
      }
      if (data.kind === "probe-asset" && data.assetId) {
        probes.push(data.assetId);
      }
      return {};
    },
  };

  const maintenance = { add: async () => ({}) };

  return {
    queues: {
      providerJobs,
      mediaJobs,
      maintenance,
      close: async () => undefined,
    } as unknown as Queues,
    runs,
    media,
    probes,
  };
}

export async function createTestUser(db: Db, id = `user_${randomUUID()}`): Promise<string> {
  await db.insert(user).values({
    id,
    name: "Test User",
    email: `${id}@example.test`,
    emailVerified: true,
  });
  return id;
}

export async function createTestModel(
  db: Db,
  options: {
    id?: string;
    capability?: Capability;
    provider?: string;
    unit?: "second" | "image" | "minute" | "request";
    creditsPerUnit?: string;
    minUnits?: string;
    maxUnits?: string;
  } = {},
): Promise<string> {
  const id = options.id ?? `model_${randomUUID()}`;
  await db.insert(models).values({
    id,
    label: id,
    capability: options.capability ?? "text_to_video",
    provider: options.provider ?? "fake",
    providerModel: id,
    unit: options.unit ?? "second",
    costUsdMicrosPerUnit: 0,
    creditsPerUnit: options.creditsPerUnit ?? "1",
    minUnits: options.minUnits ?? "1",
    maxUnits: options.maxUnits ?? "30",
  });
  return id;
}

export async function createTestJob(
  db: Db,
  input: {
    userId: string;
    modelId?: string | null;
    type?: "text_to_video" | "image_to_video" | "text_to_image" | "lip_sync" | "captions";
    status?: "queued" | "running" | "succeeded" | "failed" | "canceled";
    params?: Record<string, unknown>;
    creditCost?: number;
    idempotencyKey?: string | null;
  },
): Promise<string> {
  const id = randomUUID();
  await db.insert(jobs).values({
    id,
    userId: input.userId,
    type: input.type ?? "text_to_video",
    status: input.status ?? "queued",
    modelId: input.modelId ?? null,
    params: input.params ?? { prompt: "test" },
    creditCost: input.creditCost ?? 10,
    idempotencyKey: input.idempotencyKey ?? null,
  });
  return id;
}

export async function createReadyAsset(
  db: Db,
  input: {
    userId: string;
    kind?: "video" | "image" | "audio" | "text";
    role?: "input" | "output" | "thumbnail" | "captions";
  },
): Promise<string> {
  const id = randomUUID();
  await db.insert(assets).values({
    id,
    userId: input.userId,
    role: input.role ?? "input",
    kind: input.kind ?? "video",
    bucket: "test-private",
    objectKey: `test/${id}`,
    mime: input.kind === "image" ? "image/png" : "video/mp4",
    status: "ready",
  });
  return id;
}
