# Complete Project Plan (single file)

> **ASL Studio is on hold** and intentionally excluded from this file. It lives in `99-asl-ON-HOLD.md` and is built last (Phase 8). Do not build it now.

> Cross-references like `04` or `05` mean the matching part below.

## Contents

1. Part 1: `00-START-HERE.md`
2. Part 2: `phase.md`
3. Part 3: `01-architecture-and-vps.md`
4. Part 4: `02-backend-api.md`
5. Part 5: `03-database.md`
6. Part 6: `04-jobs-and-providers.md`
7. Part 7: `05-storage-and-cloudflare.md`
8. Part 8: `06-frontend-web.md`
9. Part 9: `07-credits-pricing-payments.md`



---

<!-- PART 1: 00-START-HERE.md -->

# START HERE — Project Plans

**Product:** AI video generator in the style of OpenArt / Kling: a big prompt box, template and style examples underneath, and a library of creations. Niche to be decided with the client.
**Hosting:** one VPS (8 GB RAM / 100 GB SSD, Coolify) for API, database and queue. Cloudflare for the web app, file storage, DNS and bot protection.

## For the human: how to use this pack

1. Copy this whole folder into your repo as `docs/plans/`.
2. Paste the **starter prompt** (bottom of this file) into your AI tool (Freebuff).
3. After each phase: review the work, test it, then paste the **next-phase prompt**.
4. **ASL is on hold.** Do not give the AI `99-asl-ON-HOLD.md` until you decide to start Phase 8. (It is already excluded from `ALL-PLANS-COMBINED.md`.)
5. If your tool supports a project-instructions or rules file, point it at `docs/plans/00-START-HERE.md`.

## Reading order for the AI

1. `00-START-HERE.md` (this file)
2. `phase.md` — the rules and the phases, in order
3. The plan files listed under "Read first" in each phase
4. `99-asl-ON-HOLD.md` — **only in Phase 8, when the developer says so**

## Files

| File | Covers | Used in phases |
|---|---|---|
| `phase.md` | Rules for the AI and the phases to complete, in order | All |
| `01-architecture-and-vps.md` | System overview, VPS memory and disk budget, networking, monorepo layout | 0, 6 |
| `02-backend-api.md` | Express structure, endpoints, auth, credit flow, errors, rate limits | 1, 2, 5, 7 |
| `03-database.md` | Postgres schema (DDL), ledger rules, indexes, backups, retention | 0, 1, 6 |
| `04-jobs-and-providers.md` | BullMQ queues, resumable pipelines, provider adapters, fake provider | 1, 2, 4 |
| `05-storage-and-cloudflare.md` | R2 buckets, uploads, CDN, Workers/OpenNext deploy, Turnstile | 0, 1, 3, 4, 6 |
| `06-frontend-web.md` | Next.js pages, UI structure, design direction, accessibility | 3, 7 |
| `07-credits-pricing-payments.md` | Credit costs, plans ($8/$15/$25/$100), margins, payments | 2, 4, 5 |
| `99-asl-ON-HOLD.md` | **On hold.** Everything about the ASL Studio integration | 8 only |

## v1 scope

Text-to-video · Image-to-video · Image generation · Lip sync · Captions

**On hold (built last):** ASL Studio.
**Not planned:** text-to-speech, music video, custom model training.

## Principles

1. Get one job working end to end (click → provider → R2 → library) before any UI polish.
2. Every provider sits behind an adapter. Swapping providers is a data change plus one file.
3. Credits are an append-only ledger. Never overwrite a balance without a ledger row.
4. The VPS never keeps user media long-term. R2 does.
5. Build against a **fake provider** first, so development costs $0.
6. Keep job types, job steps and adapters generic so later tools plug in without rewrites.
7. Deploy early and often, so hosting problems show up in week one, not at the end.

## Roadmap (details in `phase.md`)

- [ ] **Phase 0 — Foundations**
- [ ] **Phase 1 — Job engine** (auth, credits, queue, storage, fake provider)
- [ ] **Phase 2 — Real generation tools** (text-to-video, image-to-video, image generation)
- [ ] **Phase 3 — Web app and design** (home, templates, library)
- [ ] **Phase 4 — Lip sync and captions**
- [ ] **Phase 5 — Payments**
- [ ] **Phase 6 — Deploy, harden, test** (production, backups, monitoring, private beta)
- [ ] **Phase 7 — Mobile app (Expo)**
- [ ] **Phase 8 — ASL Studio** (last, on hold)

## Open decisions

| Decision | Needed by | Notes |
|---|---|---|
| Client's niche and brand name | Phase 3 | Drives templates and default models |
| Payment provider | Phase 5 | Depends on where the client's business is registered |
| Retention policy for uploads and outputs | Phase 4 | Proposed defaults in `05` |
| Moderation provider | Phase 2 | Prompt and upload screening |
| Whether mobile launches before ASL | Phase 7 | Default order: mobile, then ASL |

## Glossary

- **Adapter:** a small module wrapping one provider behind a shared interface.
- **Ledger:** append-only table of credit changes.
- **Job / job step:** one user request, and the resumable stages inside it.

---

## Starter prompt (paste into the AI tool to begin)

> Read `docs/plans/00-START-HERE.md` and `docs/plans/phase.md` fully. We are building the project described there. Start **Phase 0 only**. Follow the working rules in `phase.md`. Do **not** open or build anything from `99-asl-ON-HOLD.md`. Before writing code, list the files you will create and any questions you have. When Phase 0 is done, update `PROGRESS.md`, summarize what you did, and stop for my confirmation.

