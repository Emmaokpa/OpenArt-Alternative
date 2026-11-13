# Coolify runbook (Phase 0)

Target: one VPS, 8 GB RAM / 100 GB SSD. Allocations from
`docs/plans/01-architecture-and-vps.md`.

| Service                    | Memory limit | Notes                                   |
| -------------------------- | ------------ | --------------------------------------- |
| OS, Docker, Coolify, proxy | 1.5 GB       | reserved, not a container limit         |
| Postgres                   | 1.5 GB       | `shared_buffers` 1 GB                   |
| Redis                      | 0.5 GB       | `maxmemory 512mb`, `noeviction`, AOF on |
| API                        | 0.5 GB       | Node heap capped                        |
| worker-io (Phase 1)        | 0.5 GB       |                                         |
| worker-media (Phase 1)     | 1.5 GB       | ffmpeg concurrency 1                    |

## 1. Postgres service

Create a Postgres 16 service, then set:

- **Persistent volume** mounted at `/var/lib/postgresql/data` (never ephemeral).
- **Memory limit** 1.5 GB, memory reservation ~768 MB.
- **Public port**: none. Internal Docker network only.
- Server settings (Coolify → service → environment or a mounted `postgresql.conf`):

```
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 50
```

- Scheduled backups: daily to R2 (the `app-backups` bucket), keep 7 daily + 4 weekly.
- Note the internal connection string, e.g.
  `postgres://USER:PASSWORD@<service-name>:5432/<db>`.

## 2. Redis service

- Redis 7 with a persistent volume at `/data`.
- **Memory limit** 0.5 GB.
- Command/extra args: `--appendonly yes --maxmemory 512mb --maxmemory-policy noeviction`.
  `noeviction` matters: BullMQ jobs must not be evicted under pressure.
- No public port.
- Internal URL, e.g. `redis://<service-name>:6379`.

## 3. API application

- New application from the repo, **Dockerfile build**, Dockerfile path
  `apps/api/Dockerfile`, build context = repo root (the image needs the workspace).
- HTTP port 8080, health check path `/healthz` (returns 503 until both Postgres
  and Redis answer, so a half-up deploy is never marked healthy).
- Memory limit 0.5 GB. Set `NODE_OPTIONS=--max-old-space-size=384` so the heap
  stays inside the container limit.
- Environment variables (Coolify → Environment, never in the repo):

```
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
DATABASE_URL=postgres://...       # internal service hostname
REDIS_URL=redis://...             # internal service hostname
CORS_ORIGINS=https://app.domain.com
PROVIDER_MODE=fake                # stays fake until Phase 2
```

- Apply migrations with a **pre-deployment command**: `pnpm --filter @app/api db:migrate:prod`.
  The image ships the compiled migrator and `apps/api/drizzle/`, and the process
  exits when done. Do not run migrations on every container boot.
- Log rotation: Docker `max-size=10m`, `max-file=3` (Coolify → Advanced).

## 4. Networking

Preferred: Cloudflare Tunnel so no inbound ports are exposed on the VPS.
Otherwise firewall 80/443 to Cloudflare IP ranges only, and keep Postgres and
Redis internal.

`api.domain.com` and `app.domain.com` must share a parent domain so session
cookies work later (`Domain=.domain.com`, `Secure`, `SameSite=Lax`).

## 5. Verify

```bash
curl -i https://api.domain.com/healthz
# 200 {"status":"ok","checks":{"database":"ok","redis":"ok"},...}
```

Then confirm `/healthz` turns 503 when Redis is stopped — that proves the check
is real, not a constant.
