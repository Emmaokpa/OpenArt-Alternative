import type { PricingUnit } from "@app/shared";
import { AppError } from "../../lib/errors.js";
import { calculateCredits } from "../credits/credits.js";
import type { ModelRecord } from "../catalog/catalog.js";

/**
 * How many billable units a request consumes. Video is priced per second,
 * images per image, captions per minute and fixed-price calls per request.
 */
export function calculateUnits(unit: PricingUnit, params: Record<string, unknown>): number {
  switch (unit) {
    case "second": {
      const duration = toNumber(params.durationS, 5);
      return duration;
    }
    case "minute": {
      const duration = toNumber(params.durationS, 60);
      return duration / 60;
    }
    case "image":
      return 1;
    case "request":
      return 1;
  }
}

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export interface QuoteBreakdown {
  unit: PricingUnit;
  units: number;
  credits: number;
}

export function quoteFromModel(
  model: ModelRecord,
  params: Record<string, unknown>,
): QuoteBreakdown {
  const unit = model.unit as PricingUnit;
  const rawUnits = calculateUnits(unit, params);

  const result = calculateCredits({
    creditsPerUnit: model.creditsPerUnit,
    units: rawUnits,
    minUnits: model.minUnits,
    maxUnits: model.maxUnits,
  });

  if (!Number.isFinite(result.credits) || result.credits < 1) {
    throw new AppError(500, "INTERNAL", "Credit price calculation failed");
  }

  return { unit, units: result.units, credits: result.credits };
}
