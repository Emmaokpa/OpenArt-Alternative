# Progress

## Current phase: 0 — Foundations

Code is complete and verified locally. The four live steps (Coolify Postgres/Redis,
API `/healthz`, `workers.dev` web, production migration) need Coolify/Cloudflare
credentials and are **not done**. The full checklist to close them is
_Your todo_ below.

## Your todo — finish Phase 0 end to end

Do these in order. Each item names the result that proves it worked; if the result
differs, stop there and tell me. Roughly 2–3 hours, most of it waiting on installs
and the first Coolify build. Settings and values for D–G are in
`infra/coolify.md` and `infra/cloudflare.md`.

### A. Finish the Docker install (you chose all-users installation)

- [ ] **Restart Windows now.** The installer enabled `VirtualMachinePlatform` and
      WSL; neither works until the reboot.
- [ ] Launch Docker Desktop, accept the agreement, skip the account sign-in, wait
      until the whale icon stops animating.
- [ ] Settings → Resources → Advanced: **CPUs 6**, **Memory 3.5 GB**, **Swap 2 GB**,
      **Virtual disk 64 GB**. With 7.9 GB total RAM anything higher starves Windows
      during builds.
- [ ] Settings → General: keep _Start Docker Desktop when you sign in_ on and turn
      **Resource Saver off** — it pauses idle containers, so Postgres stops answering
      between test runs.
- [ ] Settings → Docker Engine: add `"log-driver": "json-file"` with
      `"log-opts": { "max-size": "10m", "max-file": "3" }` next to the existing keys,
      then _Apply & restart_, so logs cannot grow into gigabytes.
- [ ] Verify in a **new** terminal (PATH only refreshes there):
      `docker info --format '{{.OSType}} cpus={{.NCPU}} mem={{.MemTotal}}'` must print
      `linux cpus=6 mem≈3.5GiB`, and `docker compose version` must print a version.
      If `OSType` says `windows`, the WSL2 engine is off.

### B. Prove the stack locally (this closes the untested 200 path)

- [ ] `pnpm install --frozen-lockfile`
- [ ] `pnpm infra:up`
- [ ] `docker compose -f infra/docker-compose.dev.yml ps` → `postgres` and `redis`
      both `(healthy)`
- [ ] `pnpm db:migrate` → `0000_init_core_schema` applies cleanly
- [ ] `docker compose -f infra/docker-compose.dev.yml exec postgres psql -U app -d app -c '\dt'`
      → 18 tables, no `asl_*` table
- [ ] `pnpm dev`, then leave it running in that terminal
- [ ] `curl -i http://localhost:8080/` → 200 with an `x-request-id` header
- [ ] `curl -i http://localhost:8080/healthz` → **200** `{"database":"ok","redis":"ok"}`
- [ ] Open <http://localhost:3000> → the hello-world page renders
- [ ] `pnpm infra:down`, then `curl -i http://localhost:8080/healthz` → **503** with
      both dependencies `error`, no stack trace in the body, no secret in the logs;
      then `pnpm infra:up` again
- [ ] Ctrl-C `pnpm dev` → it exits cleanly on the first signal

### C. Get CI running (it has never executed)

- [ ] `git init -b main`, `git add -A`, commit. Check `git status` shows **no** `.env`
      — it must stay gitignored.
- [ ] Create an empty repo on GitHub, `git remote add origin <url>`,
      `git push -u origin main`
- [ ] Actions tab → install, lint, typecheck, test, build all green. Step D needs
      this repo anyway.

### D. Coolify: database and cache

- [ ] Install Coolify on the VPS (or use an existing instance) and open its UI
- [ ] **Postgres 16** service: volume at `/var/lib/postgresql/data`, **1.5 GB**
      memory limit, `shared_buffers=256MB`, `max_connections=50`, no public port.
      Copy the internal connection string.
- [ ] **Redis 7** service: `--appendonly yes`, `--maxmemory 512mb`, `--maxmemory-policy noeviction`, **0.5 GB** limit, volume at `/data`, no public port. Copy the internal connection string.

### E. Coolify: the API

- [ ] New resource → Dockerfile app from the GitHub repo. Build context = **repo
      root** (not `apps/api`), Dockerfile `apps/api/Dockerfile`, exposed port
      **8080**, health check `/healthz`, memory limit **0.5 GB**,
      `NODE_OPTIONS=--max-old-space-size=384`
