import type { Readable } from "node:stream";
import type { Env } from "../../env.js";
import type { Logger } from "../../logger.js";
import {
  ProviderError,
  type ProviderAdapter,
  type ProviderOutput,
} from "../types.js";

/**
 * fal.ai provider adapter.
 *
 * fal REST API (https://docs.fal.ai/rest-api):
 *   POST   https://fal.run/fal-ai/{endpoint}        → { request_id } or direct result
 *   GET    https://queue.fal.run/fal-ai/{endpoint}/requests/{request_id}
 *          → { status: "queued"|"in_progress"|"completed"|"failed",
 *              output?: { image?: { url }, video?: { url }, ... },
 *              error?: { code, message } }
 *
 * The `external_id` encodes the endpoint + request_id so `poll` can
 * reconstruct the polling URL without extra state:
 *   `fal:{endpoint}:{request_id}`   — async job, poll the request
 *   `fal:inline:{base64url(json)}`  — synchronous result, already complete
 *
 * Results are streamed from fal's CDN URLs via `openOutput`, so we never
 * buffer a whole video in memory.
 */
export function createFalProvider(
  env: Pick<Env, "FAL_KEY" | "FAL_BASE_URL">,
  logger: Logger,
): ProviderAdapter {
  if (!env.FAL_KEY) {
    throw new ProviderError("PROVIDER_ERROR", "FAL_KEY is not configured", false);
  }

  const baseUrl = env.FAL_BASE_URL.replace(/\/$/, "");

  async function falRequest(path: string, init: RequestInit): Promise<Response> {
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
    endpoint: string,
    raw: Record<string, unknown>,
  ): ProviderOutput | null {
    // fal wraps output differently per endpoint. Look for any URL field.
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

    // Guess kind/mime from the endpoint and URL extension.
    const kind =
      endpoint.includes("image-to-video") || endpoint.includes("text-to-video")
        ? "video"
        : endpoint.includes("image") || endpoint.includes("text-to-image")
          ? "image"
          : "image";

    const extension = url.split(".").pop()?.split("?")[0] ?? "";
    const mime =
      extension === "mp4" ? "video/mp4" : extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "application/octet-stream";

    return { url, kind, mime, extension };
  }

  return {
    id: "fal",

    async submit(input) {
      const endpoint = input.providerModel;
      const url = `/fal-ai/${endpoint}`;

      logger.info({ modelId: input.modelId, providerModel: endpoint }, "fal submit");

      const response = await falRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.params }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn(
          { status: response.status, body, modelId: input.modelId },
          "fal submit rejected",
        );
        throw new ProviderError(
          "PROVIDER_ERROR",
          `fal.ai submission failed (${response.status})`,
          true,
        );
      }

      const json = (await response.json()) as Record<string, unknown>;

      // Async job: fal returns a request_id.
      if (typeof json.request_id === "string" && json.request_id.length > 0) {
        const externalId = `fal:${endpoint}:${json.request_id}`;
        return { externalId };
      }

      // Synchronous result: fal returned the output directly. Encode it so
      // poll can return it immediately.
      const output = parseFalOutput(endpoint, json);
      if (output) {
        const externalId = `fal:inline:${Buffer.from(JSON.stringify(output)).toString("base64url")}`;
        return { externalId };
      }

      // No usable output: treat as a failure so the runner retries/refunds.
      throw new ProviderError(
        "PROVIDER_ERROR",
        "fal.ai returned an unrecognised response",
        true,
      );
    },

    async poll(externalId) {
      // Synchronous result already encoded in the external id.
      if (externalId.startsWith("fal:inline:")) {
        const encoded = externalId.slice("fal:inline:".length);
        const decoded = Buffer.from(encoded, "base64url").toString("utf8");
        const output = JSON.parse(decoded) as ProviderOutput;
        return { status: "succeeded", output };
      }

      // Async job: parse `fal:{endpoint}:{request_id}`.
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
          "fal poll rejected",
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
          const output = json.output ? parseFalOutput(endpoint, json.output) : null;
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
          // fal transient errors (queue full, rate limit) are retryable.
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
      // fal.ai does not expose a public cancel endpoint. A canceled job is
      // simply no longer polled by our runner; fal will discard it after its
      // own TTL.
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
