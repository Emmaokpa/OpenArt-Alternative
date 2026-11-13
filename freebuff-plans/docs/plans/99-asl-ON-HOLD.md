# ASL Studio — Integration Plan (deferred, built last)

**Status:** on hold. ASL Studio is **Phase 8**, the last phase. Nothing in Phases 0–7 contains ASL code, tables, or UI. The core is deliberately generic (job types, job steps, provider adapters, credit ledger) so ASL plugs in as additions, not rewrites.

## Prerequisites (all must be true before starting)

- [ ] Phases 0–7 complete: core tools live on the VPS and Cloudflare, tested with real users
- [ ] Payments, credit refunds, backups, and monitoring proven in production
- [ ] VPS storage upgraded (ASL uses more scratch space) and ffmpeg benchmarked on the real box
- [ ] A sign-rendering route chosen with real numbers (quotes or a pilot, see below)
- [ ] Deaf advisors / fluent signers identified and paid
- [ ] A decision on how ASL is priced (separate per-minute pack vs general credits)

## Optional low-effort prep (can happen any time, costs almost nothing)

- Email Signapse, SignCaption, and Talksign for quotes and reseller terms (questions listed under "Known vendors").
- Find and agree rates with one or two fluent signers or a Deaf-led reviewer.
- Run the 30-minute general-video-model test (see "Quick test" below).

## What changes in the core (additive only)

| Area | Change |
|---|---|
| Database (`03`) | Migration below: new job type, status, roles, model capabilities, and ASL tables |
| Backend (`02`) | New `modules/asl/`; `POST /v1/jobs/:id/flags` (report a bad translation); admin review-queue endpoints; `reviewer` role; ASL params schema and per-minute quote |
| Jobs (`04`) | New `asl_overlay` pipeline (below); new `SignRender` and LLM translation adapters; `providers/anthropic/` and `providers/signengine/`; ASL job timeout 30 min |
| Storage (`05`) | ASL upload limit 3 min / 500 MB; keys `u/{userId}/jobs/{jobId}/signer/…`; extra private bucket `app-signs` if the clip-library route is chosen |
| Frontend (`06`) | `/tools/asl` page, `AslOptions`, `ReportTranslationButton`, step labels in `JobProgress`, admin review queue, ASL Studio first in the tools grid, AI-generated notice |
| Credits (`07`) | New per-minute price; consider a separate ASL pack |
| VPS (`01`) | `worker-media` back to 2 GB, concurrency stays 1; confirm scratch-space cap; benchmark before launch |

### Database migration

Verify constraint names first (`\d jobs`); Postgres auto-names column checks as `<table>_<column>_check`. With Drizzle/Prisma, generate the migration from the updated schema instead of hand-writing it.

```sql
alter table jobs drop constraint jobs_type_check;
alter table jobs add constraint jobs_type_check check (type in
  ('text_to_video','image_to_video','text_to_image','lip_sync','captions','asl_overlay'));

alter table jobs drop constraint jobs_status_check;
alter table jobs add constraint jobs_status_check check (status in
  ('queued','running','needs_review','succeeded','failed','canceled'));
drop index jobs_active;
create index jobs_active on jobs (status) where status in ('queued','running','needs_review');

alter table assets drop constraint assets_role_check;
alter table assets add constraint assets_role_check check (role in
  ('input','output','thumbnail','captions','signer','intermediate'));

alter table profiles drop constraint profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('user','reviewer','admin'));

alter table models drop constraint models_capability_check;
alter table models add constraint models_capability_check check (capability in
  ('text_to_video','image_to_video','text_to_image','lip_sync','stt','llm','sign_render'));
```

New tables:

