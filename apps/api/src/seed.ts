import { createDatabase } from "./db/client.js";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import { models, plans, templates } from "./db/schema/core.js";

/**
 * Idempotent development seed: plans, fake-provider models and the starter
 * template catalog. Safe to run on every deploy; it never deletes rows.
 */
async function main(): Promise<void> {
  const env = loadEnv(process.env);
  const logger = createLogger(env);
  const { pool, db } = createDatabase(env.DATABASE_URL, logger, 5);

  try {
    await db
      .insert(plans)
      .values([
        { id: "starter", name: "Starter", priceUsdCents: 800, monthlyCredits: 800 },
        { id: "creator", name: "Creator", priceUsdCents: 1_500, monthlyCredits: 1_600 },
        { id: "pro", name: "Pro", priceUsdCents: 2_500, monthlyCredits: 2_800 },
        { id: "studio", name: "Studio", priceUsdCents: 10_000, monthlyCredits: 12_500 },
      ])
      .onConflictDoNothing();

    const modelRows = [
      {
        id: "fake-video",
        label: "Fake Video (dev)",
        description: "Text to video placeholder that returns a bundled CC0 clip.",
        capability: "text_to_video",
        provider: "fake",
        providerModel: "fake-video",
        unit: "second",
        costUsdMicrosPerUnit: 0,
        creditsPerUnit: "18",
        minUnits: "1",
        maxUnits: "30",
      },
      {
        id: "fake-image-video",
        label: "Fake Image to Video (dev)",
        description: "Image to video placeholder.",
        capability: "image_to_video",
        provider: "fake",
        providerModel: "fake-image-video",
        unit: "second",
        costUsdMicrosPerUnit: 0,
        creditsPerUnit: "18",
        minUnits: "1",
        maxUnits: "30",
      },
      {
        id: "fake-image",
        label: "Fake Image (dev)",
        description: "Text to image placeholder.",
        capability: "text_to_image",
        provider: "fake",
        providerModel: "fake-image",
        unit: "image",
        costUsdMicrosPerUnit: 0,
        creditsPerUnit: "2",
        minUnits: "1",
        maxUnits: "1",
      },
      {
        id: "fake-lipsync",
        label: "Fake Lip Sync (dev)",
        description: "Lip sync placeholder.",
        capability: "lip_sync",
        provider: "fake",
        providerModel: "fake-lipsync",
        unit: "second",
        costUsdMicrosPerUnit: 0,
        creditsPerUnit: "2.5",
        minUnits: "1",
        maxUnits: "30",
      },
      {
        id: "fake-stt",
        label: "Fake Captions (dev)",
        description: "Speech to text placeholder that returns a fixed transcript.",
        capability: "stt",
        provider: "fake",
        providerModel: "fake-stt",
        unit: "minute",
        costUsdMicrosPerUnit: 0,
        creditsPerUnit: "3",
        minUnits: "1",
        maxUnits: "60",
      },

      // --- fal.ai real providers (Phase 2) -----------------------------------
      // Pricing from https://fal.ai/pricing (Nov 2026).
      // Credit prices follow plan 07: credits = ceil(cost × 2.5 ÷ $0.008),
      // rounded to match the plan's retail credit targets.
      {
        id: "flux-schnell",
        label: "FLUX.1 [schnell]",
        description: "Fast text-to-image model (~$0.003/megapixel).",
        capability: "text_to_image",
        provider: "fal",
        providerModel: "fal-ai/flux/schnell",
        unit: "image",
        costUsdMicrosPerUnit: 3000,
        creditsPerUnit: "2",
        minUnits: "1",
        maxUnits: "1",
      },
      {
        id: "flux-dev",
        label: "FLUX.1 [dev]",
        description: "Quality text-to-image model (~$0.025/megapixel).",
        capability: "text_to_image",
        provider: "fal",
        providerModel: "fal-ai/flux/dev",
        unit: "image",
        costUsdMicrosPerUnit: 25000,
        creditsPerUnit: "8",
        minUnits: "1",
        maxUnits: "1",
      },
      {
        id: "seedance-mini-text-video",
        label: "Seedance 2.0 Mini (text-to-video)",
        description: "Text to video (~$0.06/second).",
        capability: "text_to_video",
        provider: "fal",
        providerModel: "bytedance/seedance-2.0/mini/text-to-video",
        unit: "second",
        costUsdMicrosPerUnit: 60000,
        creditsPerUnit: "18",
        minUnits: "1",
        maxUnits: "30",
      },
      {
        id: "seedance-mini-image-video",
        label: "Seedance 2.0 Mini (image-to-video)",
        description: "Image to video (~$0.06/second).",
        capability: "image_to_video",
        provider: "fal",
        providerModel: "bytedance/seedance-2.0/mini/image-to-video",
        unit: "second",
        costUsdMicrosPerUnit: 60000,
        creditsPerUnit: "18",
        minUnits: "1",
        maxUnits: "30",
      },
    ];

    for (const model of modelRows) {
      await db
        .insert(models)
        .values(model)
        .onConflictDoUpdate({
          target: models.id,
          set: {
            label: model.label,
            description: model.description,
            capability: model.capability,
            provider: model.provider,
            providerModel: model.providerModel,
            unit: model.unit,
            costUsdMicrosPerUnit: model.costUsdMicrosPerUnit,
            creditsPerUnit: model.creditsPerUnit,
            minUnits: model.minUnits,
            maxUnits: model.maxUnits,
            active: true,
            updatedAt: new Date(),
          },
        });
    }

    const templateRows = [
      {
        slug: "cinematic-product",
        title: "Cinematic Product Shot",
        category: "Product",
        capability: "text_to_video",
        promptScaffold: "A cinematic product shot of ",
        defaultModelId: "fake-video",
        defaultParams: { durationS: 5, aspect: "16:9", resolution: "720p" },
        sortOrder: 1,
      },
      {
        slug: "anime-rain",
        title: "Anime Rain Scene",
        category: "Anime",
        capability: "text_to_video",
        promptScaffold: "An anime scene in heavy rain, ",
        defaultModelId: "fake-video",
        defaultParams: { durationS: 5, aspect: "16:9", resolution: "720p" },
        sortOrder: 2,
      },
      {
        slug: "portrait-zoom",
        title: "Portrait Zoom",
        category: "Portrait",
        capability: "image_to_video",
        promptScaffold: "Slow cinematic zoom on the subject",
        defaultModelId: "fake-image-video",
        defaultParams: { durationS: 5, aspect: "9:16", resolution: "720p" },
        sortOrder: 3,
      },
      {
        slug: "sticker-pack",
        title: "Sticker Pack",
        category: "Images",
        capability: "text_to_image",
        promptScaffold: "A cute sticker illustration of ",
        defaultModelId: "fake-image",
        defaultParams: { size: "1024x1024" },
        sortOrder: 4,
      },
      {
        slug: "talking-avatar",
        title: "Talking Avatar",
        category: "Avatar",
        capability: "lip_sync",
        promptScaffold: "Make the uploaded portrait speak the audio naturally",
        defaultModelId: "fake-lipsync",
        defaultParams: { durationS: 10 },
        sortOrder: 5,
      },
      {
        slug: "auto-captions",
        title: "Auto Captions",
        category: "Captions",
        capability: "stt",
        promptScaffold: null,
        defaultModelId: "fake-stt",
        defaultParams: { durationS: 60, burnIn: false },
        sortOrder: 6,
      },
    ];

    for (const template of templateRows) {
      await db
        .insert(templates)
        .values({ ...template, published: true })
        .onConflictDoUpdate({
          target: templates.slug,
          set: {
            title: template.title,
            category: template.category,
            capability: template.capability,
            promptScaffold: template.promptScaffold,
            defaultModelId: template.defaultModelId,
            defaultParams: template.defaultParams,
            sortOrder: template.sortOrder,
            published: true,
          },
        });
    }

    logger.info(
      { models: modelRows.length, templates: templateRows.length },
      "seed complete (plans, models and templates)",
    );
  } finally {
    await pool.end();
  }
}

try {
  await main();
} catch (error) {
  process.stderr.write(`seed failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
