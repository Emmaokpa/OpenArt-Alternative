import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { extname, join } from "node:path";
import type { Capability, JobType } from "@app/shared";
import { eq } from "drizzle-orm";
import type { Db } from "../../db/client.js";
import { assets } from "../../db/schema/core.js";
import { transcriptToVtt, type Transcript } from "../../lib/captions.js";
import { AppError } from "../../lib/errors.js";
import { probeMedia, writeThumbnail } from "../../lib/ffmpeg.js";
import { extensionForMime, outputKey } from "../../lib/object-keys.js";
import { withScratch } from "../../lib/scratch.js";
import type { Storage } from "../../lib/storage.js";
import type { Logger } from "../../logger.js";
import type { Env } from "../../env.js";
import type { ModelRecord } from "../catalog/catalog.js";
import { recordModeration, screenText } from "../moderation/moderation.js";
import { ProviderError, type ProviderAdapter, type ProviderOutput } from "../../providers/types.js";
import { assertInputAssets } from "./input-assets.js";
import type { JobRecord, JobStepRecord } from "./types.js";

export interface StepContext {
  env: Env;
  db: Db;
  logger: Logger;
  storage: Storage;
  provider: ProviderAdapter;
  job: JobRecord;
  step: JobStepRecord;
  steps: JobStepRecord[];
  model: ModelRecord;
}

export type StepResult =
  | {
      status: "done";
      output?: Record<string, unknown>;
      externalId?: string;
      costUsdMicros?: number;
    }
  | { status: "wait"; retryInMs: number; progress?: number };

/** Exponential backoff, capped so a long wait never floods the queue. */
export function pollDelay(attempt: number, env: Pick<Env, "JOB_POLL_INTERVAL_MS" | "JOB_POLL_MAX_MS">): number {
  const base = env.JOB_POLL_INTERVAL_MS;
  return Math.min(base * 2 ** Math.min(attempt, 4), env.JOB_POLL_MAX_MS);
}

export async function executeStep(context: StepContext): Promise<StepResult> {
  switch (context.step.kind) {
    case "validate":
      return validateStep(context);
    case "moderate":
      return moderateStep(context);
    case "submit":
      return submitStep(context);
    case "wait":
      return waitStep(context);
    case "store":
      return storeStep(context);
    case "thumbnail":
      return thumbnailStep(context);
    default:
      throw new AppError(500, "INTERNAL", `Unsupported job step: ${context.step.kind}`);
  }
}

async function validateStep(context: StepContext): Promise<StepResult> {
  await assertInputAssets(
    context.db,
    context.job.userId,
    context.job.type as JobType,
    context.job.params,
  );
  return { status: "done", output: { validated: true } };
}

async function moderateStep(context: StepContext): Promise<StepResult> {
  const prompt = typeof context.job.params.prompt === "string" ? context.job.params.prompt : null;

  if (prompt) {
    const screen = screenText(prompt);
    if (!screen.allowed) {
      await recordModeration(context.db, {
        userId: context.job.userId,
        jobId: context.job.id,
        stage: "prompt",
        result: "rejected",
        detail: { reason: screen.reason },
      });
      throw new AppError(422, "CONTENT_REJECTED", screen.reason ?? "This content is not allowed");
    }
  }

  await recordModeration(context.db, {
    userId: context.job.userId,
    jobId: context.job.id,
    stage: "prompt",
    result: "allowed",
  });

  return { status: "done", output: { allowed: true } };
}

async function submitStep(context: StepContext): Promise<StepResult> {
  const { externalId } = await context.provider.submit({
    capability: context.model.capability as Capability,
    modelId: context.model.id,
    providerModel: context.model.providerModel,
    params: context.job.params,
  });

  if (!externalId) {
    throw new ProviderError("PROVIDER_ERROR", "The provider returned an empty job id", true);
  }

  // The runner persists this id on the step before the worker returns, so a
  // restart resumes polling instead of submitting (and paying) again.
  return { status: "done", externalId, output: { externalId } };
}

async function waitStep(context: StepContext): Promise<StepResult> {
  const submit = findStep(context.steps, "submit");
  if (!submit?.externalId) {
    throw new AppError(500, "INTERNAL", "Provider submission was not recorded");
  }

  const startedAt = submit.finishedAt ?? submit.startedAt ?? context.job.createdAt;
  const timeoutMs = providerTimeoutMs(context.model.capability);

  if (Date.now() - startedAt.getTime() > timeoutMs) {
    // Timeouts are not retried: a late result would double-pay the provider.
    throw new ProviderError("PROVIDER_TIMEOUT", "The provider took too long to finish", false);
  }

  const result = await context.provider.poll(submit.externalId);

  if (result.status === "running") {
    return {
      status: "wait",
      retryInMs: pollDelay(context.step.attempt, context.env),
      progress: result.progress,
    };
  }

  if (result.status === "failed") {
    if (result.retryable && context.step.attempt < 3) {
      return {
        status: "wait",
        retryInMs: pollDelay(context.step.attempt, context.env),
      };
    }
    throw new ProviderError(result.code, result.message, result.retryable);
  }

  return { status: "done", output: { providerOutput: result.output } };
}

