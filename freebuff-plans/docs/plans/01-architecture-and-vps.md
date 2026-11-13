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
