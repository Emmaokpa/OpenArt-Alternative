# Progress

## Current phase: 0 — Foundations ✅ COMPLETE

Phase 0 is 100% complete. All code is complete and verified locally and in production.

## Phase 0 checklist (all done)

### A. Finish the Docker install (all-users installation)

- [x] **Restarted Windows.** VirtualMachinePlatform and WSL enabled after reboot.
- [x] Launched Docker Desktop, accepted agreement, skipped account sign-in, whale stopped animating.
- [x] Settings → Resources → Advanced: CPUs **6**, Memory **3.5 GB**, Swap **2 GB**, Virtual disk **64 GB**.
- [x] Settings → General: Start Docker Desktop on sign-in **on**, Resource Saver **off**.
- [x] Settings → Docker Engine: added `"log-driver": "json-file"` with `"log-opts": { "max-size": "10m", "max-file": "3" }`, Applied & restarted.
- [x] Verified in new terminal:
  `docker info --format '{{.OSType}} cpus={{.NCPU}} mem={{.MemTotal}}'` → `linux cpus=8 mem=4026171392`
  `docker compose version` → v5.7.0

### B. Prove the stack locally

- [x] `pnpm install --frozen-lockfile` — succeeded.
- [x] `pnpm infra:up` — postgres and redis containers started.
- [x] `docker compose -f infra/docker-compose.dev.yml ps` → both `(healthy)`.
- [x] `pnpm db:migrate` → `0000_init_core_schema` applied cleanly.
- [x] `docker compose -f infra/docker-compose.dev.yml exec postgres psql -U app -d app -c '\dt'` → **18 tables**, no `asl_*` table.
- [x] `pnpm dev` — running, API listening on port 8080.
- [x] `curl -i http://localhost:8080/` → **200** with `x-request-id` header.
- [x] `curl -i http://localhost:8080/healthz` → **200** `{"database":"ok","redis":"ok"}`.
- [x] Opened <http://localhost:3000> → hello-world page rendered.
- [x] `pnpm infra:down` → `/healthz` returned 503 with `{"database":"error","redis":"error"}`; `pnpm infra:up` again → back to 200.
- [x] Ctrl-C `pnpm dev` → exited cleanly on first signal.

### C. Get CI running

- [x] `git init -b main`, `git add -A`, committed. `.env` confirmed gitignored.
- [x] Created GitHub repo `Emmaokpa/OpenArt-Alternative`, pushed `main`.
- [x] Actions tab → install, lint, typecheck, test, build **all green**.

### D. Coolify: database and cache

- [x] Coolify installed on Contabo VPS (`144.91.72.137:8000`), API token obtained.
- [x] **Postgres 16** service: volume `/var/lib/postgresql/data`, **1.5 GB** memory, `shared_buffers=256MB`, `max_connections=50`, no public port.
  Internal URL: `postgres://app:app@l8mokskplgoycxfumftymvaw:5432/app`
- [x] **Redis 7** service: `--appendonly yes --maxmemory 512mb --maxmemory-policy noeviction`, **0.5 GB** limit, volume `/data`, no public port.
  Internal URL: `redis://default:RXPYpGpNFuUs7uHcCi8aRxYw6nlFeRA3RAlBDO7xjpkh55NfYVkn5tDXF1cgPO1D@wb8citevq3ykdmkmyovy7wdv:6379/0`

### E. Coolify: the API

- [x] Dockerfile app from GitHub repo. Build context = repo root, Dockerfile `apps/api/Dockerfile`, port **8080**, health check `/healthz`, memory **0.5 GB**, `NODE_OPTIONS=--max-old-space-size=384`.
- [x] Environment: `NODE_ENV=production`, `PORT=8080`, `LOG_LEVEL=info`, `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS=https://app-web.eokpa34.workers.dev`, `PROVIDER_MODE=fake`.
- [x] Pre-deployment command: `pnpm --filter @app/api db:migrate:prod`.
- [x] Deployed. `curl -i http://vtvlriappeqo5figm9hphkxx.144.91.72.137.sslip.io/healthz` → **200** `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`.
- [x] Stopped Redis → API detected dependency error (unhealthy → proxy 404/503 path); started Redis → back to **200**. Proves probe checks something real.

### F. Cloudflare: R2

- [x] Created buckets `app-private`, `app-public`, `app-backups`.
- [x] CORS on `app-private` and `app-public`: `GET`, `HEAD`, `PUT`, app origin, expose `ETag`, max age 3600.
- [x] Lifecycle on `app-private`: abort incomplete multipart uploads after 1 day; expire `tmp/` after 1 day.
- [x] Three API tokens (one per bucket, object read/write only) generated and saved locally. Never in repo.
- [x] Open question 2 answered: **workers.dev** for hello-world (no custom domain yet).

### G. Cloudflare: the web Worker

- [x] `opennextjs-cloudflare build` fails on Windows (`EPERM` on symlink) — used GitHub Actions on Linux instead (production path anyway).
- [x] `wrangler login` completed via OAuth.
- [x] Deployed via GitHub Actions CI deploy job: `https://app-web.eokpa34.workers.dev`.
- [x] Worker URL loads the hello-world page.
- [x] Added Worker origin to `CORS_ORIGINS` in Coolify, redeployed API, confirmed no CORS errors.

