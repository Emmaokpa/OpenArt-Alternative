# AI video platform

AI video generator: a large prompt box, templates, and a library of creations.
Generation runs on third-party providers behind adapters; credits are an
append-only ledger.

**Status:** Phase 0 — foundations. Empty but fully wired: builds, tests, and
deploys. Product features start in Phase 1. Plans live in `docs/plans/`
(a copy is kept in `freebuff-plans/`).

## Stack

pnpm workspaces + Turborepo · TypeScript strict · Express 5 + Zod + Pino ·
Postgres 16 + Drizzle · Redis 7 + BullMQ (Phase 1) · Cloudflare R2 ·
Next.js 16 on Workers via OpenNext · Expo later.

## Quick start

```bash
cp .env.example .env      # local defaults, no secrets
pnpm install
pnpm infra:up             # Postgres + Redis (Docker)
pnpm db:migrate
pnpm dev                  # API :8080 · web :3000
curl http://localhost:8080/healthz
```

`pnpm dev` needs Docker for Postgres and Redis. The API still boots without
them; `/healthz` answers `503` until both respond.

## Scripts

| Command                                      | What it does                            |
| -------------------------------------------- | --------------------------------------- |
| `pnpm dev`                                   | All apps in watch mode                  |
| `pnpm build`                                 | Production build of every package       |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | Same checks CI runs                     |
| `pnpm format`                                | Prettier                                |
| `pnpm db:generate`                           | New Drizzle migration from the schema   |
| `pnpm db:migrate`                            | Apply migrations (needs `DATABASE_URL`) |
| `pnpm infra:up` / `pnpm infra:down`          | Local Postgres and Redis                |

## Layout

```
apps/api        Express API (+ workers from Phase 1), Drizzle schema and migrations
apps/web        Next.js app, deployed to Cloudflare Workers via OpenNext
packages/shared Shared vocabularies/types (capabilities, job types, ledger types)
packages/config TSConfig and ESLint presets
infra           docker-compose for local dev, Coolify and Cloudflare runbooks
docs/plans      Build plans, phases and rules
```

## Environment

Every server variable is validated with Zod at boot (`apps/api/src/env.ts`).
Invalid or missing values stop the process with field names only — never the
values, which are usually secrets. `.env.example` lists the Phase 0 variables.

`PROVIDER_MODE` defaults to `fake`. Real provider calls require `PROVIDER_MODE=real`
and a spending cap, both from Phase 2.
