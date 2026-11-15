import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/** Root for ffmpeg scratch files. Cleaned on boot and by the sweeper. */
export function scratchRoot(): string {
  return join(tmpdir(), "openart-work");
}

/**
 * Runs `work` in a fresh directory and removes it in `finally`, so a crashed
 * or failed job never leaves a large video behind on the small VPS disk.
 */
export async function withScratch<T>(work: (dir: string) => Promise<T>): Promise<T> {
  const dir = join(scratchRoot(), randomUUID());
  await mkdir(dir, { recursive: true });

  try {
    return await work(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Deletes scratch directories older than `maxAgeMs`. Best effort. */
export async function cleanScratch(maxAgeMs: number): Promise<number> {
  const { readdir, stat } = await import("node:fs/promises");
  const root = scratchRoot();
  let removed = 0;

  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return 0;
  }

  const cutoff = Date.now() - maxAgeMs;
  for (const entry of entries) {
    const path = join(root, entry);
    try {
      const info = await stat(path);
      if (info.mtimeMs < cutoff) {
        await rm(path, { recursive: true, force: true });
        removed += 1;
      }
    } catch {
      // Another worker may have removed it already.
    }
  }

  return removed;
}
