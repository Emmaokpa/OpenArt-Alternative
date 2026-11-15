# Progress

## Current phase: 1 — Job engine ✅ COMPLETE

Phase 1 is complete and verified: `pnpm lint`, `pnpm typecheck`, `pnpm test` (42 tests) and `pnpm build` all pass. The API smoke-tested against real Postgres, Redis and LocalStack.

## Phase 1 checklist (all done)

### A. Auth (Better Auth)

- [x] `modules/auth/auth.ts` + `middleware.ts`: email/password with email verification, password reset via Resend (HTTP), optional Google, Turnstile when secret set
- [x] `profiles` and `credit_accounts` created on signup via database hooks; `SIGNUP_GRANT_CREDITS` forced to `0` in production
- [x] Cross-site cookies in production (`sameSite: none`, `secure: true`); Better Auth mounted at `/api/auth` before JSON body parsing

### B. Credit ledger

- [x] `modules/credits/credits.ts`: ensure/get/spend/refund/grant/adjust/reconcile/calculateCredits
- [x] Append-only ledger; one `spend` and at most one `refund` per job (unique indexes); account row locked `FOR UPDATE`; balance change + ledger row in the same transaction
- [x] Tests: spend, refund, idempotency, insufficient credits, negative-adjustment guard, ledger reconciliation drift detection

### C. Assets / object storage

- [x] `modules/assets/assets.ts` + `limits.ts`: presigned direct PUT, complete + validate (size/mime/duration), signed download, ffprobe when available
- [x] `lib/storage.ts`: one S3 client for R2 (prod) and LocalStack S3 (local); streaming put/download, never buffers whole video
- [x] `infra/docker-compose.dev.yml`: Postgres + Redis + LocalStack (S3-compatible) with bucket init
- [x] Tests: presign/create asset, reject out-of-limit mime/size, complete only when object exists, enqueue probe

### D. BullMQ queues + workers

- [x] `queue/queues.ts`, `bull-board.ts`, `maintenance.ts`: `provider-jobs`, `media-jobs`, `maintenance`; sweep (requeue lost, fail stuck, expire assets, clean scratch), nightly ledger reconcile
- [x] `worker-io.ts` (provider jobs, concurrency 10) and `worker-media.ts` (ffmpeg, concurrency 1); graceful shutdown
- [x] bull-board admin router mounted behind `requireAdmin`

### E. Resumable step runner

- [x] `modules/jobs/runner.ts` + `pipelines.ts`: Redis `FOR UPDATE`-style job lock, provider `external_id` persisted immediately after submit, resume without resubmitting, retry/refund on failure
- [x] Tests: happy path to success, crash-resume without double-submit, exactly-one-refund on repeated failure

### F. Fake provider

- [x] `providers/fake/fake.ts`: bundled `sample.mp4` (CC0 flower), generated `sample.png`, deterministic transcript fixture; external id encodes timestamp/fail/timeout/capability
- [x] `FAKE_DELAY_MS`, `FAKE_FAIL_RATE`, `FAKE_TIMEOUT_RATE` for deterministic fail/timeout/hang testing

### G. Endpoints (v1)

- [x] `routes/v1/`: `/me`, `/models`, `/templates`, `/quotes`, `/jobs` (create/list/get/cancel/delete, idempotency), SSE progress polling every 1s, `/uploads` (presign/complete, 20/hour rate limit), `/assets` download, `/webhooks/providers/fake` (replay-deduped via `webhook_events`), `/admin` (credits + bull-board)
- [x] `http/errors.ts`, `http/validate.ts`, `http/middleware.ts`, `http/rate-limit.ts`: uppercase error codes, Zod validation, fixed-window Redis rate limiter
- [x] `routes/health.test.ts`: updated to expect `NOT_FOUND`

### H. Minimal web pages (Phase 1, unstyled)

- [x] `apps/web`: login, signup, forgot-password, reset-password, home (prompt box + live job progress), library; Better Auth client + API helper; `@app/shared` dependency added
- [x] `next build` passes; all pages statically generated

### I. Infra, CI, migrations, docs

- [x] `apps/api/Dockerfile`: ffmpeg + fixtures + worker scripts
- [x] `.github/workflows/ci.yml`: Postgres + Redis services, migrate step, `TEST_DATABASE_URL`
- [x] `.env.example`: all Phase 1 variables
- [x] `pnpm db:generate` → `0001_left_valkyrie.sql`; applied to local Postgres (18 tables)
- [x] `pnpm seed`: plans, fake models, templates
- [x] `package.json` `onlyBuiltDependencies`: `msgpackr-extract`
- [x] `freebuff-plans/phase.md` synced with `docs/plans/phase.md` (client → Next.js UI decision); `ALL-PLANS-COMBINED.md` regenerated
- [x] README.md updated for Phase 1

