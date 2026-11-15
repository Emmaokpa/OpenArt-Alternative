import { z } from "zod";
import { JOB_STATUSES, JOB_TYPES } from "@app/shared";
import { badRequest } from "../../lib/errors.js";
import { zodIssues } from "../../http/validate.js";

const prompt = z.string().trim().min(1).max(2_000);
const aspect = z.enum(["16:9", "9:16", "1:1"]).default("16:9");
const resolution = z.enum(["480p", "720p", "1080p"]).default("720p");
const videoDuration = z.coerce.number().int().min(1).max(30).default(5);

const textToVideo = z
  .object({
    prompt,
    durationS: videoDuration,
    aspect,
    resolution,
  })
  .strict();

const imageToVideo = z
  .object({
    inputAssetId: z.uuid(),
    prompt: z.string().trim().max(2_000).optional(),
    durationS: videoDuration,
    aspect,
    resolution,
  })
  .strict();

const textToImage = z
  .object({
    prompt,
    size: z
      .enum(["512x512", "768x768", "1024x1024", "1024x1792", "1792x1024"])
      .default("1024x1024"),
  })
  .strict();

const lipSync = z
  .object({
    inputVideoAssetId: z.uuid().optional(),
    inputImageAssetId: z.uuid().optional(),
    audioAssetId: z.uuid(),
    durationS: videoDuration,
  })
  .strict()
  .refine(
    (value) =>
      Number(Boolean(value.inputVideoAssetId)) + Number(Boolean(value.inputImageAssetId)) === 1,
    {
      message: "Provide exactly one of inputVideoAssetId or inputImageAssetId",
      path: ["inputVideoAssetId"],
    },
  );

const captions = z
  .object({
    inputAssetId: z.uuid(),
    durationS: z.coerce.number().int().min(1).max(3_600).default(60),
    burnIn: z.boolean().default(false),
  })
  .strict();

const PARAM_SCHEMAS = {
  text_to_video: textToVideo,
  image_to_video: imageToVideo,
  text_to_image: textToImage,
  lip_sync: lipSync,
  captions,
} as const;

export type JobParamsByType = {
  [K in keyof typeof PARAM_SCHEMAS]: z.infer<(typeof PARAM_SCHEMAS)[K]>;
};

/** The JSON body accepted by `POST /v1/jobs` and `POST /v1/quotes`. */
export const jobEnvelopeSchema = z
  .object({
    type: z.enum(JOB_TYPES),
    modelId: z.string().min(1).max(100).optional(),
    templateId: z.uuid().optional(),
    params: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();

export type JobEnvelope = z.infer<typeof jobEnvelopeSchema>;

export function paramsSchemaForType(type: keyof typeof PARAM_SCHEMAS) {
  return PARAM_SCHEMAS[type];
}

/**
 * Template defaults are merged before validation, so a template can supply the
 * prompt scaffold or duration without the client sending every field.
 */
export function parseJobParams(
  type: keyof typeof PARAM_SCHEMAS,
  raw: Record<string, unknown>,
): Record<string, unknown> {
  const result = paramsSchemaForType(type).safeParse(raw);
  if (!result.success) {
    throw badRequest("Job parameters are invalid", { fields: zodIssues(result.error) });
  }
  return result.data as Record<string, unknown>;
}

export const listJobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).max(500).optional(),
  status: z.enum(JOB_STATUSES).optional(),
});

export const providerWebhookSchema = z
  .object({
    externalId: z.string().min(1).max(2_000),
    status: z.enum(["succeeded", "failed"]),
    error: z.string().max(1_000).optional(),
  })
  .strict();

export const adminCreditSchema = z
  .object({
    userId: z.string().min(1).max(100),
    delta: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0, {
      message: "delta must not be zero",
    }),
    note: z.string().trim().min(3).max(500),
  })
  .strict();

export const presignUploadSchema = z
  .object({
    kind: z.enum(["video", "image", "audio"]),
    mime: z.string().min(3).max(100),
    sizeBytes: z.number().int().positive().max(2_000_000_000),
    originalName: z.string().trim().max(200).optional(),
  })
  .strict();

export const completeUploadSchema = z
  .object({
    assetId: z.uuid(),
  })
  .strict();
