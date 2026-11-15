import type { Env } from "../env.js";
import type { Logger } from "../logger.js";
import type { ModelRecord } from "../modules/catalog/catalog.js";
import { createFakeProvider } from "./fake/fake.js";
import { ProviderError, type ProviderAdapter } from "./types.js";

export interface ProviderRegistry {
  forModel(model: ModelRecord): ProviderAdapter;
  forProvider(providerId: string): ProviderAdapter;
}

/**
 * Phase 1 ships only the fake adapter. Real adapters (fal.ai, AssemblyAI) plug
 * in here in Phases 2 and 4 without touching the pipeline.
 */
export function createProviderRegistry(env: Env, logger: Logger): ProviderRegistry {
  const adapters = new Map<string, ProviderAdapter>([["fake", createFakeProvider(env, logger)]]);

  return {
    forModel(model) {
      return this.forProvider(model.provider);
    },
    forProvider(providerId) {
      const adapter = adapters.get(providerId);
      if (adapter) return adapter;

      throw new ProviderError(
        "PROVIDER_ERROR",
        env.PROVIDER_MODE === "fake"
          ? "Real providers are disabled; set PROVIDER_MODE=real and deploy an adapter"
          : `No adapter registered for provider ${providerId}`,
      );
    },
  };
}
