/**
 * JSON shapes shared by the API and the web app. Keep them serialisable:
 * dates are ISO strings and numeric columns are numbers, not strings.
 */
import type { AssetKind, Capability, JobStatus, JobType, PricingUnit } from "./capabilities.js";

export interface ModelSummary {
  id: string;
  label: string;
  description: string | null;
  capability: Capability;
  provider: string;
  providerModel: string;
  unit: PricingUnit;
  creditsPerUnit: number;
  minUnits: number | null;
  maxUnits: number | null;
}

export interface TemplateSummary {
  id: string;
  slug: string;
  title: string;
  category: string;
  capability: Capability;
  promptScaffold: string | null;
  defaultModelId: string | null;
  defaultParams: Record<string, unknown> | null;
  previewVideoKey: string | null;
  thumbnailKey: string | null;
}

export interface JobStepView {
  seq: number;
  kind: string;
  status: string;
  provider: string | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface JobAssetView {
  id: string;
  role: string;
  kind: AssetKind;
  mime: string | null;
  durationMs: number | null;
  width: number | null;
  height: number | null;
  downloadUrl?: string;
}

export interface JobView {
  id: string;
  type: JobType;
  status: JobStatus;
  modelId: string | null;
  templateId: string | null;
  params: Record<string, unknown>;
  creditCost: number;
  progress: number;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  steps?: JobStepView[];
  assets?: JobAssetView[];
}

export interface MeView {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
  profile: {
    displayName: string | null;
    role: "user" | "admin";
    planId: string | null;
    suspendedAt: string | null;
  };
  balance: number;
  plan: { id: string; name: string; monthlyCredits: number } | null;
}
