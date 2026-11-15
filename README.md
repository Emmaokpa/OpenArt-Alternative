# AI video platform

AI video generator: a large prompt box, templates, and a library of creations.
Generation runs on third-party providers behind adapters; credits are an
append-only ledger.

**Status:** Phase 1 — job engine complete. Better Auth, the credit ledger,
assets/R2, BullMQ queues, a fake provider, job endpoints with SSE, and minimal
web pages are implemented. UI port to Next.js happens in Phase 3. Plans live in
`docs/plans/` (a copy is kept in `freebuff-plans/`).

## Stack

pnpm workspaces + Turborepo · TypeScript strict · Express 5 + Zod + Pino ·
Postgres 16 + Drizzle · Redis 7 + BullMQ · Cloudflare R2 (production) /
LocalStack S3 (local) · Next.js 16 on Workers via OpenNext · Expo later.

## Quick start

```bash
cp .env.example .env      # local defaults, no secrets
pnpm install
pnpm infra:up             # Postgres + Redis + LocalStack (Docker)
pnpm db:migrate           # apply Drizzle migrations
pnpm seed                 # plans, fake models and templates
pnpm dev                  # API :8080 · web :3000
curl http://localhost:8080/healthz
```

`pnpm dev` needs Docker for Postgres, Redis and LocalStack. The API still boots
without them; `/healthz` answers `503` until all dependencies respond.

## Scripts

| Command                                      | What it does                            |
| -------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                   | All apps in watch mode                  |
| `pnpm build`                                 | Production build of every package       |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Same checks CI runs                     |
| `pnpm format`                                | Prettier                                |
| `pnpm db:generate`                           | New Drizzle migration from the schema   |
| `pnpm db:migrate`                            | Apply migrations (needs `DATABASE_URL`) |
| `pnpm db:studio`                             | Open Drizzle Studio                     |
| `pnpm seed`                                  | Seed plans, models and templates        |
| `pnpm worker:io`                             | Run the provider + maintenance worker   |
| `pnpm worker:media`                          | Run the ffmpeg media worker             |
| `pnpm infra:up` / `pnpm infra:down`          | Local Postgres, Redis and LocalStack    |

## Layout

```
apps/api        Express API, job engine, workers, Drizzle schema and migrations
apps/web        Next.js app, deployed to Cloudflare Workers via OpenNext
packages/shared Shared vocabularies/types (capabilities, job types, ledger types)
packages/config TSConfig and ESLint presets
infra           docker-compose for local dev, Coolify and Cloudflare runbooks
docs/plans      Build plans, phases and rules
freebuff-plans  Canonical plan pack (ALL-PLANS-COMBINED.md is generated from it)
```

## Environment

Every server variable is validated with Zod at boot (`apps/api/src/env.ts`).
Invalid or missing values stop the process with field names only — never the
values, which are usually secrets. `.env.example` lists all variables.

`PROVIDER_MODE` defaults to `fake`. Real provider calls require `PROVIDER_MODE=real`
and a spending cap, both from Phase 2.

In production the following are required: `BETTER_AUTH_SECRET`, `RESEND_API_KEY`,
`TURNSTILE_SECRET_KEY`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
`SIGNUP_GRANT_CREDITS` is forced to `0` in production.

## Phase 1 — what was built

- **Better Auth**: email/password with verification, password reset via Resend,
  optional Google login, Turnstile on signup/reset; `profiles` and
  `credit_accounts` created on signup. Cross-site cookies in production.
- **Credit ledger**: append-only `credit_ledger` with one `spend` and at most
  one `refund` per job (unique indexes), account row locked `FOR UPDATE`,
  every balance change in the same transaction as its ledger row.
- **Assets**: presigned direct-to-storage upload, size/mime/duration validation,
  signed download URLs, ffprobe when available.
- **BullMQ**: `provider-jobs`, `media-jobs`, `maintenance` queues;
  `worker-io` and `worker-media` entrypoints; bull-board admin UI.
- **Resumable step runner**: provider `external_id` persisted immediately after
  submit; Redis job lock; crash-resume without resubmitting; sweeper re-enqueues
  lost jobs and fails stuck ones.
- **Fake provider**: bundled CC0 fixtures for all capabilities, deterministic
  fail/timeout modes for testing refunds and resume.
- **Endpoints**: `/me`, `/models`, `/quotes`, `/jobs` (create/list/get/cancel/
  delete with idempotency), SSE progress polling, `/uploads` presign/complete,
  `/assets` download, provider webhooks (fake only, replay-deduped), admin
  credit adjustment. Rate limits on job creation and upload presign.
- **Minimal web pages**: login, signup, forgot/reset password, home prompt box,
  library — wired to the API via Better Auth client.
- **Tests**: credit spend/refund/idempotency, job create/idempotency/refund,
  crash-resume, webhook idempotency, upload limits, pricing.

See `PROGRESS.md` for the phase checklist and `freebuff-plans/phase.md` for the
full plan.
