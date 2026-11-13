# 04 — Jobs, Queues and Providers

## Queues (BullMQ + Redis)

| Queue | Work | Concurrency (starting) | Where |
|---|---|---|---|
| `provider-jobs` | Submit to providers, wait, download, upload to R2 | 10 (mostly waiting, low CPU) | `worker-io` |
| `media-jobs` | ffmpeg: thumbnails, caption burn-in, input validation | **1** (raise only after measuring) | `worker-media` |
| `maintenance` | Cleanup, sweeper, ledger reconciliation, expiry | 1 | `worker-io` |

Redis config: `appendonly yes`, `maxmemory 512mb`, `maxmemory-policy noeviction` (so queued jobs are never silently dropped). Set `removeOnComplete` to keep the last ~1,000 and `removeOnFail` to 14 days.

## Design choice: database-driven, resumable steps

Do not rely on BullMQ Flows for the pipeline. Each job type has an ordered list of steps. The runner persists each step in `job_steps`, so any crash resumes at the right place.

```ts
async function runJob(jobId: string) {
  const job = await getJob(jobId);
  for (const step of pipelines[job.type]) {
    const row = await getOrCreateStep(job.id, step.kind);
    if (row.status === 'succeeded') continue;

    const result = await step.run({ job, row });
    // result: { done: true, output } | { wait: true, retryInMs } | throws

    if ('wait' in result) {
      await requeueDelayed(job.id, result.retryInMs); // never sleep in a worker
      return;
    }
    await markStepSucceeded(row.id, result.output);
    await updateProgress(job.id);
  }
  await markJobSucceeded(job.id);
}
```

Critical rule: **write `external_id` to the step row immediately after the provider accepts the submission, before waiting.** On restart the step sees an existing `external_id` and resumes polling instead of submitting (and paying) again.

## Waiting for providers

1. Prefer the provider's webhook (`POST /v1/webhooks/providers/:provider`). It marks the step ready and enqueues the job.
2. Always keep a polling fallback: delayed re-enqueue with backoff 5 s → 10 s → 20 s → 30 s cap.
3. Timeouts per capability: image 2 min, video 15 min, lip sync 15 min, STT 10 min. On timeout, fail the step and refund.

## Pipelines

| Job type | Steps |
|---|---|
| `text_to_image` | moderate → submit → wait → store to R2 → thumbnail |
| `text_to_video` | moderate → submit → wait → store to R2 → thumbnail |
| `image_to_video` | validate input → moderate → submit → wait → store → thumbnail |
| `lip_sync` | validate inputs (video or image + audio) → submit → wait → store → thumbnail |
| `captions` | extract audio → transcribe → build SRT/VTT → (optional burn-in) → store |

## Provider adapters

One interface per capability, so any provider can be swapped without touching the pipelines.

```ts
interface AsyncProvider<I, O> {
  id: string;
  estimate(input: I): { costUsdMicros: number; credits: number };
  submit(input: I): Promise<{ externalId: string }>;
  poll(externalId: string): Promise<
    | { status: 'running'; progress?: number }
    | { status: 'succeeded'; output: O }
    | { status: 'failed'; code: string; message: string; retryable: boolean }
  >;
  cancel?(externalId: string): Promise<void>;
  verifyWebhook?(headers: Headers, rawBody: Buffer): boolean;
}

type TextToVideo   = AsyncProvider<{ prompt: string; durationS: number; aspect: string; resolution: string; modelId: string }, { videoUrl: string }>;
type ImageToVideo  = AsyncProvider<{ imageUrl: string; prompt?: string; durationS: number; modelId: string }, { videoUrl: string }>;
type TextToImage   = AsyncProvider<{ prompt: string; size: string; modelId: string }, { imageUrl: string }>;
type LipSync       = AsyncProvider<{ videoUrl?: string; imageUrl?: string; audioUrl: string; modelId: string }, { videoUrl: string }>;
type SpeechToText  = AsyncProvider<{ audioUrl: string }, { words: Word[]; segments: Segment[] }>;
```

Folder: `providers/{fal,assemblyai,fake}/`. Model IDs and prices live in the `models` table, not in code.

## The fake provider (build this first)

- Returns a bundled sample video/image/transcript after a configurable delay.
- Env switches: `FAKE_DELAY_MS`, `FAKE_FAIL_RATE` (random failures), `FAKE_TIMEOUT_RATE`.
- Lets you build and test the whole system, including refunds and restarts, with **$0 spent**.
- `PROVIDER_MODE=fake|real` per capability, so you can go real one tool at a time.

## Failure handling

| Failure | Retry? | User outcome |
|---|---|---|
| Network error, 5xx, rate limit | Yes, 3 attempts with backoff | Transparent |
| Provider rejected content | No | Refund + clear message + moderation strike |
| Provider timeout | No (avoid double-paying) | Refund |
| Invalid user input | No | Refund + message |
| Internal bug | No | Refund + Sentry alert |

Failed jobs stay visible in the admin view with a one-click retry (retry re-spends nothing if no provider call succeeded).

## Cost guardrails

- Daily global spend cap across providers. When hit, new paid jobs are paused and an alert goes out.
- Per-user daily cap and concurrent-job limits (see `02`).
- Every step records `cost_usd_micros`. An admin report shows cost vs credits charged per model, so margin problems are visible within a day.

## Sweepers (maintenance queue, every minute)

- Re-enqueue `queued` jobs missing from Redis.
- Fail `running` jobs with no progress beyond their timeout.
- Expire assets past `expires_at` (delete from R2, mark `deleted`).
- Delete scratch directories older than 2 hours.
- Nightly: reconcile ledger sums against balances.

## Definition of done (Phase 1)

- [ ] Fake provider covers all capabilities
- [ ] Job survives worker restart mid-wait without resubmitting
- [ ] Forced failures refund once
- [ ] bull-board available to admins
- [ ] One real text-to-video model works end to end behind the adapter