```sql
create table asl_segments (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  idx int not null,
  start_ms int not null, end_ms int not null,
  text_en text not null,
  gloss jsonb,                                 -- [{gloss, nonmanual}, ...]
  confidence real,
  unknown_tokens text[] default '{}',
  signer_asset_id uuid references assets(id),
  unique (job_id, idx)
);

create table review_flags (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  segment_idx int,
  reason text not null,
  reporter_user_id text references "user"(id),
  status text not null default 'open' check (status in ('open','fixed','dismissed')),
  reviewer_id text references "user"(id),
  correction jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Only needed if you pick the clip-library route (see 07)
create table signers (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  consent_signed_at timestamptz not null,      -- written release for commercial use of likeness
  license_notes text,
  active boolean not null default true
);

create table sign_clips (
  id uuid primary key default gen_random_uuid(),
  signer_id uuid not null references signers(id),
  gloss text not null,
  kind text not null check (kind in ('sign','phrase','fingerspell')),
  variant int not null default 1,
  object_key text not null,
  duration_ms int not null,
  reviewed_by text references "user"(id),
  reviewed_at timestamptz,
  tags text[] default '{}',
  unique (gloss, kind, variant)
);
create index sign_clips_gloss on sign_clips (gloss);
```

### New provider interfaces

```ts
type SignRender = AsyncProvider<{ segments: AslSegment[] }, { signerClips: SignerClip[] }>;
// plus an LLM translation capability: English segment + allowed vocabulary -> gloss JSON
```

---
## What it does

A user uploads a video. The platform produces the same video with a **signer overlay** performing the speech in American Sign Language, plus captions.

Out of scope for the first ASL release: characters in the scene signing themselves (see "Later: character signing").

## Pipeline

| # | Step | Tool | Notes |
|---|---|---|---|
| 1 | Validate upload | ffprobe | Limits: 3 min, 500 MB at launch |
| 2 | Extract audio | ffmpeg | If no speech: ask for a script instead |
| 3 | Transcribe | STT provider | Word timestamps; speaker labels if available |
| 4 | Segment | Code | Sentences/phrases with `start_ms`, `end_ms` |
| 5 | English → ASL | LLM (Claude) | Gloss + non-manual notes + confidence; constrained to available vocabulary |
| 6 | Render signer | Sign rendering route (below) | Biggest cost and quality risk |
| 7 | Fit timing | Code | Rules below |
| 8 | Composite | ffmpeg | Overlay signer; optional burn-in captions |
| 9 | Review gate | Code + people | Low-confidence segments flagged |
| 10 | Deliver | R2 | MP4, VTT/SRT, optional signer-only video |

Each step is a `job_steps` row, so a failure retries only that step.

## Translation step (English → ASL)

- Gloss is a lossy approximation. ASL also uses facial expression, head and body movement, and space. Treat LLM output as a draft.
- Prompt design:
  - Few-shot examples written or verified by a fluent signer.
  - **Give the model the list of available signs** (from the clip library) and require it to choose from them, or emit `UNKNOWN(word)`.
  - Output strict JSON: `[{ "gloss": ["YOUR","NAME","WHAT"], "nonmanual": {"brows":"raised"}, "confidence": 0.0-1.0 }]`.
  - Validate with Zod; retry once on invalid JSON.
- Store results in `asl_segments`.
- Track the **coverage metric**: share of glosses found in the library. Unknown words fall back to fingerspelling and get flagged.

## Sign rendering: choose the cheapest that meets the quality bar

| Route | Upfront cost | Cost per video minute | Quality risk | Notes |
|---|---|---|---|---|
| **A. Clip library** (record fluent signers, stitch clips) | Highest: signer fees, studio setup, editing, review | **Lowest** (compute + LLM, cents) | Choppy transitions, limited vocabulary, weak facial grammar | Best long-run economics, especially in a narrow content domain |
| **B. Partner / licensed sign engine** (e.g. Talksign) | Low | Per-minute fee (**unknown — get quotes**) | Depends on their model | Fastest to launch; check API access, terms, pricing |
| **C. 3D avatar (Unreal/MetaHuman style)** | High (3D, motion data) | GPU compute | Needs motion data | Too heavy for v1 |
| **D. Human interpreter per video** | None | Highest | Lowest | Not instant; use only for premium review |
| **E. General video model (Wan, LTX, Seedance) prompted to sign** | None | Cheapest on paper (~$0.02–0.35 per clip) | **Very high: expected to produce plausible but meaningless signing** | Unproven. Run the 30-minute test below before dismissing it |