- [ ] Environment: `NODE_ENV=production`, `PORT=8080`, `LOG_LEVEL=info`,
      `DATABASE_URL`, `REDIS_URL`, `CORS_ORIGINS`, `PROVIDER_MODE=fake`. Use the
      internal service hostnames from D — never `localhost`.
- [ ] Pre-deployment command: `pnpm --filter @app/api db:migrate:prod`
- [ ] Deploy, then from your machine `curl -i https://api.<domain>/healthz` →
      **200** `{"database":"ok","redis":"ok"}`
- [ ] Stop the Redis service in Coolify → `/healthz` returns **503** → start it →
      **200** again. This proves the probe checks something real in production.

### F. Cloudflare: R2

- [ ] Create buckets `app-private`, `app-public`, `app-backups`
- [ ] CORS on `app-private` and `app-public`: `GET`, `HEAD`, `PUT`, the app origin,
      expose `ETag`, max age 3600 (exact rules in `infra/cloudflare.md`)
- [ ] Lifecycle on `app-private`: abort incomplete multipart uploads after 1 day;
      expire `tmp/` after 1 day
- [ ] Three API tokens, one per bucket, object read/write only, kept in a password
      manager. Phase 1 uploads need them; they never go in the repo.
- [ ] Answer open question 2: custom domain now, or `workers.dev` for the
      hello-world

### G. Cloudflare: the web Worker

- [ ] `opennextjs-cloudflare build` fails on this Windows box (`EPERM` on symlink).
      Either enable Settings → System → For developers → **Developer Mode** and
      retry, or let GitHub Actions build it on Linux — which is what production
      will do anyway.
- [ ] `pnpm --filter @app/web exec wrangler login`, then deploy with
      `NEXT_PUBLIC_API_URL=https://api.<domain>`
- [ ] Open the printed `https://app-web.<subdomain>.workers.dev` URL → page loads
- [ ] Put that exact origin in `CORS_ORIGINS` in Coolify, redeploy the API, confirm
      the browser console shows no CORS error

### H. Close the phase

- [ ] Paste back: the `docker info` line, local `/healthz` 200, the CI run URL, the
      live `/healthz` 200 plus the 503 after stopping Redis, and the Worker URL
- [ ] Then I tick every box here, mark Phase 0 complete, and start Phase 1 (auth,
      ledger, uploads, queues, fake provider)

**Phase 0 is 100% when:** all five open checkboxes under _Phase 0 tasks_ are ticked
and steps A–G all pass. Nothing in the code is waiting on me.

### Phase 0 tasks

- [x] Monorepo layout from `01` (`apps/api`, `apps/web`, `packages/shared`, `packages/config`, `infra`)
- [x] TypeScript strict, ESLint (flat config), Prettier, shared config package
- [x] `infra/docker-compose.dev.yml` with Postgres 16 and Redis 7 (AOF on, `noeviction`, memory limits)
- [x] Zod-validated environment config (`apps/api/src/env.ts`)
- [x] Drizzle setup + `0000_init_core_schema` migration (18 tables, no ASL tables)
- [x] GitHub Actions CI: install, lint, typecheck, test, build (`.github/workflows/ci.yml`)
- [x] Hello-world API with `/healthz` checking Postgres and Redis
- [x] Deploy-time migration entrypoint (`dist/migrate.js`, run as a pre-deployment
      command) so production migrations don't depend on dev dependencies
- [x] Hello-world Next.js app with OpenNext + `wrangler.jsonc` for Workers
- [ ] Coolify Postgres and Redis services (memory limits, volumes) — needs VPS access
- [ ] Cloudflare R2 buckets, CORS, lifecycle, scoped tokens — needs account access
- [ ] Deploy API to Coolify; `/healthz` live on the VPS
- [ ] Deploy web hello-world to `workers.dev`
- [ ] Run migrations against the production database

Why they are open: every one needs an external account or host — a VPS running
Coolify, a Cloudflare account, a production `DATABASE_URL` — which this machine
does not have. Nothing in the code blocks them.

Exact steps and settings are in `infra/coolify.md` and `infra/cloudflare.md`.
Phase 0 is complete when: Docker runs locally and `/healthz` answers **200**
(not just 503); CI is green on GitHub; `GET https://api.<domain>/healthz` returns
200 and flips to 503 when Redis is stopped; the Worker URL serves the page; and
`dist/migrate.js` has been applied against the production database.

## Done

Verified on this machine (Windows, Node 26, pnpm 10.34.9):

