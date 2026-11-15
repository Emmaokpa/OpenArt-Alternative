import { JOB_TYPE_CAPABILITY, type Capability, type PricingUnit } from "@app/shared";
import type { Db } from "../../db/client.js";
import { AppError, badRequest } from "../../lib/errors.js";
import { getModel, getTemplateById, listModels, type ModelRecord, type TemplateRecord } from "../catalog/catalog.js";
import { quoteFromModel } from "./pricing.js";
import { parseJobParams, type JobEnvelope } from "./schemas.js";

export interface ResolvedQuote {
  model: ModelRecord;
  template: TemplateRecord | null;
  params: Record<string, unknown>;
  unit: PricingUnit;
  units: number;
  credits: number;
}

/**
 * Validates the request, merges template defaults, resolves the model and
 * prices the job. Both the quote endpoint and job creation use this, so the
 * displayed price and the charged price cannot drift.
 */
export async function resolveQuote(db: Db, input: JobEnvelope): Promise<ResolvedQuote> {
  const capability = JOB_TYPE_CAPABILITY[input.type];
  const template = input.templateId ? await getTemplateById(db, input.templateId) : null;

  if (template && template.capability !== capability) {
    throw badRequest("Template does not support this job type");
  }

  const params = parseJobParams(input.type, mergeParams(template, input.params));
  const model = await resolveModel(db, capability, input.modelId ?? template?.defaultModelId ?? null);
  const quote = quoteFromModel(model, params);

  return { model, template, params, ...quote };
}

function mergeParams(
  template: TemplateRecord | null,
  params: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...(template?.defaultParams ?? {}), ...params };

  // A template's scaffold is the starting prompt when the client sends none.
  if (merged.prompt === undefined && template?.promptScaffold) {
    merged.prompt = template.promptScaffold;
  }

  return merged;
}

async function resolveModel(
  db: Db,
  capability: Capability,
  requestedId: string | null,
): Promise<ModelRecord> {
  if (requestedId) {
    const model = await getModel(db, requestedId);
    if (model.capability !== capability) {
      throw badRequest("The selected model does not support this job type");
    }
    return model;
  }

  const available = await listModels(db, capability);
  const [fallback] = available;
  if (!fallback) {
    throw new AppError(503, "INTERNAL", "No model is configured for this job type yet");
  }

  return getModel(db, fallback.id);
}
