import { describe, expect, it } from "vitest";
import { isAppError } from "../../lib/errors.js";
import { UPLOAD_LIMITS, validateUploadedObject, validateUploadRequest } from "./limits.js";

function expectBadRequest(fn: () => void): void {
  try {
    fn();
  } catch (error) {
    expect(isAppError(error) && error.status === 400).toBe(true);
    return;
  }
  throw new Error("expected a bad request");
}

describe("validateUploadRequest", () => {
  it("accepts the launch formats", () => {
    expect(() =>
      validateUploadRequest({ kind: "video", mime: "video/mp4", sizeBytes: 1024 }),
    ).not.toThrow();
    expect(() =>
      validateUploadRequest({ kind: "image", mime: "image/png", sizeBytes: 1024 }),
    ).not.toThrow();
    expect(() =>
      validateUploadRequest({ kind: "audio", mime: "audio/mpeg", sizeBytes: 1024 }),
    ).not.toThrow();
  });

  it("rejects an unsupported mime type", () => {
    expectBadRequest(() =>
      validateUploadRequest({ kind: "video", mime: "video/x-msvideo", sizeBytes: 1024 }),
    );
  });

  it("rejects oversized and empty files", () => {
    expectBadRequest(() =>
      validateUploadRequest({
        kind: "image",
        mime: "image/png",
        sizeBytes: UPLOAD_LIMITS.image.maxBytes + 1,
      }),
    );
    expectBadRequest(() => validateUploadRequest({ kind: "image", mime: "image/png", sizeBytes: 0 }));
  });

  it("allows a five-minute video but not a longer one", () => {
    expect(() =>
      validateUploadedObject({ kind: "video", sizeBytes: 1, durationMs: 5 * 60 * 1_000 }),
    ).not.toThrow();
    expectBadRequest(() =>
      validateUploadedObject({ kind: "video", sizeBytes: 1, durationMs: 5 * 60 * 1_000 + 1 }),
    );
  });
});
