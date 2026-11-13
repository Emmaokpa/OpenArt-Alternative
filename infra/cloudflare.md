# Cloudflare runbook (Phase 0)

Details from `docs/plans/05-storage-and-cloudflare.md`. No user media is
uploaded in Phase 0, so buckets are created and configured now, used in Phase 1.

## 1. R2 buckets

Create three buckets (same region as the VPS if possible):

| Bucket        | Access                      | Contents                               |
| ------------- | --------------------------- | -------------------------------------- |
| `app-private` | Private, signed URLs only   | uploads, outputs, thumbnails, captions |
| `app-public`  | Public via `cdn.domain.com` | template previews, marketing assets    |
| `app-backups` | Private                     | Postgres backups                       |

For each bucket:

- **CORS** (app origin only): allow `GET`, `HEAD`, `PUT` from
  `http://localhost:3000` and `https://app.domain.com`; expose `ETag`; max age 3600.
- **Lifecycle**: on `app-private`, delete `tmp/` after 1 day. Add output/upload
  expiry rules in Phase 4 when retention is confirmed with the client.
- Key convention is in `docs/plans/05-storage-and-cloudflare.md`. Never put
  user-supplied file names in keys.

## 2. API tokens

R2 tokens are scoped per bucket and per consumer. Create three, and store them
only in the matching environment (never in the repo):

| Token     | Scope                                            |
| --------- | ------------------------------------------------ |
| `api`     | `app-private` and `app-public` object read/write |
| `workers` | `app-private` object read/write                  |
| `backups` | `app-backups` object read/write                  |

Phase 0 does not need these in the API environment yet; add them in Phase 1
together with the Zod-validated config entries.

## 3. Public CDN

Add custom domain `cdn.domain.com` to `app-public` after the domain is on
Cloudflare. Template previews then serve from
`https://cdn.domain.com/templates/{slug}/preview.mp4` with long cache headers.

## 4. Web app on Workers

Prerequisites: a Cloudflare account (Workers free plan is enough for the
hello-world; expect the $5/month paid plan once the real bundle lands) and
`wrangler` authenticated.

```bash
pnpm --filter @app/web exec wrangler login   # or set CLOUDFLARE_API_TOKEN
pnpm --filter @app/web deploy                # opennextjs-cloudflare build + deploy
```

First deploy prints `https://app-web.<subdomain>.workers.dev` — that is the
Phase 0 acceptance URL, no domain purchase needed.

Notes:

- `apps/web/wrangler.jsonc` sets `nodejs_compat`, the Worker name `app-web`,
  and the `.open-next/assets` binding.
- Build on Linux/CI if the local build is flaky; Workers bundles are platform
  independent but `workerd` binaries are not.
- Environment: `NEXT_PUBLIC_API_URL` is baked in at build time, so set it before
  `pnpm --filter @app/web deploy` (e.g. `https://api.domain.com`). Local dev
  falls back to `http://localhost:8080`.
- Branch previews and the production deploy from `main` are set up in Phase 6.

## 5. Verify

```bash
curl -I https://app-web.<subdomain>.workers.dev
```

Then point the page's `/healthz` link at the deployed API and confirm both live
URLs are reachable.
