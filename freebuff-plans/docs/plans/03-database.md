# 03 — Database (PostgreSQL on Coolify)

## Principles

- Postgres 16. IDs are `uuid` (`gen_random_uuid()`), except the ledger (`bigint identity`).
- Timestamps are `timestamptz`. Credits are integers. Provider costs are stored in **micro-dollars** (`bigint`) to avoid float errors.
- Auth tables (`user`, `session`, `account`, `verification`) are created by Better Auth. Do not hand-edit them. Extend with `profiles`.
- Migrations with Drizzle Kit (or Prisma Migrate), committed to the repo, applied automatically on deploy.
- Write migrations in dependency order: `plans`, `models`, `templates`, `payments`, `jobs`, then tables that reference them.

## Core DDL

```sql
create table plans (
  id text primary key,                         -- 'starter','creator','pro','studio'
  name text not null,
  price_usd_cents int not null,
  monthly_credits int not null,
  active boolean not null default true
);

create table profiles (
  user_id text primary key references "user"(id) on delete cascade,
  display_name text,
  plan_id text references plans(id),
  role text not null default 'user' check (role in ('user','admin')),
  strikes int not null default 0,
  suspended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table models (
  id text primary key,                         -- 'wan-2.6','seedance-2.0-fast','flux-schnell','veed-lipsync'
  capability text not null check (capability in
    ('text_to_video','image_to_video','text_to_image','lip_sync','stt')),
  provider text not null,                      -- 'fal', 'assemblyai', 'anthropic', ...
  provider_model text not null,                -- endpoint id at the provider
  unit text not null check (unit in ('second','image','minute','request')),
  cost_usd_micros_per_unit bigint not null,    -- what WE pay
  credits_per_unit numeric(10,2) not null,     -- what the USER pays
  min_units numeric, max_units numeric,
  params_schema jsonb,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  category text not null,
  capability text not null,
  prompt_scaffold text,
  default_model_id text references models(id),
  default_params jsonb,
  preview_video_key text,                      -- in the public assets bucket
  thumbnail_key text,
  sort_order int not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  provider text not null,
  provider_payment_id text not null,
  kind text not null check (kind in ('subscription','topup')),
  amount_cents int not null,
  currency text not null,
  credits_granted int not null,
  status text not null check (status in ('pending','paid','refunded','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  plan_id text not null references plans(id),
  provider text not null,
  provider_sub_id text,
  status text not null check (status in ('active','past_due','canceled','expired')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_sub_id)
);

create table webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  payload jsonb not null,
  primary key (provider, event_id)
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references "user"(id),
  type text not null check (type in
    ('text_to_video','image_to_video','text_to_image','lip_sync','captions')),
  status text not null default 'queued' check (status in
    ('queued','running','succeeded','failed','canceled')),
  model_id text references models(id),
  template_id uuid references templates(id),
  params jsonb not null,
  credit_cost int not null,
  progress smallint not null default 0,
  error_code text,
  error_message text,
  idempotency_key text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);
create index jobs_user_created on jobs (user_id, created_at desc);
create index jobs_active on jobs (status) where status in ('queued','running');
create unique index jobs_idem on jobs (user_id, idempotency_key) where idempotency_key is not null;

create table job_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  seq smallint not null,
  kind text not null,                          -- 'moderate','submit','wait','download','transcribe','build_captions','burn_captions','thumbnail'
  status text not null default 'pending' check (status in
    ('pending','running','succeeded','failed','skipped')),
  provider text,
  external_id text,                            -- provider's job id; saved BEFORE waiting so a restart resumes instead of re-submitting (and re-paying)
  attempt smallint not null default 0,
  cost_usd_micros bigint,                      -- actual provider cost when known
  input jsonb, output jsonb, error text,
  started_at timestamptz, finished_at timestamptz,
  unique (job_id, seq)
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  user_id text references "user"(id),
  job_id uuid references jobs(id) on delete set null,
  role text not null check (role in ('input','output','thumbnail','captions','intermediate')),
  kind text not null check (kind in ('video','image','audio','text')),
  bucket text not null,
  object_key text not null,
  mime text, size_bytes bigint, duration_ms int, width int, height int,
  status text not null default 'pending' check (status in ('pending','ready','deleted')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket, object_key)
);
create index assets_job on assets (job_id);
create index assets_expiry on assets (expires_at) where status = 'ready';

create table credit_accounts (
  user_id text primary key references "user"(id),
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table credit_ledger (
  id bigint generated always as identity primary key,
  user_id text not null references "user"(id),
  delta int not null,                          -- + grants/refunds, - spends
  type text not null check (type in
    ('grant_plan','grant_topup','grant_trial','spend','refund','adjustment','expire')),
  job_id uuid references jobs(id),
  payment_id uuid references payments(id),
  idempotency_key text,
  note text,
  created_at timestamptz not null default now()
);
create unique index ledger_idem on credit_ledger (user_id, idempotency_key) where idempotency_key is not null;
create unique index ledger_one_spend_per_job on credit_ledger (job_id) where type = 'spend';
create unique index ledger_one_refund_per_job on credit_ledger (job_id) where type = 'refund';
```

## Operational tables

```sql
create table moderation_events (
  id bigint generated always as identity primary key,
  user_id text references "user"(id),
  job_id uuid references jobs(id),
  stage text not null,                         -- 'prompt','upload','provider'
  result text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id text references "user"(id),
  action text not null,                        -- 'credits.adjust','job.retry','template.update'
  target text, detail jsonb,
  created_at timestamptz not null default now()
);
```

## Ledger rules (never break these)

1. Every change to `credit_accounts.balance` happens in the same transaction as a `credit_ledger` row.
2. `balance` must equal `sum(delta)` per user. A nightly job checks this and alerts on any mismatch.
3. Lock the account row (`FOR UPDATE`) before checking and deducting.
4. One `spend` and at most one `refund` per job (enforced by the unique indexes).
5. Manual adjustments require an admin and write to `audit_log`.

## Postgres tuning for an 8 GB shared VPS (starting values)

```
shared_buffers = 1GB
effective_cache_size = 3GB
work_mem = 16MB
maintenance_work_mem = 256MB
max_connections = 50
```

Connection pool sizes: API 10, worker-io 5, worker-media 3.

## Backups

- Coolify scheduled backups to R2 (S3-compatible): daily, keep 7 daily + 4 weekly.
- **Restore drill once a month** into a scratch container. An untested backup is not a backup.
- Keep one backup copy outside the VPS provider account.

## Retention and deletion

| Data | Rule (proposed) |
|---|---|
| `job_steps`, `moderation_events` | Keep 180 days, then purge |
| Uploaded source videos | Delete 7 days after the job finishes unless the user keeps them |
| Outputs | Keep while subscribed + 30 days |
| Ledger and payments | Keep for accounting; anonymize on account deletion |
| Account deletion | Soft delete → purge R2 assets within 30 days → remove personal data |