### Decision rule (run first in Phase 8)

1. Get written quotes from at least two partner engines (price per minute, API access, commercial terms, languages, turnaround).
2. In parallel, record a **pilot clip library** (150–300 signs plus common phrases) in the client's content niche with one paid fluent signer.
3. Run 30 representative sentences through both. Have fluent signers rate each output.
4. Choose:
   - If a partner's all-in cost is **≤ ~$1/min** and quality passes → launch with the partner behind the `SignRender` adapter.
   - Otherwise → clip library, and keep the partner as the fallback for unknown vocabulary.
5. Keep the adapter interface identical so you can switch later.

Rating rubric (per output, by a fluent signer): comprehension 1–5, naturalness 1–5, any critical error (meaning changed) yes/no. Proposed pass bar: average comprehension ≥ 4, zero critical errors in the 30-sentence set. Adjust with the Deaf advisors.

## Clip library: how to build it cheaply and well

**Units of recording**
- **Sign clips:** one sign each (gloss-level)
- **Phrase clips:** common full phrases/sentences (smoother and more natural than stitched signs)
- **Fingerspelling:** the alphabet and numbers, for names and unknown words

**Recording spec**
- Waist-up framing, fixed camera, plain solid background, even lighting, consistent clothing, 1080p at 30 fps.
- Every clip starts and ends from a neutral pose so clips can be joined.
- Two or three takes per sign. A fluent signer reviews and picks the best take.
- Metadata per clip: gloss, kind, variant, duration, signer, take, reviewed flag.

**Stitching**
- Trim to the neutral pose, normalize speed, short crossfade at joins (tune by eye with a signer).
- Pre-render common phrases once and reuse.

