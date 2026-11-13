# 06 — Frontend (Next.js on Cloudflare)

## Goals

- A large prompt box on the home page with template and style examples underneath (OpenArt / Kling feel).
- Fast on phones, accessible to Deaf and hard-of-hearing users, and simple enough to use without a tutorial.

## Stack

Next.js (App Router) + TypeScript, Tailwind CSS, shadcn/ui components, TanStack Query (server state), Zustand only for small UI state, Zod schemas and the typed API client from `packages/shared`, Playwright for smoke tests.

## Sitemap

| Route | Purpose |
|---|---|
| `/` | Create: prompt box, mode tabs, template grid |
| `/create/video` | Text-to-video and image-to-video |
| `/create/image` | Image generation |
| `/tools` | Tool grid: Lip sync, Captions |
| `/tools/lip-sync` | Lip sync |
| `/tools/captions` | Captions |
| `/templates/[slug]` | Template detail, prefilled prompt |
| `/library` | All my jobs and files |
| `/library/[jobId]` | Result viewer with download and share |
| `/pricing` | Plans |
| `/billing` | Credits, history, plan changes |
| `/account` | Profile, delete my data |
| `/login`, `/signup`, `/reset` | Auth (Turnstile on signup/reset) |
| `/admin/*` | Templates, users, failed jobs (role-gated) |

## Layout

- **Desktop:** left rail (Create, Tools, Library, Templates), top bar (credit balance, Upgrade, avatar).
- **Mobile web:** bottom tab bar (Create, Tools, Library, Account). Same routes, later reused as the Expo structure.
- **Home page:** hero prompt box → mode chips (Video, Image) → model and settings row (model, duration, aspect, resolution) → "Generate" with live credit cost → template grid by category → style examples.

## Key components

| Component | Notes |
|---|---|
| `PromptBox` | Multiline, character count, image attach (for image-to-video), cost preview |
| `ModelPicker` | Reads `/v1/models`, shows credits per unit |
| `TemplateGrid` / `TemplateCard` | Hover-play preview (muted), click prefills `PromptBox` |
| `JobCard` | Thumbnail, status, progress, retry/delete |
| `JobProgress` | Steps from SSE (e.g. Queued → Generating → Saving → Done) |
| `UploadDropzone` | Presigned upload with progress, validation messages |
| `VideoPlayer` | Poster image, captions track, keyboard controls |
| `CreditMeter`, `UpgradeDialog` | Always visible; blocks submit with a clear message when short |

## Design direction

- Dark theme with one strong accent color, large type, rounded cards, lots of video thumbnails. The same general feel as OpenArt and Kling.
- **Do not copy** their logos, exact color values, copy, or layouts pixel for pixel. Define your own tokens and name.
- Tokens in CSS variables: `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--danger`, spacing scale, radius scale. Support a light theme later.
- Create the design in a design tool or with AI assistance first (home, create, library, pricing), then build components.

## Accessibility (non-negotiable for this audience)

- Captions available on every playable video, including template previews.
- Never rely on sound for notifications. Use visual toasts, plus email and push when ready.
- Keyboard-navigable everything, visible focus rings, WCAG AA contrast.
- Respect `prefers-reduced-motion` (turn off hover-autoplay previews).
- Clear plain-language errors. Avoid jargon.
- Consider an accessibility review of the UI during the beta, including by Deaf and hard-of-hearing users.

## Data and state

- All data comes from the API through TanStack Query. Keys: `['me']`, `['models']`, `['jobs', filters]`, `['job', id]`.
- Job progress via `EventSource` on `/v1/jobs/:id/events`, with a polling fallback every 5 s.
- Auth: cookie session from the API domain. Handle 401 by redirecting to `/login`.
- Idempotency: generate a UUID per submit attempt and send it as `Idempotency-Key`.
- Uploads go direct to R2 (see `05`).

## Performance

- Thumbnails everywhere in lists. Videos load only when opened or hovered.
- Lazy-load the template grid below the fold, paginate the library with cursors.
- Keep the Workers bundle small: avoid heavy server components and large client libraries.

## Testing

- Playwright smoke tests: signup (with test Turnstile key), create a fake job, see it complete, open library.
- Run against the fake provider in CI.

## Definition of done (Phases 2–3)

- [ ] Home page with working prompt box and cost preview
- [ ] Library with progress, retry, delete, download
- [ ] Mobile-responsive and keyboard-accessible
- [ ] Deployed on `workers.dev`, then on the real domain
