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