**Legal**
- Each signer signs a written release covering **commercial use of their likeness**, paid fairly. Store it (`signers.consent_signed_at`).
- Do **not** use public sign-language datasets commercially without checking their license. Many research datasets restrict commercial use (I haven't verified specific ones — check each).

**Grow the vocabulary from data**
- Log every `UNKNOWN` token across jobs. Rank by frequency. Record the most frequent missing signs first.

## Timing rules (step 7)

Signing a sentence takes a different time than speaking it.

1. Place each signer clip at its segment's `start_ms`.
2. Allow the signer to lag up to **1.5 s** behind speech (human interpreters lag too).
3. If a clip is longer than its window plus the allowed lag, speed it up to at most **1.25×**.
4. If it is still too long, let it spill into the following gap.
5. If cumulative lag exceeds **3 s**, flag the segment "tight". Options: shorten the translation, or offer "pause video to fit" (increases output length).
6. All thresholds live in config so signers can tune them.

## Compositing (step 8)

```bash
ffmpeg -i original.mp4 -i signer.mp4 \
  -filter_complex "[1:v]scale=360:-2[s];[0:v][s]overlay=W-w-24:H-h-24" \
  -map 0:a? -c:v libx264 -preset veryfast -crf 23 -threads 2 -c:a copy out.mp4
```

- Overlay position and size are user options. Keep the signer large enough that hands and face stay legible.
- Captions: burn in with the `subtitles` filter, or deliver a separate VTT/SRT.
- Downscale 1080p+ inputs to 720p before compositing on the 8 GB VPS. Run with `nice -n 10`. Concurrency 1. **Benchmark on your VPS**; expect minutes per video, not seconds.

## Review gate and quality loop

- Segments are flagged when: confidence < threshold, unknown tokens exist, timing is "tight".
- Users can press "Report a bad translation" (writes `review_flags`).
- Admin/reviewer UI: see the English, gloss, and signer clip per segment; correct the gloss; mark fixed. Corrections become few-shot examples and glossary entries.
- At launch, optionally hold jobs in `needs_review` for a human check (slower, safer). Relax as quality data accumulates.

## Safety and trust

- Label output: "AI-generated ASL interpretation."
- Do not market it as a replacement for qualified interpreters in medical, legal, or emergency settings.
- Involve Deaf advisors from the start of ASL work, not after launch. Pay them.
- Provide a visible way to report problems and a promise to review them.

## Cost model (per video minute)

| Item | Estimate |
|---|---|
| Transcription | ~$0.003–0.008 (cents or less) |
| Translation LLM | A few cents (my estimate; measure) |
| ffmpeg compositing | VPS time, no marginal cash |
| Sign rendering | Clip library: ~$0 marginal. Partner: **unknown**. |
| Human review (optional) | Hourly; get quotes |

Provisional price: **250 credits per minute** (see `07-credits-pricing-payments.md`). Only works if all-in cost stays at or below about $1.00–$1.25 per minute at the Studio plan's credit rate.

## Later: character signing (Version B)

Wan 2.2 Animate can copy motion from a driving video onto a character. It does not invent signing, so it still needs a signing video from the routes above. Hand and finger fidelity is the main unknown.

Feasibility test (~$5): take 3 clips with a clear front-facing character, record a real signer performing a short sentence for each, run Animate in animate mode, and have a fluent signer judge legibility. Build only if it passes.

## Definition of done (Phase 8)

- [ ] 30-sentence test set and signer rating sheet
- [ ] Route chosen (partner or clip library) with numbers
- [ ] `SignRender` adapter in place (fake first)
- [ ] Full pipeline works end to end on the fake provider, then on the real route
- [ ] Timing rules and compositing benchmarked on the VPS
- [ ] Review queue and report button working
- [ ] Deaf advisors have reviewed sample outputs

## Quick test: can a general video model sign? (30 minutes, a few dollars)

General text-to-video models (Wan, LTX, Seedance) generate motion that *looks* right. Nothing in how they are trained checks that handshapes, movement, and facial grammar form valid ASL, and hands are a known weak spot. I have not seen evidence that they can sign reliably, so treat this as an experiment, not an assumption.

1. In a provider playground, prompt 3 models with simple cases: "a person signing 'thank you' in American Sign Language, front view, waist up", then "hello", then a short phrase.
2. Generate 3–5 takes per prompt. Keep the cheapest settings.
3. Show every output, unlabeled and mixed with real signing clips, to a fluent signer. Ask: is this a real sign? Is it the sign requested?
4. Record the results in the spike sheet.

**Decision:** if fewer than nearly all outputs are correct, drop Route E for sentence-level signing. Even if a few single signs come out right, a model that cannot be trusted on every sentence cannot be shipped, because users cannot tell a wrong sign from a right one.

## Where general models *can* help (hybrid)

Pose/motion-driven models such as Wan 2.2 Animate copy motion from a driving video onto a character. That means a **real signer's recording** (from the clip library) could be restyled into a consistent avatar or character. This does not invent signing, so accuracy still comes from the human recordings. It adds cost and hand-fidelity risk, so test it after the base route is chosen.

## Known vendors (checked November 2026; verify everything directly)

| Vendor | What it offers | API? | Price found |
|---|---|---|---|
| **Signapse** | English → ASL or BSL video with AI signers (SignStudio, SignStream) | Yes, B2B/enterprise API with docs | Pricing page is "per minute"; I could not read the figures. A roundup mentions about £8 per additional minute next to Signapse, but the snippet was fragmentary. **Unconfirmed — ask for a quote.** |
| **SignCaption** | Upload video, audio, text or subtitles → ASL avatar video; "human verified" option | Unclear; help docs describe an upload workflow with a quoted price per project | **From $7.50/min**, custom volume pricing |
| **Talksign (Echo 1.0)** | Text/speech → photorealistic ASL video; Nigeria/UK-based | Not confirmed | Not found |
| **SignVrse (Terp 360)** | Real-time spoken language → 3D avatar signing | Not confirmed | Not found |
| **Hand Talk** | Animated avatar apps (ASL, Libras) | Not confirmed | Not found |
| **AWS GenASL** | Open sample architecture (clip lookup + stitching) | N/A, you deploy it | Your own AWS/hosting costs |

Questions to ask every vendor: price per minute at your expected volume, whether you may **resell or embed** output in your own product (white-label terms), commercial licence for the signer likeness, turnaround, maximum video length, ASL accuracy evidence and Deaf-review process, and data retention for uploaded videos.
