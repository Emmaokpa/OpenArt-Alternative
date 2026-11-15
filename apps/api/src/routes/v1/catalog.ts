import { z } from "zod";
import { Router } from "express";
import { CAPABILITIES, type Capability } from "@app/shared";
import { listModels, listTemplates, getTemplateBySlug, toTemplateSummary } from "../../modules/catalog/catalog.js";
import { validateQuery } from "../../http/validate.js";
import { badRequest } from "../../lib/errors.js";
import { param } from "../../lib/http-params.js";
import type { ApiContext } from "./context.js";

const modelsQuery = z.object({ capability: z.enum(CAPABILITIES).optional() }).strict();
const templatesQuery = z
  .object({ category: z.string().min(1).max(100).optional(), capability: z.enum(CAPABILITIES).optional() })
  .strict();

export function catalogRouter(ctx: ApiContext): Router {
  const router = Router();

  router.get("/models", validateQuery(modelsQuery), async (req, res) => {
    const { capability } = req.query as { capability?: Capability };
    const rows = await listModels(ctx.db, capability);
    res.json({ models: rows });
  });

  router.get("/templates", validateQuery(templatesQuery), async (req, res) => {
    const { category, capability } = req.query as {
      category?: string;
      capability?: Capability;
    };
    const rows = await listTemplates(ctx.db, { category, capability });
    res.json({ templates: rows });
  });

  router.get("/templates/:slug", async (req, res) => {
    const slug = param(req.params.slug);
    if (!slug || slug.length > 200) throw badRequest("Invalid template slug");
    const template = await getTemplateBySlug(ctx.db, slug);
    res.json({ template: toTemplateSummary(template) });
  });

  return router;
}
