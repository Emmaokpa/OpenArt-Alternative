import type { JobStatus, JobStepKind, JobType } from "@app/shared";
import type { assets, jobs, jobSteps } from "../../db/schema/core.js";

export type JobRecord = typeof jobs.$inferSelect;
export type JobStepRecord = typeof jobSteps.$inferSelect;
export type AssetRecord = typeof assets.$inferSelect;

/**
 * Every job type is an ordered list of resumable steps. New tools are added by
 * adding a pipeline, not by branching inside a monolith.
 */
export const JOB_PIPELINES: Record<JobType, readonly JobStepKind[]> = {
  text_to_video: ["moderate", "submit", "wait", "store", "thumbnail"],
  image_to_video: ["validate", "moderate", "submit", "wait", "store", "thumbnail"],
  text_to_image: ["moderate", "submit", "wait", "store", "thumbnail"],
  lip_sync: ["validate", "moderate", "submit", "wait", "store", "thumbnail"],
  captions: ["validate", "moderate", "submit", "wait", "store"],
};

/** Steps that need ffmpeg and therefore run on worker-media (concurrency 1). */
export const MEDIA_STEP_KINDS: ReadonlySet<JobStepKind> = new Set([
  "thumbnail",
  "burn_captions",
]);

/** Provider wait limits per capability; a timeout refunds the job. */
export const PROVIDER_TIMEOUT_MS: Record<string, number> = {
  text_to_image: 2 * 60_000,
  text_to_video: 15 * 60_000,
  image_to_video: 15 * 60_000,
  lip_sync: 15 * 60_000,
  stt: 10 * 60_000,
};

export const TERMINAL_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "succeeded",
  "failed",
  "canceled",
]);

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_JOB_STATUSES.has(status as JobStatus);
}