## Next-phase prompt (paste after you confirm a phase)

> Phase N is confirmed complete. Re-read `docs/plans/phase.md`, then start **Phase N+1 only** (replace N with the real numbers). Read the files listed under that phase's "Read first" line. Before writing code, list the files you will create or change and any questions. When the phase is done, update `PROGRESS.md`, summarize, and stop for my confirmation.

## If the AI goes off track

- It starts building something from a later phase → tell it to stop and re-read `phase.md` rules 1 and 12.
- It wants to change the stack → it must ask you first (see "Fixed decisions" in `phase.md`).
- It touches credits outside the ledger → reject the change (rule 4).
- It opens `99-asl-ON-HOLD.md` before Phase 8 → tell it ASL is on hold.


---

<!-- PART 2: phase.md -->

# phase.md — Build Phases (instructions for the AI developer)

## How to use this file

You are the AI coding assistant building this project together with a human developer.

1. Read this file and `docs/plans/00-START-HERE.md` first, then the plan file for the area you are about to work on.
2. Work on **one phase at a time, in order**.
3. At the end of each phase: stop, summarize what you built, list anything unfinished or uncertain, update `PROGRESS.md`, and **wait for the developer to confirm** before starting the next phase.
4. If code and a plan file disagree, ask the developer, or update the plan file as part of the change.

## The project in one paragraph

An AI video generator with a large prompt box, templates, and style examples. Users spend **credits** to run tools: text-to-video, image-to-video, image generation, lip sync, and captions. Generation is done by third-party providers (Wan, Seedance, Flux and others) reached through an aggregator such as fal.ai behind provider adapters. An ASL (American Sign Language) tool is planned but **deferred to the last phase**.

## Fixed decisions (do not change without asking)

| Area | Decision |
|---|---|
| Language | TypeScript (strict) everywhere, pnpm workspaces + Turborepo |
| Backend | Express, Zod, Pino, Better Auth, Drizzle ORM (or Prisma if the developer prefers) |
| Database | PostgreSQL on Coolify |
| Queue | BullMQ + Redis on Coolify |
| Storage | Cloudflare R2 (private + public buckets) |
| Web | Next.js on Cloudflare Workers via OpenNext |
| Mobile | Expo (React Native), Phase 7 only |
| Server | One VPS: 8 GB RAM, 100 GB SSD. Design for these limits (see `01`) |
| Providers | Behind adapters; model IDs and prices live in the `models` table |
| Money | Credits in an append-only ledger (see `03` and `07`) |

## Working rules

1. **Scope discipline.** Do not build anything from a later phase. In particular, add **no ASL tables, code, or UI** until Phase 8, and do not open `99-asl-ON-HOLD.md` before then. Do keep job types, job steps, and adapters generic.
2. **Fake provider first.** Every provider call goes through an adapter. Develop and test against the fake provider. Real calls only when `PROVIDER_MODE=real`, with a spending cap set.
3. **Secrets.** Provider keys, R2 secrets, payment secrets, and Turnstile secrets live only in server environment variables validated with Zod. Never in the repo, never in client code, never in logs.
4. **Credits are sacred.**
   - Every balance change happens in the same transaction as a ledger row.
   - Lock the account row (`FOR UPDATE`) before checking and deducting.
   - One `spend` and at most one `refund` per job (unique indexes).
   - Every state-changing endpoint that costs money requires an `Idempotency-Key`.
5. **Resumable jobs.** Save the provider's `external_id` to the step row immediately after submission, before waiting. A restarted worker must resume, never resubmit.
6. **Memory and disk.** Stream files to and from R2. Never load a whole video into memory. Run ffmpeg with concurrency 1, downscale to 720p when possible, and delete scratch files in a `finally` block. Set Docker memory limits on every service.
7. **Validation and errors.** Validate every request with Zod. Use the stable error codes in `02`. Log with Pino and a request ID.
8. **Tests are required** for: credit spend, refund and idempotency; the job state machine and crash-resume; webhook idempotency; presigned upload limits.
9. **Small commits.** One feature per change, clear messages. Keep CI green.
10. **Verify external facts.** Check current provider docs and pricing before integrating. Pin exact dependency versions and avoid abandoned packages.
11. **Ask, don't guess,** about money, security, and data deletion.
12. **Keep `PROGRESS.md` current** (see the end of this file).

## Phases

### Phase 0 — Foundations (3–5 days)

**Read first:** `01-architecture-and-vps.md`, `03-database.md`, `05-storage-and-cloudflare.md`

**Goal:** an empty but fully wired project that builds, tests, and deploys.

**Tasks**
- Monorepo layout from `01`. TypeScript, ESLint, Prettier, shared config package.
- `docker-compose.dev.yml` with Postgres and Redis (and MinIO if not using a dev R2 bucket).
- Zod-validated environment config.
- Drizzle setup and migrations for the core schema in `03` (no ASL tables).
- GitHub Actions: install, lint, typecheck, test.
- Coolify: Postgres and Redis services with memory limits and persistent volumes. Redis with AOF on, `noeviction`.
- Cloudflare: R2 buckets, CORS, scoped tokens (see `05`).
- Deploy a hello-world API with `/healthz` to Coolify, and a hello-world Next.js app to `workers.dev`.

**Done when:** `pnpm dev` runs everything locally; CI is green; `/healthz` is live on the VPS and checks Postgres and Redis; the web hello-world is live on `workers.dev`; migrations ran on the production database.

### Phase 1 — Job engine (1–2 weeks)

