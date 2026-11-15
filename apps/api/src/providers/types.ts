import type { Readable } from "node:stream";
import type { AssetKind, Capability } from "@app/shared";

export interface ProviderOutput {
  /** Opaque URL. The fake provider uses `fake://...`; real adapters use https. */
  url: string;
  kind: AssetKind;
  mime: string;
  extension: string;
}

export interface ProviderJobInput {
  capability: Capability;
  modelId: string;
  providerModel: string;
  params: Record<string, unknown>;
}

export type PollResult =
  | { status: "running"; progress?: number }
  | { status: "succeeded"; output: ProviderOutput }
  | { status: "failed"; code: string; message: string; retryable: boolean };

export interface ProviderAdapter {
  readonly id: string;
  submit(input: ProviderJobInput): Promise<{ externalId: string }>;
  poll(externalId: string): Promise<PollResult>;
  cancel(externalId: string): Promise<void>;
  /** Streams a provider result. Never buffer a whole video in memory. */
  openOutput(output: ProviderOutput): Promise<Readable>;
}

export class ProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.code = code;
    this.retryable = retryable;
  }
}
