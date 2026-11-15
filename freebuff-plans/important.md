# UI decision — the `client/` prototype is the source of truth

> Original note from the developer (kept verbatim):
>
> The client folder you see above i prototyped it with arena ai and it is my ui, so instead of creating new ui we would be editing it, and it is built in react js, sowe would be changing it to next js, and we are going to use 100% the ui structure you see in the client folder because the ui carries exactly a large prompt box and the videos templates, instead you would connect it to the backend and make the neccesary changes that needs to be made and make this platform to be dynamic connected to the backend and database so it means the ui wuldbe changed from react to next js

## Decision (confirmed)

1. **`client/` is the design source of truth.** Do not design a new UI and do not
   replace the layout with a generic dashboard. Port what is there: the promo
   banner, the collapsible sidebar, the top bar with the credit pill, the
   spotlighted prompt box, the template/preset/model rails, the footer, and the
   dark/pink/lime visual language.
2. **The target is Next.js, not React + Vite.** `client/` stays untouched as the
   reference until the port. It is a prototype, not a workspace package, and it
   will not ship as-is.
3. **The port happens in Phase 3**, not before. Phase 1 (job engine) and Phase 2
   (real tools) come first, per `phase.md`.
4. **Everything becomes data-driven.** The hard-coded arrays in
   `client/src/data/content.ts` are placeholders: model, template, preset and
   "what's new" cards must come from the API (`/v1/models`, `/v1/templates`, and
   admin-managed content later). Only small UI copy (mode chips, prompt
   suggestions, footer links) stays static.
5. **Branding is ours.** The prototype borrows the OpenArt name, mark, copy and
   third-party Pexels images for layout study. Keep the *structure*, replace the
   name/logo/copy/assets with our own before launch (also required by
   `06-frontend-web.md`).
6. **Target location** is `apps/web` (App Router), with the mapping below. No new
   top-level app and no separate Vite build in production.

## Client → Next.js mapping (Phase 3)

| Prototype (`client/src/`) | Next.js (`apps/web/`) |
|---|---|
| `App.tsx` (shell + scroll area + banner) | `app/(app)/layout.tsx` + `components/shell/AppShell.tsx` |
| `components/Sidebar.tsx` | `components/shell/Sidebar.tsx` |
| `components/TopBar.tsx` | `components/shell/TopBar.tsx` |
| `components/PromoBanner.tsx` | `components/shell/PromoBanner.tsx` |
| `components/Hero.tsx` (prompt box) | `components/create/PromptBox.tsx` + `ModeToggle.tsx` |
| `components/DirectVideo.tsx` | `components/create/DirectVideo.tsx` |
| `components/WhatsNew.tsx` | `components/discovery/WhatsNew.tsx` |
| `components/Presets.tsx` | `components/discovery/PresetGrid.tsx` |
| `components/Models.tsx` (`PopularModels`, `TrendingTemplates`, `Footer`) | `components/discovery/ModelRail.tsx`, `TemplateRail.tsx`, `components/shell/Footer.tsx` |
| `components/ui.tsx` (`LogoMark`, badges, `SectionHeader`, `Avatar`) | `components/ui/*` |
| `data/content.ts` | API-backed hooks in `lib/api`; static chips/prompts in `data/ui.ts` |
| `utils/cn.ts` | `lib/cn.ts` |
| `index.css` (Tailwind 4 tokens + animations) | `app/globals.css` |

## Rules for the port

- Keep the component boundaries above so future phases can move pieces without a
  rewrite.
- Client components only where state/interaction exists (`"use client"`);
  catalog sections fetch on the server where possible.
- Use the shared API types from `packages/shared`; no `any`.
- Swap `<img>` for `next/image` only with `unoptimized` (the Worker stays thin);
  video cards use posters and load media on open/hover.
- Accessibility from `06` still applies: captions on every video, keyboard
  navigation, reduced-motion off switch for hover autoplay.