**Read first:** `02-backend-api.md`, `03-database.md`, `04-jobs-and-providers.md`, `05-storage-and-cloudflare.md`

**Goal:** one generic, reliable job pipeline running entirely on the fake provider.

**Tasks**
- Better Auth: email/password, Google login, email verification and reset via Resend, Turnstile on signup and reset. Create `profiles` and `credit_accounts` on signup.
- Credit ledger service (grant, spend, refund, adjust) with tests.
- Assets: presigned upload, complete and validate (ffprobe), signed download URLs.
- BullMQ: `provider-jobs`, `media-jobs`, `maintenance` queues; `worker-io` and `worker-media` entrypoints.
- Resumable step runner (see `04`). Sweepers. bull-board for admins.
- Fake provider for all capabilities with `FAKE_DELAY_MS` and `FAKE_FAIL_RATE`.
- Endpoints: `/me`, `/models`, `/quotes`, `/jobs` (create, list, get, cancel, delete), SSE events, rate limits, idempotency.
- Minimal web pages (unstyled is fine): login, a prompt box, and a library showing job progress.

**Done when:** every item under "Definition of done" in `02` and `04` passes. A forced failure refunds exactly once. Killing the worker mid-job and restarting it resumes without resubmitting.

**Out of scope:** real providers, payments, design polish.

### Phase 2 — Real generation tools (1–2 weeks)

**Read first:** `02-backend-api.md`, `04-jobs-and-providers.md`, `07-credits-pricing-payments.md`

**Goal:** real outputs from real models, with correct charging.

**Tasks**
- fal.ai adapters: `text_to_video` (Wan first, then Seedance), `image_to_video`, `text_to_image` (a fast and a quality model).
- Seed the `models` table with costs and credit prices from `07`. Verify current provider pricing first.
- Provider webhooks with a polling fallback. Record actual cost per step.
- Global daily spend cap, per-user concurrency limits, prompt moderation.
- ffmpeg thumbnails; results streamed into R2.
- A margin report query (credits charged vs provider cost per model).

**Done when:** each tool produces a stored result with the right credit charge; forced failures refund; costs are recorded per step. Use the cheapest settings in tests and keep a low prepaid balance.

### Phase 3 — Web app and design (2 weeks)

**Read first:** `06-frontend-web.md`, `05-storage-and-cloudflare.md`

**Goal:** the real interface.

**Tasks**
- Design tokens and the component set from `06`.
- Home page: prompt box, model and settings row, live credit cost, template grid.
- `/create/video`, `/create/image`, template detail page, templates API and admin editor, previews from the public bucket.
- Library polish (thumbnails, progress, retry, delete, download). Static pricing page.
- Accessibility pass (captions on videos, keyboard use, reduced motion) and responsive layouts.
- Playwright smoke tests against the fake provider.

**Done when:** the "Definition of done" in `06` passes and the site is deployed on `workers.dev`.

### Phase 4 — Lip sync and captions (1–2 weeks)

**Read first:** `04-jobs-and-providers.md`, `05-storage-and-cloudflare.md`, `07-credits-pricing-payments.md`

**Goal:** the two remaining tools.

**Tasks**
- Lip sync adapter (video + audio in, video out), upload limits from `05`.
- Speech-to-text adapter (AssemblyAI) and the captions pipeline: extract audio, transcribe, build VTT/SRT, optional burn-in.
- `/tools` pages for both. Credit prices from `07`.
- Measure ffmpeg memory, CPU, and disk use on the real VPS.

**Done when:** both tools run end to end with refunds on failure, and the VPS stays within its memory and disk budget under 5 simultaneous jobs.

### Phase 5 — Payments (1 week)

**Read first:** `07-credits-pricing-payments.md`, `02-backend-api.md`

**Goal:** users can buy credits.

**Tasks**
- `PaymentProvider` interface and the chosen provider (**ask the developer which**).
- Checkout, idempotent webhooks, plan and top-up credit grants, monthly expiry and rollover job.
- Billing page, optional one-time trial gift, margin report in the admin.

**Done when:** the "Definition of done" in `07` passes, including webhook replay safety.

### Phase 6 — Deploy, harden, test (1–2 weeks)

**Read first:** `01-architecture-and-vps.md`, `05-storage-and-cloudflare.md`, `03-database.md`

**Goal:** production-ready and tested with real people.

**Tasks**
- Cloudflare Tunnel or firewall to Cloudflare only; WAF rules; Turnstile verified; security headers.
- Backups to R2 and a **restore drill**.
- Sentry, PostHog, Uptime Kuma, disk and queue alerts.
- Legal pages (terms, privacy, takedown) drafted for a lawyer to review. Account deletion and data purge.
- Load test the queue (for example 50 fake jobs at once). Review memory and disk.
- Real domain, DNS, production deploys. Private beta with 5–10 users; fix what they find.

**Done when:** a backup restore is verified; beta users complete jobs; the nightly ledger reconciliation shows no mismatches; alerts reach the developer.

### Phase 7 — Mobile app (3–4 weeks)

**Read first:** `06-frontend-web.md`, `02-backend-api.md`

**Goal:** an Expo app on the same API.

**Tasks**
- Expo app using `packages/shared` types and API client. Bearer-token auth.
- Screens: create, tools, library, billing view. Push notifications when a job finishes.
- App-store requirements: account deletion, and the in-app-purchase decision for selling credits (**ask the developer**).

**Done when:** an internal/TestFlight build passes the core flows.

### Phase 8 — ASL Studio (last)

