import { Router } from "express";
import { getAssetForUser } from "../../modules/assets/assets.js";
import { getAuthContext, requireAuth } from "../../modules/auth/middleware.js";
import { notFound } from "../../lib/errors.js";
import { param } from "../../lib/http-params.js";
import type { ApiContext } from "./context.js";

export function assetsRouter(ctx: ApiContext): Router {
  const router = Router();
  const auth = requireAuth(ctx.auth);

  router.get("/:id", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    const asset = await getAssetForUser(ctx.db, user.id, param(req.params.id));

    res.json({
      asset: {
        id: asset.id,
        kind: asset.kind,
        role: asset.role,
        mime: asset.mime,
        sizeBytes: asset.sizeBytes,
        durationMs: asset.durationMs,
        width: asset.width,
        height: asset.height,
        status: asset.status,
        originalName: asset.originalName,
      },
    });
  });

  router.get("/:id/download", auth, async (req, res) => {
    const { user } = getAuthContext(res);
    const asset = await getAssetForUser(ctx.db, user.id, param(req.params.id));

    if (asset.status !== "ready") throw notFound("Asset not found");

    const url = await ctx.storage.presignGet({
      key: asset.objectKey,
      expiresInSeconds: 3_600,
    });

    if (req.query.json === "1") {
      res.json({ url, expiresInSeconds: 3_600 });
      return;
    }

    res.redirect(302, url);
  });

  return router;
}
