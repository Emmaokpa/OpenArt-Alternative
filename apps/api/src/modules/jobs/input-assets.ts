import { and, eq, inArray, ne } from "drizzle-orm";
import type { AssetKind, JobType } from "@app/shared";
import type { Db } from "../../db/client.js";
import { assets } from "../../db/schema/core.js";
import { badRequest } from "../../lib/errors.js";

export interface AssetRequirement {
  id: string;
  label: string;
  kinds: AssetKind[];
}

/** Which uploaded assets a job type needs, and what each one must be. */
export function inputAssetRequirements(
  type: JobType,
  params: Record<string, unknown>,
): AssetRequirement[] {
  const read = (key: string): string | null => {
    const value = params[key];
    return typeof value === "string" && value.length > 0 ? value : null;
  };

  switch (type) {
    case "image_to_video": {
      const id = read("inputAssetId");
      return id ? [{ id, label: "Input image", kinds: ["image"] }] : [];
    }
    case "lip_sync": {
      const requirements: AssetRequirement[] = [];
      const video = read("inputVideoAssetId");
      const image = read("inputImageAssetId");
      const audio = read("audioAssetId");
      if (video) requirements.push({ id: video, label: "Input video", kinds: ["video"] });
      if (image) requirements.push({ id: image, label: "Input image", kinds: ["image"] });
      if (audio) requirements.push({ id: audio, label: "Audio track", kinds: ["audio"] });
      return requirements;
    }
    case "captions": {
      const id = read("inputAssetId");
      return id ? [{ id, label: "Input media", kinds: ["video", "audio"] }] : [];
    }
    case "text_to_video":
    case "text_to_image":
      return [];
  }
}

/**
 * Rejects a job before credits are spent when an input is missing, still
 * uploading, expired or the wrong type.
 */
export async function assertInputAssets(
  db: Db,
  userId: string,
  type: JobType,
  params: Record<string, unknown>,
): Promise<void> {
  const requirements = inputAssetRequirements(type, params);
  if (requirements.length === 0) return;

  const rows = await db
    .select()
    .from(assets)
    .where(
      and(
        inArray(
          assets.id,
          requirements.map((requirement) => requirement.id),
        ),
        eq(assets.userId, userId),
        ne(assets.status, "deleted"),
      ),
    );

  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const requirement of requirements) {
    const asset = byId.get(requirement.id);
    if (!asset) throw badRequest(`${requirement.label} was not found`);
    if (asset.status !== "ready") throw badRequest(`${requirement.label} is still uploading`);
    if (asset.expiresAt && asset.expiresAt.getTime() < Date.now()) {
      throw badRequest(`${requirement.label} has expired; upload it again`);
    }
    if (!requirement.kinds.includes(asset.kind as AssetKind)) {
      throw badRequest(`${requirement.label} has the wrong file type`);
    }
  }
}