**Read first:** `99-asl-ON-HOLD.md` (only when the developer says to start)

**Do not start until the developer says so.** Follow `99-asl-ON-HOLD.md`, starting with its prerequisites checklist.

## Progress tracking

Create `PROGRESS.md` in the repo root and keep it updated:

```
# Progress

## Current phase: 0
- [ ] task …

## Done
## Decisions made
## Open questions for the developer
## Known issues
```

## Starter prompt (paste into your AI tool)

> Read `docs/plans/00-START-HERE.md` and `docs/plans/phase.md` fully. We are building the project described there. Start **Phase 0 only**. Follow the working rules in `phase.md`. Do **not** open or build anything from `99-asl-ON-HOLD.md`. Before writing code, list the files you will create and any questions you have. When Phase 0 is done, update `PROGRESS.md`, summarize what you did, and stop for my confirmation.


---

<!-- PART 3: 01-architecture-and-vps.md -->

# 01 — Architecture and VPS

## System overview

```
 Browser / Expo app
        |
 Cloudflare (DNS, WAF, Turnstile, CDN)
   |                        |
   |  app.domain.com        |  api.domain.com
   v                        v
 Next.js on Workers      VPS (Coolify)
 (OpenNext)               ├─ api        (Express)
                          ├─ worker-io  (BullMQ: provider calls, I/O-bound)
                          ├─ worker-media (BullMQ: ffmpeg, CPU-bound)
                          ├─ postgres
                          ├─ redis
                          └─ uptime-kuma (optional)
                                |
                  ┌─────────────┴─────────────┐
                  v                           v
          Cloudflare R2                 Providers (fal.ai, STT)
```

## Request flow (generation)

1. Web calls `POST /v1/jobs`. API validates, quotes the cost, deducts credits, inserts the job, enqueues it, returns `202`.
2. `worker-io` runs the pipeline steps. It submits to the provider and waits for the webhook or polls.
3. On completion it streams the result straight into R2 (never buffering the whole file in memory).
4. `worker-media` does ffmpeg work (thumbnails, caption burn-in, input validation).
5. The web app follows progress over SSE and shows the result from R2 via signed URL.

## VPS budget: 8 GB RAM

Starting allocations. Measure after Phase 1 and adjust.

| Service | RAM limit | Notes |
|---|---|---|
| OS + Docker + Coolify + proxy | 1.5 GB | Coolify itself is not tiny |
| Postgres | 1.5 GB | `shared_buffers` 1 GB |
| Redis | 0.5 GB | `maxmemory 512mb`, `noeviction`, AOF on |
| API | 0.5 GB | Node heap capped |
| worker-io | 0.5 GB | Mostly waiting on providers |
| worker-media (ffmpeg) | 1.5 GB | Concurrency 1 at first |
| Headroom | 2 GB | Spikes, deploys, page cache |

Set a Docker memory limit on every container so one bug cannot take the whole box down.

## VPS budget: 100 GB SSD

| Use | Budget |
|---|---|
| OS, Docker images, logs | ~20 GB |
| Postgres data | 5–10 GB |
| Local DB backups (rotating, before offsite copy) | ~5 GB |
| Media scratch space (`/tmp/work`) | 20 GB hard cap |
| Free buffer | the rest |

Rules:
- **No user videos stay on the VPS.** Download → process → upload to R2 → delete scratch files in a `finally` block.
- Nightly cleanup job removes scratch directories older than 2 hours.
- `docker system prune` weekly, log rotation on all containers (`max-size` 10m, `max-file` 3).
- Alert at 75% disk usage. Buy more storage before 85%.

## When to upgrade

| Signal | Action |
|---|---|
| Disk > 75% | Add storage |
| Media jobs queue for > 10 min | Move `worker-media` to a second VPS |
| Postgres memory pressure or slow queries | Increase RAM or move to managed Postgres |
| Redis near `maxmemory` | Check retention settings first, then raise |

## Networking and security