### H. Close the phase

- [x] `docker info` line: `linux cpus=8 mem=4026171392`
- [x] Local `/healthz` 200 confirmed
- [x] CI run URL: https://github.com/Emmaokpa/OpenArt-Alternative/actions (green)
- [x] Live `/healthz` 200 plus recovery after Redis restart confirmed
- [x] Worker URL: `https://app-web.eokpa34.workers.dev/` loads page

---

## Phase 0 tasks (all ticked)

- [x] Monorepo layout from `01` (`apps/api`, `apps/web`, `packages/shared`, `packages/config`, `infra`)
- [x] TypeScript strict, ESLint (flat config), Prettier, shared config package
- [x] `infra/docker-compose.dev.yml` with Postgres 16 and Redis 7 (AOF on, `noeviction`, memory limits)
- [x] Zod-validated environment config (`apps/api/src/env.ts`)
- [x] Drizzle setup + `0000_init_core_schema` migration (18 tables, no ASL tables)
- [x] GitHub Actions CI: install, lint, typecheck, test, build (`.github/workflows/ci.yml`)
- [x] Hello-world API with `/healthz` checking Postgres and Redis
- [x] Deploy-time migration entrypoint (`dist/migrate.js`, run as a pre-deployment command)
- [x] Hello-world Next.js app with OpenNext + `wrangler.jsonc` for Workers
- [x] Coolify Postgres and Redis services (memory limits, volumes)
- [x] Cloudflare R2 buckets, CORS, lifecycle, scoped tokens
- [x] Deploy API to Coolify; `/healthz` live on the VPS
- [x] Deploy web hello-world to `workers.dev`
- [x] Run migrations against the production database (via pre-deployment command)

---

## Done (verified)

**Locally (Windows, Node 26, pnpm 10.34.9):**
- `pnpm install --frozen-lockfile` — lockfile committed and reproducible.
- `pnpm lint` — 4/4 packages clean.
- `pnpm typecheck` — 5/5 tasks clean.
- `pnpm test` — 11 tests passing.
- `pnpm build` — shared, api, web all built successfully.
- Migration applied to real Postgres: 18 tables, 33 indexes, constraints enforced.
- API smoke test: `GET /` → 200, `GET /healthz` → 200 with live deps, 503 when deps down.

**Production (Coolify VPS + Cloudflare):**
- Postgres 16 and Redis 7 running healthy on Coolify.
- API deployed to Coolify, `/healthz` → **200** `{"status":"ok","checks":{"database":"ok","redis":"ok"}}`.
- Web Worker deployed to `https://app-web.eokpa34.workers.dev/`.
- CI green on GitHub Actions (including Linux build of Worker via OpenNext).
- Production migrations ran via `dist/migrate.js` pre-deployment command.

---

## Decisions made

1. **Auth tables now, auth logic in Phase 1.** Four Better Auth tables declared in Drizzle as schema only.
2. **`@app/shared` is a built package** (ESM + declarations) for runtime and Drizzle Kit resolution.
3. **`/healthz` opens a one-shot Redis connection** per probe to avoid log floods.
4. **Stack versions pinned:** pnpm 10.34.9, Node ≥ 24, TypeScript 6.0.3, Express 5.3.0, Drizzle 0.45.4, Zod 4.6.7, Next 16.4.6, OpenNext 1.20.17, wrangler 4.161.0.
5. **Drizzle over Prisma.**
6. **No MinIO yet.** Local object storage arrives with presigning in Phase 1.
7. **`apps/web` is hello-world only.** `client/` prototype untouched; Phase 3.
8. **`.npmrc` retry settings** for unstable connection.
9. **Migrations run from `dist/migrate.js`** as Coolify pre-deployment command.

---

## Open questions (resolved)

1. **Deploy access:** ✅ Provided — Coolify API token + VPS SSH access + Cloudflare account all configured.
2. **Domain:** ✅ `workers.dev` used for hello-world (`https://app-web.eokpa34.workers.dev/`). Custom domain can be added later.
3. **pnpm 10 / Node 24 pinning:** ✅ Kept as-is (pnpm 10.34.9, Node 24 in CI, Node 26 locally).
4. **Better Auth schema:** ✅ OK to regenerate `auth.ts` from Better Auth CLI in Phase 1.
5. **Local object storage in Phase 1:** ✅ Decision deferred to Phase 1 (MinIO vs dev R2 bucket).

---

## Known issues (resolved)

- Docker Desktop was not installed → ✅ Installed and configured on Windows.
- `/healthz` only returned 503 locally → ✅ 200 confirmed with live Postgres + Redis.
- Redis health path only verified against down Redis → ✅ 200 confirmed with live Redis; dependency failure path confirmed when Redis stopped.
- `opennextjs-cloudflare build` fails on Windows → ✅ Built via GitHub Actions on Linux instead.
- `/healthz` not deployed, Worker not deployed, migrations not run against production → ✅ All deployed and verified.
- No git repository initialized → ✅ Initialized, pushed to GitHub, CI green.

---

**Phase 0 is complete. Ready to start Phase 1 (auth, ledger, uploads, queues, fake provider).**