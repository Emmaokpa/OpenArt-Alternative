import { createWriteStream } from "node:fs";
import { Transform } from "node:stream";
import type { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "../env.js";
import type { Logger } from "../logger.js";

export interface StoredObject {
  contentLength?: number;
  contentType?: string;
}

export interface PutStreamResult {
  bytes: number;
}

export interface Storage {
  readonly privateBucket: string;
  presignPut(input: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
  }): Promise<string>;
  presignGet(input: { key: string; expiresInSeconds?: number }): Promise<string>;
  head(key: string): Promise<StoredObject | null>;
  putStream(input: {
    key: string;
    body: Readable;
    contentType: string;
  }): Promise<PutStreamResult>;
  putText(input: { key: string; body: string; contentType: string }): Promise<void>;
  downloadToFile(key: string, path: string): Promise<void>;
  delete(key: string): Promise<void>;
}

type StorageEnv = Pick<
  Env,
  | "S3_ENDPOINT"
  | "S3_REGION"
  | "S3_ACCESS_KEY_ID"
  | "S3_SECRET_ACCESS_KEY"
  | "S3_BUCKET_PRIVATE"
  | "S3_BUCKET_PUBLIC"
  | "S3_FORCE_PATH_STYLE"
  | "NODE_ENV"
>;

/**
 * One S3 client for R2 and the local S3-compatible container. Local
 * development points at LocalStack; production points at R2.
 */
export function createStorage(env: StorageEnv, logger: Logger): Storage {
  // LocalStack accepts any credentials; production env validation requires
  // real R2 keys, so these placeholders never reach production.
  const accessKeyId = env.S3_ACCESS_KEY_ID ?? "test";
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY ?? "test";

  const client = new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
  });

  const bucket = env.S3_BUCKET_PRIVATE;

  return {
    privateBucket: bucket,

    async presignPut({ key, contentType, expiresInSeconds = 3_600 }) {
      return getSignedUrl(
        client,
        new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
        { expiresIn: expiresInSeconds },
      );
    },

    async presignGet({ key, expiresInSeconds = 3_600 }) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
        expiresIn: expiresInSeconds,
      });
    },

    async head(key) {
      try {
        const response = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        return { contentLength: response.ContentLength, contentType: response.ContentType };
      } catch (error) {
        if (isMissingObject(error)) return null;
        throw error;
      }
    },

    async putStream({ key, body, contentType }) {
      let bytes = 0;
      const counter = new Transform({
        transform(chunk: Buffer, _encoding, callback) {
          bytes += chunk.length;
          callback(null, chunk);
        },
      });

      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: body.pipe(counter),
          ContentType: contentType,
        },
      });

      await upload.done();
      logger.debug({ key, bytes }, "object uploaded");
      return { bytes };
    },

    async putText({ key, body, contentType }) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    },

    async downloadToFile(key, path) {
      const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!response.Body) throw new Error("Object has no body");
      await pipeline(response.Body as Readable, createWriteStream(path));
    },

    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}

function isMissingObject(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.name === "NotFound" ||
    candidate.name === "NoSuchKey" ||
    candidate.$metadata?.httpStatusCode === 404
  );
}
