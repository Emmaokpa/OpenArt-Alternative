import { and, asc, eq } from "drizzle-orm";
import type { Capability, ModelSummary, TemplateSummary } from "@app/shared";
import type { Db } from "../../db/client.js";
import { models, templates } from "../../db/schema/core.js";
import { notFound } from "../../lib/errors.js";

export type ModelRecord = typeof models.$inferSelect;
export type TemplateRecord = typeof templates.$inferSelect;

export function toModelSummary(model: ModelRecord): ModelSummary {
  return {
    id: model.id,
    label: model.label,
    description: model.description,
    capability: model.capability as Capability,
    provider: model.provider,
    providerModel: model.providerModel,
    unit: model.unit as ModelSummary["unit"],
    creditsPerUnit: Number(model.creditsPerUnit),
    minUnits: model.minUnits === null ? null : Number(model.minUnits),
    maxUnits: model.maxUnits === null ? null : Number(model.maxUnits),
  };
}

export async function listModels(db: Db, capability?: Capability): Promise<ModelSummary[]> {
  const where = capability
    ? and(eq(models.active, true), eq(models.capability, capability))
    : eq(models.active, true);

  const rows = await db.select().from(models).where(where).orderBy(asc(models.label));
  return rows.map(toModelSummary);
}

export async function getModel(db: Db, id: string): Promise<ModelRecord> {
  const [model] = await db.select().from(models).where(eq(models.id, id)).limit(1);
  if (!model || !model.active) throw notFound("Model not found");
  return model;
}

export function toTemplateSummary(template: TemplateRecord): TemplateSummary {
  return {
    id: template.id,
    slug: template.slug,
    title: template.title,
    category: template.category,
    capability: template.capability as Capability,
    promptScaffold: template.promptScaffold,
    defaultModelId: template.defaultModelId,
    defaultParams: template.defaultParams,
    previewVideoKey: template.previewVideoKey,
    thumbnailKey: template.thumbnailKey,
  };
}

export async function listTemplates(
  db: Db,
  filters: { category?: string; capability?: Capability } = {},
): Promise<TemplateSummary[]> {
  const conditions = [eq(templates.published, true)];
  if (filters.category) conditions.push(eq(templates.category, filters.category));
  if (filters.capability) conditions.push(eq(templates.capability, filters.capability));

  const rows = await db
    .select()
    .from(templates)
    .where(and(...conditions))
    .orderBy(asc(templates.sortOrder), asc(templates.title));

  return rows.map(toTemplateSummary);
}

export async function getTemplateBySlug(db: Db, slug: string): Promise<TemplateRecord> {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.slug, slug), eq(templates.published, true)))
    .limit(1);

  if (!template) throw notFound("Template not found");
  return template;
}

export async function getTemplateById(db: Db, id: string): Promise<TemplateRecord> {
  const [template] = await db
    .select()
    .from(templates)
    .where(and(eq(templates.id, id), eq(templates.published, true)))
    .limit(1);

  if (!template) throw notFound("Template not found");
  return template;
}
