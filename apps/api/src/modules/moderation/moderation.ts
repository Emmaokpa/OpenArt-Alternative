import type { Db } from "../../db/client.js";
import { moderationEvents } from "../../db/schema/ops.js";

/**
 * Phase 1 ships a deliberately small local screen. It catches the cases that
 * must never reach a provider; the real moderation API lands with Phase 2
 * billing and is swapped in behind this function.
 */
const BLOCKED_PATTERNS = [
  /\bcsam\b/i,
  /\bchild\s+(?:sexual|porn)/i,
  /\bunderage\s+(?:nude|naked|sex)/i,
];

export interface ScreenResult {
  allowed: boolean;
  reason?: string;
}

export function screenText(text: string): ScreenResult {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { allowed: false, reason: "The prompt violates the content policy" };
    }
  }
  return { allowed: true };
}

export async function recordModeration(
  db: Db,
  input: {
    userId: string;
    jobId?: string;
    stage: "prompt" | "upload" | "provider";
    result: "allowed" | "rejected";
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  await db.insert(moderationEvents).values({
    userId: input.userId,
    jobId: input.jobId ?? null,
    stage: input.stage,
    result: input.result,
    detail: input.detail ?? null,
  });
}