async function storeStep(context: StepContext): Promise<StepResult> {
  const wait = findStep(context.steps, "wait");
  const output = readProviderOutput(wait?.output);
  if (!output) throw new AppError(500, "INTERNAL", "The provider output is missing");

  if (output.kind === "text") {
    return storeCaptions(context, output);
  }

  const assetId = randomUUID();
  const key = outputKey({
    userId: context.job.userId,
    jobId: context.job.id,
    assetId,
    folder: "output",
    extension: output.extension,
  });

  const stream = await context.provider.openOutput(output);
  const { bytes } = await context.storage.putStream({
    key,
    body: stream,
    contentType: output.mime,
  });

  const probe = await probeObject(context, key);
  const [asset] = await context.db
    .insert(assets)
    .values({
      id: assetId,
      userId: context.job.userId,
      jobId: context.job.id,
      role: "output",
      kind: output.kind,
      bucket: context.storage.privateBucket,
      objectKey: key,
      mime: output.mime,
      sizeBytes: bytes,
      durationMs: probe?.durationMs ?? null,
      width: probe?.width ?? null,
      height: probe?.height ?? null,
      status: "ready",
    })
    .returning();

  if (!asset) throw new AppError(500, "INTERNAL", "Could not record the output asset");

  return {
    status: "done",
    output: { assetId: asset.id, kind: output.kind, mime: output.mime, bytes },
  };
}

async function storeCaptions(
  context: StepContext,
  output: ProviderOutput,
): Promise<StepResult> {
  const stream = await context.provider.openOutput(output);
  const raw = await readSmallText(stream, 2 * 1024 * 1024);

  let transcript: Transcript;
  try {
    transcript = JSON.parse(raw) as Transcript;
  } catch {
    throw new ProviderError("PROVIDER_ERROR", "The transcript was not valid JSON", false);
  }

  const durationS = typeof context.job.params.durationS === "number" ? context.job.params.durationS : 60;
  const vtt = transcriptToVtt(transcript, durationS);

  const assetId = randomUUID();
  const key = outputKey({
    userId: context.job.userId,
    jobId: context.job.id,
    assetId,
    folder: "captions",
    extension: "vtt",
  });

  await context.storage.putText({ key, body: vtt, contentType: "text/vtt" });

  await context.db.insert(assets).values({
    id: assetId,
    userId: context.job.userId,
    jobId: context.job.id,
    role: "captions",
    kind: "text",
    bucket: context.storage.privateBucket,
    objectKey: key,
    mime: "text/vtt",
    sizeBytes: Buffer.byteLength(vtt, "utf8"),
    status: "ready",
  });

  return { status: "done", output: { assetId } };
}

async function thumbnailStep(context: StepContext): Promise<StepResult> {
  const store = findStep(context.steps, "store");
  const assetId = typeof store?.output?.assetId === "string" ? store.output.assetId : null;
  if (!assetId) return { status: "done", output: { skipped: true } };

  const [source] = await context.db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!source || source.status !== "ready") return { status: "done", output: { skipped: true } };
  if (source.kind !== "video" && source.kind !== "image") {
    return { status: "done", output: { skipped: true } };
  }

  return withScratch(async (dir) => {
    const extension = extname(source.objectKey).replace(/^\./, "") || "bin";
    const inputPath = join(dir, `input.${extension}`);
    const outputPath = join(dir, "thumbnail.jpg");

    await context.storage.downloadToFile(source.objectKey, inputPath);
    const ok = await writeThumbnail(inputPath, outputPath, source.kind === "video" ? 1 : 0);

    if (!ok) {
      context.logger.info(
        { jobId: context.job.id },
        "ffmpeg unavailable or thumbnail generation failed; skipping",
      );
      return { status: "done", output: { skipped: true } };
    }

    const thumbnailId = randomUUID();
    const key = outputKey({
      userId: context.job.userId,
      jobId: context.job.id,
      assetId: thumbnailId,
      folder: "thumb",
      extension: "jpg",
    });

    await context.storage.putStream({
      key,
      body: createReadStream(outputPath),
      contentType: "image/jpeg",
    });

    await context.db.insert(assets).values({
      id: thumbnailId,
      userId: context.job.userId,
      jobId: context.job.id,
      role: "thumbnail",
      kind: "image",
      bucket: context.storage.privateBucket,
      objectKey: key,
      mime: "image/jpeg",
      status: "ready",
    });

    return { status: "done", output: { assetId: thumbnailId } };
  });
}

function findStep(steps: JobStepRecord[], kind: string): JobStepRecord | undefined {
  return steps.find((step) => step.kind === kind && step.status === "succeeded");
}

function readProviderOutput(output: Record<string, unknown> | null | undefined): ProviderOutput | null {
  const candidate = output?.providerOutput;
  if (typeof candidate !== "object" || candidate === null) return null;

  const value = candidate as Partial<ProviderOutput>;
  if (
    typeof value.url !== "string" ||
    typeof value.mime !== "string" ||
    typeof value.extension !== "string" ||
    (value.kind !== "video" && value.kind !== "image" && value.kind !== "audio" && value.kind !== "text")
  ) {
    return null;
  }

  return {
    url: value.url,
    kind: value.kind,
    mime: value.mime,
    extension: value.extension || extensionForMime(value.mime),
  };
}

function providerTimeoutMs(capability: string): number {
  const times: Record<string, number> = {
    text_to_image: 2 * 60_000,
    text_to_video: 15 * 60_000,
    image_to_video: 15 * 60_000,
    lip_sync: 15 * 60_000,
    stt: 10 * 60_000,
  };
  return times[capability] ?? 15 * 60_000;
}

async function probeObject(context: StepContext, key: string) {
  try {
    const url = await context.storage.presignGet({ key, expiresInSeconds: 300 });
    return await probeMedia(url);
  } catch {
    return null;
  }
}

async function readSmallText(stream: AsyncIterable<unknown>, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    total += buffer.length;
    if (total > maxBytes) {
      throw new ProviderError("PROVIDER_ERROR", "The provider output is unexpectedly large", false);
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks).toString("utf8");
}
