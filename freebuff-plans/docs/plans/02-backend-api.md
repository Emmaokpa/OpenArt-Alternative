# 02 — Backend API (Express + TypeScript)

## Stack

Express, TypeScript (strict), Zod (validation), Pino (logging), Helmet, Better Auth, Drizzle ORM (lighter than Prisma on a small box; Prisma is also fine), BullMQ, `@aws-sdk/client-s3` (R2).

## Folder structure

```
apps/api/src/
├─ server.ts             API entrypoint
├─ worker-io.ts          queue worker entrypoint (provider calls)
├─ worker-media.ts       queue worker entrypoint (ffmpeg)
├─ config/env.ts         Zod-validated environment
├─ middleware/           requestId, auth, rateLimit, validate, errorHandler
├─ modules/
│  ├─ auth/              Better Auth mount
│  ├─ credits/           ledger service, quotes
│  ├─ jobs/              create/list/get/cancel, SSE
│  ├─ assets/            presigned uploads, signed downloads
│  ├─ templates/
│  ├─ models/            model catalog and prices
│  ├─ billing/           checkout, payment webhooks
│  └─ admin/
├─ providers/            adapters (see 04)
├─ queue/                queues, pipelines (see 04)
└─ lib/                  r2.ts, ffmpeg.ts, logger.ts, errors.ts
```

## Endpoints (v1)

All under `/v1`. Responses are JSON. Auth uses cookies for web and bearer tokens for mobile (verify Better Auth's bearer/Expo support in its docs).

| Method | Path | Purpose |
|---|---|---|
| GET | `/me` | Profile, plan, credit balance |
| GET | `/models` | Available models with credit prices |
| POST | `/quotes` | Cost estimate for given params |
| POST | `/uploads/presign` | Get presigned PUT (or multipart) for an input file |
| POST | `/uploads/complete` | Confirm upload, run validation |
| POST | `/jobs` | Create a job (all tool types). Requires `Idempotency-Key` header |
| GET | `/jobs` | List my jobs (cursor pagination) |
| GET | `/jobs/:id` | Job detail with steps |
| GET | `/jobs/:id/events` | Server-Sent Events: progress |
| POST | `/jobs/:id/cancel` | Cancel (refund if not started) |
| DELETE | `/jobs/:id` | Delete job and its assets |
| GET | `/templates`, `/templates/:slug` | Template catalog |
| POST | `/billing/checkout` | Start a purchase |
| POST | `/webhooks/payments/:provider` | Payment webhook (signature verified) |
| POST | `/webhooks/providers/:provider` | Provider job-complete webhook |
| GET | `/healthz` | Liveness and DB/Redis check |

Admin (role `admin`) under `/v1/admin`: templates CRUD, users, manual credit adjustments (always written to the ledger with a note), failed-job retry, model price editor.

## Creating a job (the critical path)

```
POST /v1/jobs
 1. Validate body with Zod (type-specific params schema)
 2. Moderation check on prompt/inputs (see the Moderation section below)
 3. Quote cost from models table
 4. BEGIN transaction
      - If Idempotency-Key already seen → return the existing job
      - SELECT balance FROM credit_accounts WHERE user_id=$1 FOR UPDATE
      - If balance < cost → 402 INSUFFICIENT_CREDITS
      - INSERT credit_ledger (spend, -cost, job_id)
      - UPDATE credit_accounts SET balance = balance - cost
      - INSERT jobs (status='queued')
    COMMIT
 5. Enqueue BullMQ job with jobId = job.id  (a sweeper re-enqueues any 'queued' job with no queue entry)
 6. Return 202 { id, status: 'queued' }
```

Refund on failure: insert one `refund` ledger row (a unique index on `job_id` where `type='refund'` prevents double refunds) and add the credits back, in one transaction.

## Auth

- Better Auth mounted at `/api/auth/*`: email + password, Google login, email verification, password reset (Resend).
- Turnstile token required on signup and password reset.
- Roles in `profiles.role`: `user`, `admin`.
- Sessions: cookie sessions for web; bearer token for Expo.

## Error format

```json
{ "error": { "code": "INSUFFICIENT_CREDITS", "message": "Not enough credits.", "requestId": "..." } }
```

Stable codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `INSUFFICIENT_CREDITS`, `RATE_LIMITED`, `CONTENT_REJECTED`, `PROVIDER_ERROR`, `INTERNAL`.

## Rate limits (Redis-backed)

| Scope | Limit (starting values) |
|---|---|
| Auth endpoints | 10/min per IP |
| `POST /jobs` | 10/min per user |
| Concurrent running jobs | Starter 2, Creator 3, Pro 4, Studio 6 |
| Uploads | 20/hour per user |
| Webhooks | Signature check first, then idempotent processing |

## Idempotency

- Clients send `Idempotency-Key` on `POST /jobs` and `POST /billing/checkout`.
- Payment and provider webhooks are stored in `webhook_events (provider, event_id)` before processing, so replays are ignored.

## Moderation

- Screen text prompts before spending credits (a moderation API, or a cheap LLM check). Verify current free options before choosing.
- Screen uploaded images where the provider does not.
- Log every rejection in `moderation_events`. Repeated violations suspend the account.
- Provider-side rejections also refund the job and count toward the user's strike total.

## Definition of done (Phase 1)

- [ ] Signup, login, verification email work
- [ ] `POST /jobs` with the fake provider produces a video in R2
- [ ] Insufficient credits returns 402 and writes nothing
- [ ] A forced failure refunds exactly once
- [ ] Replaying the same `Idempotency-Key` creates one job
- [ ] Killing the worker mid-job and restarting it resumes without resubmitting to the provider
