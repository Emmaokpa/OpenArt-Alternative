import { Router } from "express";
import { completeUpload, presignUpload, type AssetDeps } from "../../modules/assets/assets.js";
import { completeUploadSchema, presignUploadSchema } from "../../modules/jobs/schemas.js";
import { getAuthContext, requireAuth } from "../../modules/auth/middleware.js";
import { rateLimit } from "../../http/rate-limit.js";
import { validateBody } from "../../http/validate.js";
import type { UploadKind } from "../../modules/assets/limits.js";
import type { ApiContext } from "./context.js";

export function uploadsRouter(ctx: ApiContext): Router {
  const router = Router();
  const auth = requireAuth(ctx.auth);
  const deps: AssetDeps = {
    db: ctx.db,
    storage: ctx.storage,
    queues: ctx.queues,
    logger: ctx.logger,
  };

  router.post(
    "/presign",
    auth,
    rateLimit({
      limiter: ctx.rateLimiter,
      scope: "uploads:presign",
      limit: 20,
      windowSeconds: 60 * 60,
    }),
    validateBody(presignUploadSchema),
    async (req, res) => {
      const { user } = getAuthContext(res);
      const body = req.body as {
        kind: UploadKind;
        mime: string;
        sizeBytes: number;
        originalName?: string;
      };

      const result = await presignUpload(deps, user.id, body);
      res.status(201).json(result);
    },
  );

  router.post(
    "/complete",
    auth,
    validateBody(completeUploadSchema),
    async (req, res) => {
      const { user } = getAuthContext(res);
      const { assetId } = req.body as { assetId: string };
      const asset = await completeUpload(deps, user.id, assetId);

      res.json({
        asset: {
          id: asset.id,
          kind: asset.kind,
          mime: asset.mime,
          sizeBytes: asset.sizeBytes,
          durationMs: asset.durationMs,
          width: asset.width,
          height: asset.height,
          status: asset.status,
          originalName: asset.originalName,
        },
      });
    },
  );

  return router;
}