- `pnpm install --frozen-lockfile` — lockfile committed and reproducible.
- `pnpm lint` — 4/4 packages clean.
- `pnpm typecheck` — 5/5 tasks clean (shared build + api/web/shared/config).
- `pnpm test` — 11 tests passing: env defaults/rejections/secret-safe errors,
  `/healthz` 200, 503 on dependency error, 503 on timeout, 404 envelope.
- `pnpm build` — shared (tsc, ESM + d.ts), api (tsc → `dist`), web (Next 16.4.6
  Turbopack, 2 static routes).
- Migration applied to a real Postgres engine (temporary PGlite session, removed
  afterwards): all 18 tables and 33 indexes created; "one spend per job",
  `balance >= 0`, and unknown `jobs.type` all rejected by the database.
- API runtime smoke test: boots, `GET /` → 200, `GET /healthz` → 503 with
  `{"database":"error","redis":"error"}` when nothing is running, `x-request-id`
  on every response, structured Pino logs, no secrets in responses or errors.
- `dist/migrate.js` boots, resolves `apps/api/drizzle` and attempts the migration
  connection (stops at connect here because no Postgres runs on this host).

## Decisions made

1. **Auth tables now, auth logic in Phase 1.** `03` references `"user"`, so the
   four Better Auth tables (`user`, `session`, `account`, `verification`) are
   declared in Drizzle as schema only. Phase 1 configures Better Auth; if its CLI
   produces a different shape, that file is regenerated rather than hand-edited.
2. **`@app/shared` is a built package** (ESM + declarations) rather than raw
   source exports, so the API can use the vocabularies at runtime in production
   and Drizzle Kit can resolve them.
3. **`/healthz` opens a one-shot Redis connection** per probe. A long-lived
   client retries forever and floods logs whenever Redis is down; Phase 1 adds
   the long-lived connections BullMQ needs.
4. **Stack versions pinned:** pnpm 10.34.9, Node ≥ 24 (local 26), TypeScript 6.0.3
   (7.x is outside `typescript-eslint` support), Express 5.3.0, Drizzle 0.45.4,
   Zod 4.6.7, Next 16.4.6, OpenNext 1.20.17, wrangler 4.161.0.
5. **Drizzle over Prisma**, as allowed by `phase.md`.
6. **No MinIO yet.** No uploads exist in Phase 0; local object storage arrives
   with presigning in Phase 1.
7. **`apps/web` is a hello-world only.** The `client/` prototype stays untouched;
   converting it to Next.js and wiring it to the API is Phase 3.
8. **`.npmrc` retry settings** because large tarballs (Next, swc, workerd) reset
   repeatedly on this connection during install.
9. **Migrations run from the compiled entrypoint** (`dist/migrate.js`) as a
   Coolify pre-deployment command, because the production image installs only
   prod dependencies and ships `apps/api/drizzle/` instead of `drizzle-kit`.

## Open questions for the developer

1. **Deploy access.** Can you provide a Coolify API token / SSH access and a
   Cloudflare account (or API token + account ID)? Until then the four pending
   Phase 0 items wait. Otherwise follow `infra/coolify.md` and
   `infra/cloudflare.md`.
2. **Domain.** Do you already have the domain in Cloudflare, or should the
   hello-world live only on `workers.dev` for now?
3. **pnpm 10 / Node 24 pinning** — fine, or do you want to move to pnpm 12 /
   Node 26?
4. **Better Auth schema** — OK to let Phase 1 regenerate `auth.ts` from the
   Better Auth CLI if it differs?
5. **Local object storage in Phase 1** — MinIO in `docker-compose.dev.yml`, or a
   development R2 bucket?

## Known issues

- Docker Desktop was not installed when this was written, so `pnpm dev` never
  started a local database here and `/healthz` only ever returned 503. The compose
  file stays untested on this host until step B of the todo passes.
- The Redis health path was only verified against a **down** Redis (correct 503,
  no log spam). Nothing has confirmed the 200 path with a live Redis.
- `opennextjs-cloudflare build` fails on Windows with `EPERM` on `symlink`
  (`@opennextjs/aws` copies the standalone tree). Deploy from Linux/CI; the
  Next production build itself passes.
- `/healthz` is not deployed, the Worker is not deployed, and migrations have not
  run against production — all waiting on credentials.
- No git repository is initialized in this workspace, so CI has not run on
  GitHub yet.
- `apps/api/src/app.ts` uses the generic `internal_error` / `not_found` codes;
  the full stable code list from `02` lands with the job API in Phase 1.
