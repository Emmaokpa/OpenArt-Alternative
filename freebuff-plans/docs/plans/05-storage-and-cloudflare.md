# 05 — Storage and Cloudflare

## What Cloudflare hosts

| Piece | Service |
|---|---|
| Web app (Next.js) | Workers via OpenNext (`@opennextjs/cloudflare`) |
| Files (videos, images, audio, captions) | R2 |
| DNS, SSL, CDN, WAF | Cloudflare free plan |
| Bot protection on signup | Turnstile |
| Optional tunnel to the VPS | Cloudflare Tunnel |

## R2 buckets

| Bucket | Visibility | Contents |
|---|---|---|
| `app-private` | Private (signed URLs only) | User uploads, generated outputs, thumbnails, captions |
| `app-public` | Public via `cdn.domain.com` | Template preview videos and thumbnails, marketing assets |
| `app-backups` | Private | Postgres backups |

Free tier covers 10 GB, 1M writes and 10M reads per month, with no egress fees. Check Cloudflare's current pricing page before launch.

## Object key convention

```
u/{userId}/jobs/{jobId}/input/{assetId}.{ext}
u/{userId}/jobs/{jobId}/output/{assetId}.mp4
u/{userId}/jobs/{jobId}/thumb/{assetId}.jpg
u/{userId}/jobs/{jobId}/captions/{assetId}.vtt
tmp/{uuid}                       (lifecycle: delete after 1 day)
templates/{slug}/preview.mp4     (public bucket)
```

Never put user-supplied filenames in keys. Store the original name in the database.

## Upload flow (browser → R2 directly)

1. `POST /v1/uploads/presign` with `{ kind, mime, sizeBytes, durationHint }`.
2. The API checks limits, creates an `assets` row (`status=pending`), and returns a presigned PUT (or multipart upload parts for large files).
3. Browser uploads straight to R2 with progress reporting.
4. `POST /v1/uploads/complete`. The API runs `HEAD` on the object, then queues validation (ffprobe for duration, resolution, codec).
5. Assets that fail validation are deleted and the user gets a clear message.

Launch limits (raise later):

| Input | Limit |
|---|---|
| Video for captions or lip sync | 5 minutes, 500 MB, MP4/MOV/WebM |
| Image-to-video image | 20 MB, JPEG/PNG/WebP |
| Lip sync audio | 10 minutes, 50 MB |

R2 needs a CORS rule allowing your app origin for `PUT`, `GET`, and `HEAD`.

## Download flow

- **Private files:** the API issues short-lived presigned GET URLs (e.g. 1 hour) when the web app loads the library. Never store signed URLs in the database.
- **Public template previews:** served from `cdn.domain.com` with long cache headers.
- Use `preload="metadata"` and thumbnails in lists so a library page doesn't download dozens of videos.
- Cloudflare's cache has a per-file size cap (512 MB reported). Your clips are far smaller.

## Worker → R2 transfer

- Stream provider output URL → R2 (`pipeline`/multipart upload). Never load a whole video in memory on an 8 GB box.
- For ffmpeg, download inputs to `/tmp/work/{jobId}`, process, upload outputs, then delete the directory in `finally`.

## Retention (proposed defaults — confirm with the client)

| Object | Rule |
|---|---|
| `tmp/` | Delete after 1 day (R2 lifecycle rule) |
| Source uploads | Delete 7 days after job completion unless the user keeps them |
| Outputs | Keep while subscribed + 30 days |
| Backups | 7 daily + 4 weekly |

Privacy matters here: users upload their own videos. Say plainly in the privacy policy how long files are kept, and offer "delete my files" in the UI.

## Web deployment (Next.js on Workers)

- Use the OpenNext Cloudflare adapter and `wrangler`. Enable the `nodejs_compat` flag.
- Keep the web app thin: pages call the VPS API directly from the browser (`NEXT_PUBLIC_API_URL=https://api.domain.com`). Avoid heavy server-side logic on Workers.
- The free Workers plan has tight limits (script size, CPU time). Expect to need the $5/month paid plan once the app bundle grows. Test early.
- Preview deployments per branch, production deploy from `main` via GitHub integration or Actions.
- Custom domains: `app.domain.com` (web), `api.domain.com` (VPS), `cdn.domain.com` (R2 public).

## Security on the Cloudflare side

- Turnstile on signup, login after failures, and password reset (verify the token server-side).
- WAF managed rules on; add a rate-limit rule on `/api/auth/*`.
- Lock the VPS to Cloudflare (Tunnel, or firewall to Cloudflare IP ranges).
- R2 API tokens scoped per bucket, with separate tokens for the API, workers, and backups.
- Security headers on the web app: CSP, `X-Content-Type-Options`, `Referrer-Policy`.

## Checklist

- [ ] Domain added to Cloudflare, nameservers switched
- [ ] Three R2 buckets, CORS rule, lifecycle rules, scoped tokens
- [ ] `cdn.` custom domain on the public bucket
- [ ] Tunnel or firewall rule for the VPS
- [ ] Turnstile site key and secret in env
- [ ] `workers.dev` deploy of the web app working before buying the domain
