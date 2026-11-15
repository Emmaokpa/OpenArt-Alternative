# UI decision — the `client/` prototype is the source of truth

> Original note from the developer (kept verbatim):
>
> The client folder you see above i prototyped it with arena ai and it is my ui, so instead of creating new ui we would be editing it, and it is built in react js, sowe would be changing it to next js, and we are going to use 100% the ui structure you see in the client folder because the ui carries exactly a large prompt box and the videos templates, instead you would connect it to the backend and make the neccesary changes that needs to be made and make this platform to be dynamic connected to the backend and database so it means the ui wuldbe changed from react to next js

## Decision (confirmed)

1. **`client/` was the design source of truth.** It has been fully ported to Next.js in `apps/web/` during Phase 3. The `client/` folder has been removed from the repo — it is no longer needed as a separate app.
2. **The target is Next.js, not React + Vite.** The port is complete. `apps/web/` (App Router) is the production web app. No separate Vite build ships.
3. **The port happened in Phase 3.** Phase 1 (job engine) and Phase 2 (real tools) came first, per `phase.md`.
4. **Everything is data-driven.** The hard-coded arrays in `client/src/data/content.ts` were ported to `apps/web/data/content.ts`. Model, template, preset and "what's new" cards come from the API (`/v1/models`, `/v1/templates`). Only small UI copy stays static.
5. **Branding is ours.** The prototype borrowed the OpenArt name, mark, copy and third-party Pexels images for layout study. The structure was kept; name/logo/copy/assets should be replaced with our own before launch (also required by `06-frontend-web.md`).
6. **Target location** is `apps/web` (App Router). No new top-level app and no separate Vite build in production.

## Client → Next.js mapping (Phase 3 — complete)

| Prototype (`client/src/`) | Next.js (`apps/web/`) | Status |
|---|---|---|
| `App.tsx` (shell + scroll area + banner) | `components/shell/AppShell.tsx` | ✅ Ported |
| `components/Sidebar.tsx` | `components/shell/Sidebar.tsx` | ✅ Ported |
| `components/TopBar.tsx` | `components/shell/TopBar.tsx` | ✅ Ported |
| `components/PromoBanner.tsx` | `components/shell/PromoBanner.tsx` | ✅ Ported |
| `components/Hero.tsx` (prompt box) | `components/create/PromptBox.tsx` + `components/create/ModeToggle.tsx` | ✅ Ported |
| `components/DirectVideo.tsx` | `components/create/DirectVideo.tsx` | ✅ Ported |
| `components/WhatsNew.tsx` | `components/discovery/WhatsNew.tsx` | ✅ Ported |
| `components/Presets.tsx` | `components/discovery/PresetGrid.tsx` | ✅ Ported |
| `components/Models.tsx` (`PopularModels`, `TrendingTemplates`, `Footer`) | `components/discovery/ModelRail.tsx`, `components/discovery/TemplateRail.tsx` | ✅ Ported |
| `components/ui.tsx` (`LogoMark`, badges, `SectionHeader`, `Avatar`) | `components/ui/*` | ✅ Ported |
| `data/content.ts` | `data/content.ts` + API-backed hooks | ✅ Ported |
| `utils/cn.ts` | `lib/cn.ts` | ✅ Ported |
| `index.css` (Tailwind 4 tokens + animations) | `app/globals.css` | ✅ Ported |

## Rules for the port (complete)

- Component boundaries were kept so future phases can move pieces without a rewrite.
- Client components only where state/interaction exists (`"use client"`); catalog sections fetch on the server where possible.
- Shared API types from `packages/shared` are used; no `any`.
- Video cards use posters and load media on open/hover.
- Accessibility from `06` applies: captions on every video, keyboard navigation, reduced-motion off switch for hover autoplay.
