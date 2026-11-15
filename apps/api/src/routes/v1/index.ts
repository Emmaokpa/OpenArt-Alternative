import { Router } from "express";
import { adminRouter } from "./admin.js";
import { assetsRouter } from "./assets.js";
import { catalogRouter } from "./catalog.js";
import { jobsRouter } from "./jobs.js";
import { meRouter } from "./me.js";
import { quotesRouter } from "./quotes.js";
import { uploadsRouter } from "./uploads.js";
import { webhooksRouter } from "./webhooks.js";
import type { ApiContext } from "./context.js";

export function createV1Router(ctx: ApiContext): Router {
  const router = Router();

  router.use("/", catalogRouter(ctx));
  router.use("/", meRouter(ctx));
  router.use("/quotes", quotesRouter(ctx));
  router.use("/jobs", jobsRouter(ctx));
  router.use("/uploads", uploadsRouter(ctx));
  router.use("/assets", assetsRouter(ctx));
  router.use("/webhooks", webhooksRouter(ctx));
  router.use("/admin", adminRouter(ctx));

  return router;
}

export type { ApiContext };