---

## Phase 0 (reference — complete)

See the collapsed Phase 0 section in git history. Highlights: monorepo layout, Postgres/Redis/MinIO→LocalStack docker-compose, Zod env, Drizzle + 18-table migration, CI, Coolify deploys, Cloudflare web Worker, R2 buckets.

---

## Done (verified)

**Locally (Windows, Node 26, pnpm 10.34.9):**
- `pnpm install --frozen-lockfile` — lockfile committed and reproducible.
- `pnpm lint` — 4/4 packages clean.
- `pnpm typecheck` — 5/5 tasks clean.
- `pnpm test` — 42 tests passing across 9 files (credits, pricing, job create/idempotency/refund, crash-resume, webhook idempotency, upload limits, health, env).
- `pnpm build` — shared, api, web all built successfully (Next.js pages: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/library`).
- Migration applied to real Postgres: 18 tables, constraints enforced.
- API smoke test with Docker deps: `GET /` → 200, `GET /v1/models` → 200, `GET /healthz` → 200 with live deps, 503 when deps down.

**With Docker (Postgres + Redis + LocalStack):**
- `pnpm infra:up` — all three containers healthy; LocalStack init creates `app-private`, `app-public`, `app-backups`.
- Presign → PUT → HEAD → GET round-trip through the S3 client works against LocalStack.

**Production (Coolify VPS + Cloudflare):**
- Phase 0 deploys remain live (API `/healthz`, web Worker).
- Phase 1 changes ready to deploy: new Dockerfile (ffmpeg), `dist/migrate.js` migrations, worker entrypoints.

---

## Decisions made

1. **Auth tables now, auth logic in Phase 1.** Four Better Auth tables declared in Drizzle as schema only.
2. **`@app/shared` is a built package** (ESM + declarations) for runtime and Drizzle Kit resolution.
3. **`/healthz` opens a one-shot Redis connection** per probe to avoid log floods.
4. **Stack versions pinned:** pnpm 10.34.9, Node ≥ 24, TypeScript 6.0.3, Express 5.3.0, Drizzle 0.45.4, Zod 4.6.7, Next 16.4.6, OpenNext 1.20.17, wrangler 4.161.0, BullMQ 6.7.6, Better Auth 1.7.23, `@aws-sdk/*` 3.1169.0.
5. **Drizzle over Prisma.**
6. **LocalStack (not MinIO)** for local S3-compatible storage; MinIO community images are no longer published. Same AWS SDK client targets R2 in production.
7. **`apps/web` is the Next.js port target.** `client/` React prototype untouched; 100% structure copied when ported in Phase 3.
8. **`.npmrc` retry settings** for unstable connection.
9. **Migrations run from `dist/migrate.js`** as Coolify pre-deployment command.
10. **Job deletion is soft-delete** (`jobs.deleted_at`) because `credit_ledger.job_id` must be retained.

---

## Open questions (resolved)

1. **Deploy access:** ✅ Coolify API token + VPS SSH + Cloudflare account configured.
2. **Domain:** ✅ `workers.dev` for web (`https://app-web.eokpa34.workers.dev/`). Custom domain later.
3. **pnpm 10 / Node 24 pinning:** ✅ Kept (pnpm 10.34.9, Node 24 CI, Node 26 local).
4. **Local object storage:** ✅ LocalStack S3-compatible; production uses R2 via the same SDK client.
5. **`SIGNUP_GRANT_CREDITS`:** ✅ Default 0, forced 0 in production.

---

## Known issues

- `pnpm` warns about ignored build script `msgpackr-extract@3.0.7`; added to `onlyBuiltDependencies` (harmless).
- Docker daemon not always running locally; Postgres/Redis-backed integration tests skip gracefully when Postgres is unreachable.
- `ffmpeg`/`ffprobe` not installed locally; probe returns null and thumbnails are skipped gracefully. ffmpeg is in the API Dockerfile.
- Web UI is intentionally unstyled/plain in Phase 1; design polish comes in Phase 3.
- Real providers (fal.ai/AssemblyAI) and payments are Phase 2+; not built yet.
- `99-asl-ON-HOLD.md` not opened; ASL deferred to Phase 8.

---

**Phase 1 is complete. Ready for the developer to confirm before starting Phase 2 (real generation tools).**