- Prefer a **Cloudflare Tunnel** so no web ports are open on the VPS (confirm Coolify's tunnel docs). Otherwise, firewall 80/443 to Cloudflare IP ranges.
- Postgres and Redis are **never** exposed publicly. Internal Docker network only.
- SSH keys only, no password login, fail2ban, unattended security updates.
- Secrets live in Coolify environment variables, never in the repo.
- `app.domain.com` and `api.domain.com` share a parent domain so session cookies work (`Domain=.domain.com`, `Secure`, `SameSite=Lax`).

## Monorepo layout

```
repo/
├─ apps/
│  ├─ api/            Express + workers (same codebase, different entrypoints)
│  ├─ web/            Next.js (OpenNext → Cloudflare)
│  └─ mobile/         Expo (later)
├─ packages/
│  ├─ shared/         Zod schemas, types, typed API client
│  └─ config/         tsconfig, eslint
├─ infra/             docker-compose.dev.yml, Coolify notes, runbooks
└─ docs/plans/        these files
```

Tooling: pnpm workspaces + Turborepo, TypeScript strict, ESLint, Prettier.

## Environments

- **Local:** docker-compose with Postgres, Redis, and MinIO or a dev R2 bucket. Fake provider on by default.
- **Production:** the VPS.
- **Staging (optional, later):** a small second VPS. Don't run staging on the production box, since 8 GB is tight.

## Observability

- Pino JSON logs with a request ID on every line.
- Sentry for API, workers, and web.
- bull-board (admin only) to inspect queues.
- Uptime Kuma pinging `/healthz` and a synthetic "fake job" every 5 minutes.
- Metrics to track: queue depth, job success rate, provider cost per day, p95 job duration, disk use.


---

<!-- PART 4: 02-backend-api.md -->

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


---

<!-- PART 5: 03-database.md -->

# 03 — Database (PostgreSQL on Coolify)

## Principles

- Postgres 16. IDs are `uuid` (`gen_random_uuid()`), except the ledger (`bigint identity`).
- Timestamps are `timestamptz`. Credits are integers. Provider costs are stored in **micro-dollars** (`bigint`) to avoid float errors.
- Auth tables (`user`, `session`, `account`, `verification`) are created by Better Auth. Do not hand-edit them. Extend with `profiles`.
- Migrations with Drizzle Kit (or Prisma Migrate), committed to the repo, applied automatically on deploy.
- Write migrations in dependency order: `plans`, `models`, `templates`, `payments`, `jobs`, then tables that reference them.

## Core DDL

```sql
create table plans (
  id text primary key,                         -- 'starter','creator','pro','studio'
  name text not null,
  price_usd_cents int not null,
  monthly_credits int not null,
  active boolean not null default true
);

create table profiles (
  user_id text primary key references "user"(id) on delete cascade,
  display_name text,
  plan_id text references plans(id),
  role text not null default 'user' check (role in ('user','admin')),
  strikes int not null default 0,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table models (
  id text primary key,                         -- 'wan-2.6','seedance-2.0-fast','flux-schnell','veed-lipsync'
  capability text not null check (capability in
    ('text_to_video','image_to_video','text_to_image','lip_sync','stt')),
  provider text not null,                      -- 'fal', 'assemblyai', 'anthropic', ...
  provider_model text not null,                -- endpoint id at the provider
  unit text not null check (unit in ('second','image','minute','request')),
  cost_usd_micros_per_unit bigint not null,    -- what WE pay
  credits_per_unit numeric(10,2) not null,     -- what the USER pays
  min_units numeric, max_units numeric,
  params_schema jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  capability text not null,
  prompt_scaffold text,
  default_model_id text references models(id),
  default_params jsonb,
  preview_video_key text,                      -- in the public assets bucket
  thumbnail_key text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  provider text not null,
  provider_payment_id text not null,
  kind text not null check (kind in ('subscription','topup')),
  amount_cents int not null,
  currency text not null,
  credits_granted int not null,
  status text not null check (status in ('pending','paid','refunded','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  plan_id text not null references plans(id),
  provider text not null,
  provider_sub_id text,
  status text not null check (status in ('active','past_due','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_sub_id)
);

create table webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  primary key (provider, event_id)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  type text not null check (type in
    ('text_to_video','image_to_video','text_to_image','lip_sync','captions')),
  status text not null default 'queued' check (status in
    ('queued','running','succeeded','failed','canceled')),
  model_id text references models(id),
  template_id uuid references templates(id),
  params jsonb not null,
  credit_cost int not null,
  progress smallint not null default 0,
  error_code text,
  error_message text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index jobs_user_created on jobs (user_id, created_at desc);
create index jobs_active on jobs (status) where status in ('queued','running');
create unique index jobs_idem on jobs (user_id, idempotency_key) where idempotency_key is not null;

create table job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  seq smallint not null,
  kind text not null,                          -- 'moderate','submit','wait','download','transcribe','build_captions','burn_captions','thumbnail'
  status text not null default 'pending' check (status in
    ('pending','running','succeeded','failed','skipped')),
  provider text,
  external_id text,                            -- provider's job id; saved BEFORE waiting so a restart resumes instead of re-submitting (and re-paying)
  attempt smallint not null default 0,
  cost_usd_micros bigint,                      -- actual provider cost when known
  input jsonb, output jsonb, error text,
  started_at timestamptz, finished_at timestamptz,
  unique (job_id, seq)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id text references "user"(id),
  job_id uuid references jobs(id) on delete set null,
  role text not null check (role in ('input','output','thumbnail','captions','intermediate')),
  kind text not null check (kind in ('video','image','audio','text')),
  bucket text not null,
  object_key text not null,
  mime text, size_bytes bigint, duration_ms int, width int, height int,
  status text not null default 'pending' check (status in ('pending','ready','deleted')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);
create index assets_job on assets (job_id);
create index assets_expiry on assets (expires_at) where status = 'ready';

create table credit_accounts (
  user_id text primary key references "user"(id),
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table credit_ledger (
  id bigint generated always as identity primary key,
  user_id text not null references "user"(id),
  delta int not null,                          -- + grants/refunds, - spends
  type text not null check (type in
    ('grant_plan','grant_topup','grant_trial','spend','refund','adjustment','expire')),
  job_id uuid references jobs(id),
  payment_id uuid references payments(id),
  idempotency_key text,
  note text,
  created_at timestamptz not null default now()
);
create unique index ledger_idem on credit_ledger (user_id, idempotency_key) where idempotency_key is not null;
create unique index ledger_one_spend_per_job on credit_ledger (job_id) where type = 'spend';
create unique index ledger_one_refund_per_job on credit_ledger (job_id) where type = 'refund';
```

## Operational tables

```sql
create table moderation_events (
  id bigint generated always as identity primary key,
  user_id text references "user"(id),
  job_id uuid references jobs(id),
  stage text not null,                         -- 'prompt','upload','provider'
  result text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id text references "user"(id),
  action text not null,                        -- 'credits.adjust','job.retry','template.update'
  target text, detail jsonb,
  created_at timestamptz not null default now()
);
```

## Ledger rules (never break these)

1. Every change to `credit_accounts.balance` happens in the same transaction as a `credit_ledger` row.
2. `balance` must equal `sum(delta)` per user. A nightly job checks this and alerts on any mismatch.
3. Lock the account row (`FOR UPDATE`) before checking and deducting.
4. One `spend` and at most one `refund` per job (enforced by the unique indexes).
5. Manual adjustments require an admin and write to `audit_log`.

## Postgres tuning for an 8 GB shared VPS (starting values)

```
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 50
```

Connection pool sizes: API 10, worker-io 5, worker-media 3.

## Backups

- Coolify scheduled backups to R2 (S3-compatible): daily, keep 7 daily + 4 weekly.
- **Restore drill once a month** into a scratch container. An untested backup is not a backup.
- Keep one backup copy outside the VPS provider account.

## Retention and deletion

| Data | Rule (proposed) |
|---|---|
| `job_steps`, `moderation_events` | Keep 180 days, then purge |
| Uploaded source videos | Delete 7 days after the job finishes unless the user keeps them |
| Outputs | Keep while subscribed + 30 days |
| Ledger and payments | Keep for accounting; anonymize on account deletion |
| Account deletion | Soft delete → purge R2 assets within 30 days → remove personal data |


---

<!-- PART 6: 04-jobs-and-providers.md -->

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


---

<!-- PART 7: 05-storage-and-cloudflare.md -->

# 05 — Storage and Cloudflare

## What Cloudflare hosts

| Piece | Service |
|---|---|
| Web app (Next.js) | Workers via OpenNext (`@opennextjs/cloudflare`) |
| Files (videos, images, audio, captions) | R2 |
| DNS, SSL, CDN, WAF | Cloudflare free plan |
| Bot protection on signup | Turnstile |
| Optional tunnel to the VPS | Cloudflare Tunnel |

## R2 buckets

| Bucket | Visibility | Contents |
|---|---|---|
| `app-private` | Private (signed URLs only) | User uploads, generated outputs, thumbnails, captions |
| `app-public` | Public via `cdn.domain.com` | Template preview videos and thumbnails, marketing assets |
| `app-backups` | Private | Postgres backups |

Free tier covers 10 GB, 1M writes and 10M reads per month, with no egress fees. Check Cloudflare's current pricing page before launch.

## Object key convention

```
u/{userId}/jobs/{jobId}/input/{assetId}.{ext}
u/{userId}/jobs/{jobId}/output/{assetId}.mp4
u/{userId}/jobs/{jobId}/thumb/{assetId}.jpg
u/{userId}/jobs/{jobId}/captions/{assetId}.vtt
tmp/{uuid}                       (lifecycle: delete after 1 day)
templates/{slug}/preview.mp4     (public bucket)
```

Never put user-supplied filenames in keys. Store the original name in the database.

## Upload flow (browser → R2 directly)

1. `POST /v1/uploads/presign` with `{ kind, mime, sizeBytes, durationHint }`.
2. The API checks limits, creates an `assets` row (`status=pending`), and returns a presigned PUT (or multipart upload parts for large files).
3. Browser uploads straight to R2 with progress reporting.
4. `POST /v1/uploads/complete`. The API runs `HEAD` on the object, then queues validation (ffprobe for duration, resolution, codec).
5. Assets that fail validation are deleted and the user gets a clear message.

Launch limits (raise later):

| Input | Limit |
|---|---|
| Video for captions or lip sync | 5 minutes, 500 MB, MP4/MOV/WebM |
| Image-to-video image | 20 MB, JPEG/PNG/WebP |
| Lip sync audio | 10 minutes, 50 MB |

R2 needs a CORS rule allowing your app origin for `PUT`, `GET`, and `HEAD`.

## Download flow

- **Private files:** the API issues short-lived presigned GET URLs (e.g. 1 hour) when the web app loads the library. Never store signed URLs in the database.
- **Public template previews:** served from `cdn.domain.com` with long cache headers.
- Use `preload="metadata"` and thumbnails in lists so a library page doesn't download dozens of videos.
- Cloudflare's cache has a per-file size cap (512 MB reported). Your clips are far smaller.

## Worker → R2 transfer

- Stream provider output URL → R2 (`pipeline`/multipart upload). Never load a whole video in memory on an 8 GB box.
- For ffmpeg, download inputs to `/tmp/work/{jobId}`, process, upload outputs, then delete the directory in `finally`.

## Retention (proposed defaults — confirm with the client)

| Object | Rule |
|---|---|
| `tmp/` | Delete after 1 day (R2 lifecycle rule) |
| Source uploads | Delete 7 days after job completion unless the user keeps them |
| Outputs | Keep while subscribed + 30 days |
| Backups | 7 daily + 4 weekly |

Privacy matters here: users upload their own videos. Say plainly in the privacy policy how long files are kept, and offer "delete my files" in the UI.

## Web deployment (Next.js on Workers)

- Use the OpenNext Cloudflare adapter and `wrangler`. Enable the `nodejs_compat` flag.
- Keep the web app thin: pages call the VPS API directly from the browser (`NEXT_PUBLIC_API_URL=https://api.domain.com`). Avoid heavy server-side logic on Workers.
- The free Workers plan has tight limits (script size, CPU time). Expect to need the $5/month paid plan once the app bundle grows. Test early.
- Preview deployments per branch, production deploy from `main` via GitHub integration or Actions.
- Custom domains: `app.domain.com` (web), `api.domain.com` (VPS), `cdn.domain.com` (R2 public).

## Security on the Cloudflare side

- Turnstile on signup, login after failures, and password reset (verify the token server-side).
- WAF managed rules on; add a rate-limit rule on `/api/auth/*`.
- Lock the VPS to Cloudflare (Tunnel, or firewall to Cloudflare IP ranges).
- R2 API tokens scoped per bucket, with separate tokens for the API, workers, and backups.
- Security headers on the web app: CSP, `X-Content-Type-Options`, `Referrer-Policy`.

## Checklist

- [ ] Domain added to Cloudflare, nameservers switched
- [ ] Three R2 buckets, CORS rule, lifecycle rules, scoped tokens
- [ ] `cdn.` custom domain on the public bucket
- [ ] Tunnel or firewall rule for the VPS
- [ ] Turnstile site key and secret in env
- [ ] `workers.dev` deploy of the web app working before buying the domain


---

<!-- PART 8: 06-frontend-web.md -->

# 06 — Frontend (Next.js on Cloudflare)

## Goals

- A large prompt box on the home page with template and style examples underneath (OpenArt / Kling feel).
- Fast on phones, accessible to Deaf and hard-of-hearing users, and simple enough to use without a tutorial.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui components, TanStack Query (server state), Zustand only for small UI state, Zod schemas and the typed API client from `packages/shared`, Playwright for smoke tests.

## Sitemap

| Route | Purpose |
|---|---|
| `/` | Create: prompt box, mode tabs, template grid |
| `/create/video` | Text-to-video and image-to-video |
| `/create/image` | Image generation |
| `/tools` | Tool grid: Lip sync, Captions |
| `/tools/lip-sync` | Lip sync |
| `/tools/captions` | Captions |
| `/templates/[slug]` | Template detail, prefilled prompt |
| `/library` | All my jobs and files |
| `/library/[jobId]` | Result viewer with download and share |
| `/pricing` | Plans |
| `/billing` | Credits, history, plan changes |
| `/account` | Profile, delete my data |
| `/login`, `/signup`, `/reset` | Auth (Turnstile on signup/reset) |
| `/admin/*` | Templates, users, failed jobs (role-gated) |

## Layout

- **Desktop:** left rail (Create, Tools, Library, Templates), top bar (credit balance, Upgrade, avatar).
- **Mobile web:** bottom tab bar (Create, Tools, Library, Account). Same routes, later reused as the Expo structure.
- **Home page:** hero prompt box → mode chips (Video, Image) → model and settings row (model, duration, aspect, resolution) → "Generate" with live credit cost → template grid by category → style examples.

## Key components

| Component | Notes |
|---|---|
| `PromptBox` | Multiline, character count, image attach (for image-to-video), cost preview |
| `ModelPicker` | Reads `/v1/models`, shows credits per unit |
| `TemplateGrid` / `TemplateCard` | Hover-play preview (muted), click prefills `PromptBox` |
| `JobCard` | Thumbnail, status, progress, retry/delete |
| `JobProgress` | Steps from SSE (e.g. Queued → Generating → Saving → Done) |
| `UploadDropzone` | Presigned upload with progress, validation messages |
| `VideoPlayer` | Poster image, captions track, keyboard controls |
| `CreditMeter`, `UpgradeDialog` | Always visible; blocks submit with a clear message when short |

## Design direction

- Dark theme with one strong accent color, large type, rounded cards, lots of video thumbnails. The same general feel as OpenArt and Kling.
- **Do not copy** their logos, exact color values, copy, or layouts pixel for pixel. Define your own tokens and name.
- Tokens in CSS variables: `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--danger`, spacing scale, radius scale. Support a light theme later.
- Create the design in a design tool or with AI assistance first (home, create, library, pricing), then build components.

## Accessibility (non-negotiable for this audience)

- Captions available on every playable video, including template previews.
- Never rely on sound for notifications. Use visual toasts, plus email and push when ready.
- Keyboard-navigable everything, visible focus rings, WCAG AA contrast.
- Respect `prefers-reduced-motion` (turn off hover-autoplay previews).
- Clear plain-language errors. Avoid jargon.
- Consider an accessibility review of the UI during the beta, including by Deaf and hard-of-hearing users.

## Data and state

- All data comes from the API through TanStack Query. Keys: `['me']`, `['models']`, `['jobs', filters]`, `['job', id]`.
- Job progress via `EventSource` on `/v1/jobs/:id/events`, with a polling fallback every 5 s.
- Auth: cookie session from the API domain. Handle 401 by redirecting to `/login`.
- Idempotency: generate a UUID per submit attempt and send it as `Idempotency-Key`.
- Uploads go direct to R2 (see `05`).

## Performance

- Thumbnails everywhere in lists. Videos load only when opened or hovered.
- Lazy-load the template grid below the fold, paginate the library with cursors.
- Keep the Workers bundle small: avoid heavy server components and large client libraries.

## Testing

- Playwright smoke tests: signup (with test Turnstile key), create a fake job, see it complete, open library.
- Run against the fake provider in CI.

## Definition of done (Phases 2–3)

- [ ] Home page with working prompt box and cost preview
- [ ] Library with progress, retry, delete, download
- [ ] Mobile-responsive and keyboard-accessible
- [ ] Deployed on `workers.dev`, then on the real domain


---

<!-- PART 9: 07-credits-pricing-payments.md -->

# 08 — Credits, Pricing and Payments

> Prices below came from provider and reseller pages in 2026 and change often. Re-check before launch. Provider costs live in the `models` table so repricing is a data change.

## Credit costs (what the user pays)

| Action | Credits | Provider cost (approx.) |
|---|---|---|
| Image, fast (Flux Schnell) | 2 | ~$0.003 |
| Image, quality (Flux Dev / Pro class) | 8 | ~$0.025–0.04 |
| Text/Image → video, Wan, 5 s | 90 | ~$0.25–0.35 |
| Text/Image → video, Seedance Fast, 5 s | 180 | ~$0.55–0.80 |
| Lip sync on a video, per 10 s | 25 | ~$0.07–0.12 (VEED/Sync-class, $0.40–0.70/min) |
| Talking avatar (image + audio), per 10 s | 250 | ~$1.33 if priced like sync-3 at $8/min — test cheaper models |
| Captions, per video minute | 3 | < $0.01 |

Per-second prices for video scale linearly with duration (Wan 18 credits/s, Seedance Fast 36 credits/s at the 5-second rate above). Lock the formula:

```
credits = ceil( provider_cost_usd × markup ÷ credit_value_usd )
markup target = 2.5×   (cost ≈ 40% of retail value)
credit_value_usd = 0.01 at the Starter rate
```

## Plans (monthly)

| Plan | Price | Credits | $/credit | Roughly buys |
|---|---|---|---|---|
| **Starter** | $8 | 800 | 0.0100 | ~8 Wan clips, or ~4 Seedance clips, or ~400 fast images |
| **Creator** | $15 | 1,600 | 0.0094 | ~17 Wan clips, or ~8 Seedance clips |
| **Pro** | $25 | 2,800 | 0.0089 | ~31 Wan clips, or ~15 Seedance clips |
| **Studio** | $100 | 12,500 | 0.0080 | ~138 Wan clips, or ~69 Seedance clips |

Rules:
- Monthly credits expire at cycle end. Allow rollover capped at one month's allowance (decision for the client).
- Top-up packs at the same prices as plans.
- No free plan (Starter is the entry point). Optional one-time **trial gift of ~50 credits** after email verification + Turnstile.
- Concurrent-job limits by plan: 2 / 3 / 4 / 6.
- Show the credit cost before every generation.

## Margin check

Assume a payment fee, then provider cost:

| Plan | Net revenue after fee* | Worst-case provider cost if all credits go to Seedance | Gross margin |
|---|---|---|---|
| Starter | ~$7.1–7.5 | ~$2.9 | ~60% |
| Studio | ~$94 | ~$45 | ~50% |

\* Fees are approximate: Stripe ≈ 2.9% + $0.30; merchant-of-record services (Paddle, Lemon Squeezy) ≈ 5% + $0.50; Paystack differs for local vs international cards. **Verify current fees.** Mobile in-app purchases lose 15–30% to Apple/Google.

**Main risk:** provider price drift. Seedance prices differ widely between resellers and have changed often, and avatar-style lip sync costs far more than video-to-video lip sync. Keep `models.cost_usd_micros_per_unit` current, review the margin report weekly, and reprice credits when a model's cost moves by more than about 20%.

## Rough economics (illustrative ceiling)

Assumes $16 average plan, 70% credit use, variable cost ≈ 45% of revenue.

| Paying users | Revenue/mo | Variable cost | Fixed | Left before people, marketing, support |
|---|---|---|---|---|
| 50 | ~$800 | ~$360 | ~$50 | ~$390 |
| 500 | ~$8,000 | ~$3,600 | ~$250 | ~$4,150 |

Ignores refunds, chargebacks, trials, support, and marketing.

## Fixed costs (early)

| Item | Cost |
|---|---|
| VPS | Already owned (storage upgrade soon) |
| Cloudflare Workers paid plan (likely needed) | ~$5/mo |
| R2 | Free up to 10 GB, then cheap |
| Resend, Sentry, PostHog, GitHub Actions | Free tiers first |
| Domain | ~$10–15/yr |
| Apple Developer / Google Play (Phase 7) | $99/yr / $25 once |
| Not yet priced | Legal review of terms and privacy policy |

## Credit lifecycle

1. **Grant:** a payment webhook creates a `payments` row and a `grant_plan` or `grant_topup` ledger entry in one transaction (idempotent on `provider_payment_id`).
2. **Spend:** deducted when the job is created.
3. **Refund:** automatic on failure, once per job.
4. **Expire:** a nightly job writes `expire` entries for unused monthly credits past the rollover cap.
5. **Reconcile:** nightly check that ledger sums equal balances.

## Payments

- Choose the provider based on where the client's business is registered. Stripe is not available everywhere (including Nigeria for local businesses). Alternatives: Paystack/Flutterwave for local rails, or a merchant-of-record (Paddle, Lemon Squeezy, Polar) that also handles international tax.
- Implement a `PaymentProvider` interface (`createCheckout`, `verifyWebhook`, `parseEvent`) so the provider can change.
- Always process webhooks idempotently via `webhook_events`.
- Subscription states: `active`, `past_due`, `canceled`, `expired`. On `past_due`, stop granting new credits but keep existing ones until period end.
- Refund policy: automatic credit refunds for failed jobs; cash refunds handled manually in the provider dashboard.

## Admin reports

- Margin by model: credits charged vs provider cost, last 7 and 30 days.
- Top spenders and abnormal usage.
- Failed-job rate by provider.
- Daily spend vs the global cap.

## Definition of done (Phase 5)

- [ ] Checkout creates a plan or top-up and grants credits exactly once per payment
- [ ] Replaying a webhook changes nothing
- [ ] Pricing page matches the `plans` table
- [ ] Margin report shows realistic numbers on test data
- [ ] Refund-on-failure and expiry jobs verified
