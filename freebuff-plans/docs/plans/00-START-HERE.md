# START HERE — Project Plans

**Product:** AI video generator in the style of OpenArt / Kling: a big prompt box, template and style examples underneath, and a library of creations. Niche to be decided with the client.
**Hosting:** one VPS (8 GB RAM / 100 GB SSD, Coolify) for API, database and queue. Cloudflare for the web app, file storage, DNS and bot protection.

## For the human: how to use this pack

1. Copy this whole folder into your repo as `docs/plans/`.
2. Paste the **starter prompt** (bottom of this file) into your AI tool (Freebuff).
3. After each phase: review the work, test it, then paste the **next-phase prompt**.
4. **ASL is on hold.** Do not give the AI `99-asl-ON-HOLD.md` until you decide to start Phase 8. (It is already excluded from `ALL-PLANS-COMBINED.md`.)
5. If your tool supports a project-instructions or rules file, point it at `docs/plans/00-START-HERE.md`.

## Reading order for the AI

1. `00-START-HERE.md` (this file)
2. `phase.md` — the rules and the phases, in order
3. The plan files listed under "Read first" in each phase
4. `99-asl-ON-HOLD.md` — **only in Phase 8, when the developer says so**

## Files

| File | Covers | Used in phases |
|---|---|---|
| `phase.md` | Rules for the AI and the phases to complete, in order | All |
| `01-architecture-and-vps.md` | System overview, VPS memory and disk budget, networking, monorepo layout | 0, 6 |
| `02-backend-api.md` | Express structure, endpoints, auth, credit flow, errors, rate limits | 1, 2, 5, 7 |
| `03-database.md` | Postgres schema (DDL), ledger rules, indexes, backups, retention | 0, 1, 6 |
| `04-jobs-and-providers.md` | BullMQ queues, resumable pipelines, provider adapters, fake provider | 1, 2, 4 |
| `05-storage-and-cloudflare.md` | R2 buckets, uploads, CDN, Workers/OpenNext deploy, Turnstile | 0, 1, 3, 4, 6 |
| `06-frontend-web.md` | Next.js pages, UI structure, design direction, accessibility | 3, 7 |
| `07-credits-pricing-payments.md` | Credit costs, plans ($8/$15/$25/$100), margins, payments | 2, 4, 5 |
| `99-asl-ON-HOLD.md` | **On hold.** Everything about the ASL Studio integration | 8 only |

## v1 scope

Text-to-video · Image-to-video · Image generation · Lip sync · Captions

**On hold (built last):** ASL Studio.
**Not planned:** text-to-speech, music video, custom model training.

## Principles

1. Get one job working end to end (click → provider → R2 → library) before any UI polish.
2. Every provider sits behind an adapter. Swapping providers is a data change plus one file.
3. Credits are an append-only ledger. Never overwrite a balance without a ledger row.
4. The VPS never keeps user media long-term. R2 does.
5. Build against a **fake provider** first, so development costs $0.
6. Keep job types, job steps and adapters generic so later tools plug in without rewrites.
7. Deploy early and often, so hosting problems show up in week one, not at the end.

## Roadmap (details in `phase.md`)

- [ ] **Phase 0 — Foundations**
- [ ] **Phase 1 — Job engine** (auth, credits, queue, storage, fake provider)
- [ ] **Phase 2 — Real generation tools** (text-to-video, image-to-video, image generation)
- [ ] **Phase 3 — Web app and design** (home, templates, library)
- [ ] **Phase 4 — Lip sync and captions**
- [ ] **Phase 5 — Payments**
- [ ] **Phase 6 — Deploy, harden, test** (production, backups, monitoring, private beta)
- [ ] **Phase 7 — Mobile app (Expo)**
- [ ] **Phase 8 — ASL Studio** (last, on hold)

## Open decisions

| Decision | Needed by | Notes |
|---|---|---|
| Client's niche and brand name | Phase 3 | Drives templates and default models |
| Payment provider | Phase 5 | Depends on where the client's business is registered |
| Retention policy for uploads and outputs | Phase 4 | Proposed defaults in `05` |
| Moderation provider | Phase 2 | Prompt and upload screening |
| Whether mobile launches before ASL | Phase 7 | Default order: mobile, then ASL |

## Glossary

- **Adapter:** a small module wrapping one provider behind a shared interface.
- **Ledger:** append-only table of credit changes.
- **Job / job step:** one user request, and the resumable stages inside it.

---

## Starter prompt (paste into the AI tool to begin)

> Read `docs/plans/00-START-HERE.md` and `docs/plans/phase.md` fully. We are building the project described there. Start **Phase 0 only**. Follow the working rules in `phase.md`. Do **not** open or build anything from `99-asl-ON-HOLD.md`. Before writing code, list the files you will create and any questions you have. When Phase 0 is done, update `PROGRESS.md`, summarize what you did, and stop for my confirmation.

## Next-phase prompt (paste after you confirm a phase)

> Phase N is confirmed complete. Re-read `docs/plans/phase.md`, then start **Phase N+1 only** (replace N with the real numbers). Read the files listed under that phase's "Read first" line. Before writing code, list the files you will create or change and any questions. When the phase is done, update `PROGRESS.md`, summarize, and stop for my confirmation.

## If the AI goes off track

- It starts building something from a later phase → tell it to stop and re-read `phase.md` rules 1 and 12.
- It wants to change the stack → it must ask you first (see "Fixed decisions" in `phase.md`).
- It touches credits outside the ledger → reject the change (rule 4).
- It opens `99-asl-ON-HOLD.md` before Phase 8 → tell it ASL is on hold.
