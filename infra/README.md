# Infra

## Local development

```bash
cp .env.example .env     # once
pnpm infra:up            # Postgres 16 + Redis 7 in Docker
pnpm install
pnpm db:migrate
pnpm dev                 # API on :8080, web on :3000
```

- `docker-compose.dev.yml` — local Postgres and Redis only. No media service yet:
  ffmpeg arrives with the job engine (Phase 1).
- Connections: `postgres://app:app@localhost:5432/app`, `redis://localhost:6379`.

Stop the containers with `pnpm infra:down` (data survives in named volumes).

## Production

- [`coolify.md`](./coolify.md) — VPS services, memory limits, Redis and Postgres settings.
- [`cloudflare.md`](./cloudflare.md) — R2 buckets, CORS, tokens, and the Workers deploy.

The VPS budget assumes 8 GB RAM / 100 GB SSD (see `docs/plans/01-architecture-and-vps.md`).
Every container gets a memory limit so a single process cannot starve the box.
