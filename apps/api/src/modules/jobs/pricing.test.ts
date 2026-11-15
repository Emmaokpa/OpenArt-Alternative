import { describe, expect, it } from "vitest";
import { calculateUnits } from "./pricing.js";

describe("calculateUnits", () => {
  it("prices video per second", () => {
    expect(calculateUnits("second", { durationS: 5 })).toBe(5);
    expect(calculateUnits("second", {})).toBe(5);
  });

  it("prices captions per minute", () => {
    expect(calculateUnits("minute", { durationS: 60 })).toBe(1);
    expect(calculateUnits("minute", { durationS: 90 })).toBe(1.5);
    expect(calculateUnits("minute", {})).toBe(1);
  });

  it("prices images and fixed calls per request", () => {
    expect(calculateUnits("image", { size: "1024x1024" })).toBe(1);
    expect(calculateUnits("request", {})).toBe(1);
  });

  it("falls back when the duration is invalid", () => {
    expect(calculateUnits("second", { durationS: -3 })).toBe(5);
    expect(calculateUnits("second", { durationS: "abc" })).toBe(5);
  });
});
