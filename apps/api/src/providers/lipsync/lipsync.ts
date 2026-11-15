import type { Readable } from "node:stream";
import type { Env } from "../../env.js";
import type { Logger } from "../../logger.js";
import {
  ProviderError,
  type ProviderAdapter,
  type ProviderOutput,
} from "../types.js";

/**
 * fal.ai lip sync adapter.
 *
 * Submits a video + audio pair to a fal.ai lip sync endpoint and polls for
 * the synced video result.
 *
 * fal REST API (https://docs.fal.ai/rest-api):
 *   POST   https://fal.run/fal-ai/{endpoint}   → { request_id } or direct result
 *   GET    https://queue.fal.run/fal-ai/{endpoint}/requests/{request_id}
 *          → { status, output?: { video?: { url } }, error? }
 */
export function createLipSyncAdapter(
  env: Pick<Env, "FAL_KEY" | "FAL_BASE_URL">,
  logger: Logger,
): ProviderAdapter {
  const baseUrl = env.FAL_BASE_URL.replace(/\/$/, "");

  async function falRequest(path: string, init: RequestInit): Promise<Response> {
    if (!env.FAL_KEY) {
      throw new ProviderError(
        "PROVIDER_ERROR",
        "FAL_KEY is not configured",
        false,
      );
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Key ${env.FAL_KEY}`,
        ...init.headers,
      },
    });
    return response;
  }

  function parseFalOutput(
    raw: Record<string, unknown>,
  ): ProviderOutput | null {
    const findUrl = (obj: unknown): string | null => {
      if (typeof obj !== "object" || obj === null) return null;
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        if (key === "url" && typeof value === "string") return value;
        const found = findUrl(value);
        if (found) return found;
      }
      return null;
    };

    const url = findUrl(raw);
    if (!url) return null;

    const extension = url.split(".").pop()?.split("?")[0] ?? "";
    const mime =
      extension === "mp4" ? "video/mp4" : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "application/octet-stream";

    return { url, kind: "video", mime, extension };
  }

  return {
    id: "lipsync",

    async submit(input) {
      const endpoint = input.providerModel;
      const videoUrl = input.params.videoUrl as string | undefined;
      const audioUrl = input.params.audioUrl as string | undefined;
      const imageUrl = input.params.imageUrl as string | undefined;

      if (!videoUrl && !imageUrl) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          "No video or image URL provided for lip sync",
          false,
        );
      }
      if (!audioUrl) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          "No audio URL provided for lip sync",
          false,
        );
      }

      logger.info({ modelId: input.modelId, providerModel: endpoint }, "fal lipsync submit");

      const response = await falRequest(`/fal-ai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            ...(videoUrl ? { video_url: videoUrl } : {}),
            ...(imageUrl ? { image_url: imageUrl } : {}),
            audio_url: audioUrl,
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn(
          { status: response.status, body, modelId: input.modelId },
          "fal lipsync submit rejected",
        );
        throw new ProviderError(
          "PROVIDER_ERROR",
          `fal.ai lip sync submission failed (${response.status})`,
          true,
        );
      }

      const json = (await response.json()) as Record<string, unknown>;

      if (typeof json.request_id === "string" && json.request_id.length > 0) {
        return { externalId: json.request_id };
      }

      // Synchronous result
      const output = parseFalOutput(json);
      if (output) {
        const externalId = `fal:inline:${Buffer.from(JSON.stringify(output)).toString("base64url")}`;
        return { externalId };
      }

      throw new ProviderError(
        "PROVIDER_ERROR",
        "fal.ai returned an unrecognised response",
        true,
      );
    },

    async poll(externalId) {
      if (externalId.startsWith("fal:inline:")) {
        const encoded = externalId.slice("fal:inline:".length);
        const decoded = Buffer.from(encoded, "base64url").toString("utf8");
        const output = JSON.parse(decoded) as ProviderOutput;
        return { status: "succeeded", output };
      }

      const parts = externalId.split(":");
      if (parts.length !== 3 || parts[0] !== "fal") {
        throw new ProviderError("PROVIDER_ERROR", "Invalid fal.ai job id", false);
      }

      const [, endpoint, requestId] = parts;
      if (!endpoint || !requestId) {
        throw new ProviderError("PROVIDER_ERROR", "Invalid fal.ai job id", false);
      }

      const response = await falRequest(
        `/fal-ai/${endpoint}/requests/${requestId}`,
        { method: "GET" },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn(
          { status: response.status, requestId, endpoint, body },
          "fal lipsync poll rejected",
        );
        throw new ProviderError(
          "PROVIDER_ERROR",
          `fal.ai poll failed (${response.status})`,
          true,
        );
      }

      const json = (await response.json()) as {
        status?: string;
        output?: Record<string, unknown>;
        error?: { code?: string; message?: string };
      };

      switch (json.status) {
        case "queued":
        case "in_progress":
          return {
            status: "running",
            progress: json.output ? 50 : undefined,
          };
        case "completed": {
          const output = json.output ? parseFalOutput(json.output) : null;
          if (!output) {
            throw new ProviderError(
              "PROVIDER_ERROR",
              "fal.ai completed but no output URL found",
              false,
            );
          }
          return { status: "succeeded", output };
        }
        case "failed": {
          const message = json.error?.message ?? "fal.ai job failed";
          const code = json.error?.code ?? "PROVIDER_ERROR";
          const retryable = code.includes("rate_limit") || code.includes("queue");
          throw new ProviderError(code, message, retryable);
        }
        default:
          throw new ProviderError(
            "PROVIDER_ERROR",
            `Unknown fal.ai status: ${json.status ?? "null"}`,
            false,
          );
      }
    },

    async cancel() {
      // fal.ai does not expose a public cancel endpoint.
    },

    async openOutput(output) {
      const response = await fetch(output.url, {
        headers: { Accept: output.mime },
      });

      if (!response.ok || !response.body) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          `Could not fetch fal.ai output (${response.status})`,
          false,
        );
      }

      return response.body as unknown as Readable;
    },
  };
}
