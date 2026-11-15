import type { Env } from "../../env.js";
import type { Logger } from "../../logger.js";
import {
  ProviderError,
  type ProviderAdapter,
  type ProviderOutput,
} from "../types.js";

/**
 * AssemblyAI speech-to-text adapter.
 *
 * AssemblyAI API (https://www.assemblyai.com/docs):
 *   POST   https://api.assemblyai.com/v2/transcript   → { id, ... }
 *   GET    https://api.assemblyai.com/v2/transcript/{id} → { status, text, words, utterances, error }
 *
 * Submits an audio URL for transcription, polls for completion, and returns
 * a transcript with word-level timestamps for VTT generation.
 */
export function createAssemblyAIAdapter(
  env: Pick<Env, "ASSEMBLYAI_API_KEY" | "ASSEMBLYAI_BASE_URL">,
  logger: Logger,
): ProviderAdapter {
  const baseUrl = env.ASSEMBLYAI_BASE_URL.replace(/\/$/, "");

  async function assemblyAIRequest(path: string, init: RequestInit): Promise<Response> {
    if (!env.ASSEMBLYAI_API_KEY) {
      throw new ProviderError(
        "PROVIDER_ERROR",
        "ASSEMBLYAI_API_KEY is not configured",
        false,
      );
    }
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: env.ASSEMBLYAI_API_KEY,
        ...init.headers,
      },
    });
    return response;
  }

  return {
    id: "assemblyai",

    async submit(input) {
      const audioUrl = input.params.audioUrl as string | undefined;
      if (!audioUrl) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          "No audio URL provided for transcription",
          false,
        );
      }

      logger.info({ modelId: input.modelId }, "AssemblyAI submit transcript");

      const response = await assemblyAIRequest("/v2/transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: audioUrl,
          speaker_labels: false,
          auto_chapters: false,
          entity_detection: false,
          sentiment_analysis: false,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn(
          { status: response.status, body, modelId: input.modelId },
          "AssemblyAI submit rejected",
        );
        throw new ProviderError(
          "PROVIDER_ERROR",
          `AssemblyAI submission failed (${response.status})`,
          true,
        );
      }

      const json = (await response.json()) as { id?: string; error?: string };

      if (json.error) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          `AssemblyAI submission error: ${json.error}`,
          false,
        );
      }

      if (!json.id) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          "AssemblyAI returned no transcript id",
          true,
        );
      }

      return { externalId: json.id };
    },

    async poll(externalId) {
      const response = await assemblyAIRequest(`/v2/transcript/${externalId}`, {
        method: "GET",
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.warn(
          { status: response.status, body, externalId },
          "AssemblyAI poll rejected",
        );
        throw new ProviderError(
          "PROVIDER_ERROR",
          `AssemblyAI poll failed (${response.status})`,
          true,
        );
      }

      const json = (await response.json()) as {
        status: string;
        text?: string;
        words?: Array<{ start: number; end: number; text: string }>;
        utterances?: Array<{ start: number; end: number; text: string }>;
        error?: string;
      };

      if (json.error) {
        throw new ProviderError(
          "PROVIDER_ERROR",
          `AssemblyAI transcription error: ${json.error}`,
          false,
        );
      }

      if (json.status === "queued" || json.status === "processing") {
        return {
          status: "running",
          progress: json.status === "processing" ? 50 : 10,
        };
      }

      if (json.status === "completed") {
        const segments =
          json.words?.map((w) => ({
            start: w.start / 1000,
            end: w.end / 1000,
            text: w.text,
          })) || [];

        const transcript = {
          text: json.text || "",
          segments,
        };

        return {
          status: "succeeded",
          output: {
            url: "",
            kind: "text",
            mime: "application/json",
            extension: "json",
            providerOutput: transcript,
          },
        };
      }

      if (json.status === "error") {
        throw new ProviderError(
          "PROVIDER_ERROR",
          `AssemblyAI transcription failed: ${json.error || "unknown error"}`,
          false,
        );
      }

      throw new ProviderError(
        "PROVIDER_ERROR",
        `Unknown AssemblyAI status: ${json.status ?? "null"}`,
        false,
      );
    },

    async cancel() {
      // AssemblyAI doesn't have a cancel endpoint in the public API.
      // A canceled job will simply stop being polled.
    },

    async openOutput(_output: ProviderOutput) {
      // AssemblyAI returns JSON text, not a media URL. The transcript is
      // already in providerOutput, so this should not be called for STT.
      throw new ProviderError(
        "PROVIDER_ERROR",
        "AssemblyAI does not support openOutput for text transcripts",
        false,
      );
    },
  };
}
