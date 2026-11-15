import type { Readable } from "node:stream";
import type { Storage } from "../lib/storage.js";

export interface MemoryStorage extends Storage {
  readonly objects: Map<string, { body: Buffer; contentType: string }>;
  putCount(key: string): number;
}

/**
 * In-memory Storage used by unit and pipeline tests. It implements the same
 * interface as the S3 client, so tests never need a container or network.
 */
export function createMemoryStorage(): MemoryStorage {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const puts = new Map<string, number>();

  async function collect(body: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of body) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
    }
    return Buffer.concat(chunks);
  }

  return {
    privateBucket: "test-private",
    objects,
    putCount: (key) => puts.get(key) ?? 0,

    async presignPut({ key }) {
      return `memory://put/${key}`;
    },

    async presignGet({ key }) {
      return `memory://get/${key}`;
    },

    async head(key) {
      const object = objects.get(key);
      if (!object) return null;
      return { contentLength: object.body.length, contentType: object.contentType };
    },

    async putStream({ key, body, contentType }) {
      const collected = await collect(body);
      objects.set(key, { body: collected, contentType });
      puts.set(key, (puts.get(key) ?? 0) + 1);
      return { bytes: collected.length };
    },

    async putText({ key, body, contentType }) {
      objects.set(key, { body: Buffer.from(body, "utf8"), contentType });
      puts.set(key, (puts.get(key) ?? 0) + 1);
    },

    async downloadToFile(key, path) {
      const object = objects.get(key);
      if (!object) throw new Error(`missing object ${key}`);
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path, object.body);
    },

    async delete(key) {
      objects.delete(key);
    },
  };
}
