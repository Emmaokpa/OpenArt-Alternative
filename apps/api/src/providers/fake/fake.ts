import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { Capability } from "@app/shared";
import type { Env } from "../../env.js";
import type { Logger } from "../../logger.js";
import {
  ProviderError,
  type ProviderAdapter,
  type ProviderOutput,
} from "../types.js";

const FIXTURES_DIR = fileURLToPath(new URL("../../../fixtures/fake", import.meta.url));

interface FakeExternalId {
  submittedAt: number;
  fail: "submit" | "wait" | null;
  timeout: boolean;
  capability: Capability;
}

/**
 * The free provider used in development and CI. It returns a bundled CC0 clip,
 * PNG or transcript after `FAKE_DELAY_MS`, and can fail or hang on demand so
 * refunds and restart-resume can be tested without spending real money.
 *
 * The external id carries all the state, so a worker restarted mid-wait resumes
 * from the same id without resubmitting.
 */
export function createFakeProvider(
  env: Pick<Env, "FAKE_DELAY_MS" | "FAKE_FAIL_RATE" | "FAKE_TIMEOUT_RATE">,
  logger: Logger,
): ProviderAdapter {
  return {
    id: "fake",

    async submit(input) {
      if (Math.random() < env.FAKE_FAIL_RATE) {
        const fail = Math.random() < 0.5 ? "submit" : "wait";
        if (fail === "submit") {
          logger.warn({ modelId: input.modelId }, "fake provider forcing submit failure");
          throw new ProviderError("PROVIDER_ERROR", "Fake provider refused the request", true);
        }
        return {
          externalId: encode({
            submittedAt: Date.now(),
            fail,
            timeout: false,
            capability: input.capability,
          }),
        };
      }

      const timeout = Math.random() < env.FAKE_TIMEOUT_RATE;
      return {
        externalId: encode({
          submittedAt: Date.now(),
          fail: null,
          timeout,
          capability: input.capability,
        }),
      };
    },

    async poll(externalId) {
      const state = decode(externalId);

      if (state.timeout) {
        return { status: "running", progress: 50 };
      }

      const elapsed = Date.now() - state.submittedAt;
      if (elapsed < env.FAKE_DELAY_MS) {
        return {
          status: "running",
          progress: Math.min(90, Math.round((elapsed / Math.max(env.FAKE_DELAY_MS, 1)) * 90)),
        };
      }

      if (state.fail === "wait") {
        return {
          status: "failed",
          code: "PROVIDER_ERROR",
          message: "Fake provider failed while generating",
          retryable: false,
        };
      }

      return { status: "succeeded", output: outputFor(state.capability) };
    },

    async cancel() {
      // Nothing remote to cancel.
    },

    async openOutput(output) {
      switch (output.url) {
        case "fake://video":
          return createReadStream(`${FIXTURES_DIR}/sample.mp4`);
        case "fake://image":
          return createReadStream(`${FIXTURES_DIR}/sample.png`);
        case "fake://transcript":
          return Readable.from([JSON.stringify(SAMPLE_TRANSCRIPT)]);
        default:
          throw new ProviderError("PROVIDER_ERROR", "Unknown fake output");
      }
    },
  };
}

function outputFor(capability: Capability): ProviderOutput {
  switch (capability) {
    case "text_to_image":
      return { url: "fake://image", kind: "image", mime: "image/png", extension: "png" };
    case "stt":
      return {
        url: "fake://transcript",
        kind: "text",
        mime: "application/json",
        extension: "json",
      };
    case "text_to_video":
    case "image_to_video":
    case "lip_sync":
      return { url: "fake://video", kind: "video", mime: "video/mp4", extension: "mp4" };
  }
}

function encode(state: FakeExternalId): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

function decode(externalId: string): FakeExternalId {
  try {
    const parsed = JSON.parse(
      Buffer.from(externalId, "base64url").toString("utf8"),
    ) as FakeExternalId;
    if (typeof parsed.submittedAt !== "number" || typeof parsed.capability !== "string") {
      throw new Error("bad id");
    }
    return parsed;
  } catch {
    throw new ProviderError("PROVIDER_ERROR", "Invalid fake provider job id");
  }
}

/** Deterministic transcript used by the captions pipeline. */
export const SAMPLE_TRANSCRIPT = {
  text: "This is a fake transcript generated without spending money.",
  segments: [
    { start: 0, end: 2.4, text: "This is a fake transcript" },
    { start: 2.4, end: 5.2, text: "generated without spending money." },
  ],
} as const;

export function sampleTranscriptVtt(): string {
  const stamp = (seconds: number) => {
    const ms = Math.round(seconds * 1000);
    const h = Math.floor(ms / 3_600_000);
    const m = Math.floor((ms % 3_600_000) / 60_000);
    const s = Math.floor((ms % 60_000) / 1000);
    const rest = ms % 1000;
    const pad = (value: number, width = 2) => String(value).padStart(width, "0");
    return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(rest, 3)}`;
  };

  return [
    "WEBVTT",
    "",
    ...SAMPLE_TRANSCRIPT.segments.flatMap((segment, index) => [
      String(index + 1),
      `${stamp(segment.start)} --> ${stamp(segment.end)}`,
      segment.text,
      "",
    ]),
  ].join("\n");
}
