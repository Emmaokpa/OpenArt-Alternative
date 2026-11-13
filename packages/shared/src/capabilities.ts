/**
 * Vocabularies shared by the API, the web app and (later) the mobile app.
 * The database check constraints in `apps/api/src/db/schema` are derived from
 * these lists, so a new capability is added here and migrated, not special-cased.
 */

export const CAPABILITIES = [
  "text_to_video",
  "image_to_video",
  "text_to_image",
  "lip_sync",
  "stt",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

/** A user-facing job type. Lip sync and captions are v1 tools from later phases. */
export const JOB_TYPES = [
  "text_to_video",
  "image_to_video",
  "text_to_image",
  "lip_sync",
  "captions",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["queued", "running", "succeeded", "failed", "canceled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STEP_STATUSES = ["pending", "running", "succeeded", "failed", "skipped"] as const;
export type JobStepStatus = (typeof JOB_STEP_STATUSES)[number];

/** Generic step kinds so new tools plug into the same runner. */
export const JOB_STEP_KINDS = [
  "moderate",
  "submit",
  "wait",
  "download",
  "transcribe",
  "build_captions",
  "burn_captions",
  "thumbnail",
] as const;
export type JobStepKind = (typeof JOB_STEP_KINDS)[number];

export const ASSET_ROLES = ["input", "output", "thumbnail", "captions", "intermediate"] as const;
export type AssetRole = (typeof ASSET_ROLES)[number];

export const ASSET_KINDS = ["video", "image", "audio", "text"] as const;
export type AssetKind = (typeof ASSET_KINDS)[number];

export const ASSET_STATUSES = ["pending", "ready", "deleted"] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/** Units a provider bills in; see the `models` table. */
export const PRICING_UNITS = ["second", "image", "minute", "request"] as const;
export type PricingUnit = (typeof PRICING_UNITS)[number];

export const LEDGER_ENTRY_TYPES = [
  "grant_plan",
  "grant_topup",
  "grant_trial",
  "spend",
  "refund",
  "adjustment",
  "expire",
] as const;
export type LedgerEntryType = (typeof LEDGER_ENTRY_TYPES)[number];
