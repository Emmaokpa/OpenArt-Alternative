import { sql, type SQL } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  ASSET_KINDS,
  ASSET_ROLES,
  ASSET_STATUSES,
  CAPABILITIES,
  JOB_STATUSES,
  JOB_TYPES,
  LEDGER_ENTRY_TYPES,
  PRICING_UNITS,
} from "@app/shared";
import { user } from "./auth.js";

/** Renders a constant list as an SQL `in (...)` list for check constraints. */
function sqlList(values: readonly string[]): SQL {
  return sql.raw(values.map((value) => `'${value}'`).join(", "));
}

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  priceUsdCents: integer("price_usd_cents").notNull(),
  monthlyCredits: integer("monthly_credits").notNull(),
  active: boolean("active").default(true).notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name"),
    planId: text("plan_id").references(() => plans.id),
    role: text("role").default("user").notNull(),
    strikes: integer("strikes").default(0).notNull(),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("profiles_role_check", sql`${table.role} in ('user', 'admin')`)],
);

export const models = pgTable(
  "models",
  {
    id: text("id").primaryKey(),
    capability: text("capability").notNull(),
    provider: text("provider").notNull(),
    providerModel: text("provider_model").notNull(),
    unit: text("unit").notNull(),
    costUsdMicrosPerUnit: bigint("cost_usd_micros_per_unit", { mode: "number" }).notNull(),
    creditsPerUnit: numeric("credits_per_unit", { precision: 10, scale: 2 }).notNull(),
    minUnits: numeric("min_units"),
    maxUnits: numeric("max_units"),
    paramsSchema: jsonb("params_schema").$type<Record<string, unknown>>(),
    active: boolean("active").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("models_capability_check", sql`${table.capability} in (${sqlList(CAPABILITIES)})`),
    check("models_unit_check", sql`${table.unit} in (${sqlList(PRICING_UNITS)})`),
  ],
);

export const templates = pgTable("templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  capability: text("capability").notNull(),
  promptScaffold: text("prompt_scaffold"),
  defaultModelId: text("default_model_id").references(() => models.id),
  defaultParams: jsonb("default_params").$type<Record<string, unknown>>(),
  previewVideoKey: text("preview_video_key"),
  thumbnailKey: text("thumbnail_key"),
  sortOrder: integer("sort_order").default(0).notNull(),
  published: boolean("published").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    provider: text("provider").notNull(),
    providerPaymentId: text("provider_payment_id").notNull(),
    kind: text("kind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    creditsGranted: integer("credits_granted").notNull(),
    status: text("status").notNull(),
    raw: jsonb("raw").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("payments_provider_payment_unique").on(table.provider, table.providerPaymentId),
    check("payments_kind_check", sql`${table.kind} in ('subscription', 'topup')`),
    check(
      "payments_status_check",
      sql`${table.status} in ('pending', 'paid', 'refunded', 'failed')`,
    ),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id),
    provider: text("provider").notNull(),
    providerSubId: text("provider_sub_id"),
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("subscriptions_provider_sub_unique").on(table.provider, table.providerSubId),
    check(
      "subscriptions_status_check",
      sql`${table.status} in ('active', 'past_due', 'canceled', 'expired')`,
    ),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    provider: text("provider").notNull(),
    eventId: text("event_id").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.eventId] })],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    type: text("type").notNull(),
    status: text("status").default("queued").notNull(),
    modelId: text("model_id").references(() => models.id),
    templateId: uuid("template_id").references(() => templates.id),
    params: jsonb("params").$type<Record<string, unknown>>().notNull(),
    creditCost: integer("credit_cost").notNull(),
    progress: smallint("progress").default(0).notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    idempotencyKey: text("idempotency_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    index("jobs_user_created").on(table.userId, table.createdAt.desc()),
    index("jobs_active")
      .on(table.status)
      .where(sql`${table.status} in ('queued', 'running')`),
    uniqueIndex("jobs_idem")
      .on(table.userId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    check("jobs_type_check", sql`${table.type} in (${sqlList(JOB_TYPES)})`),
    check("jobs_status_check", sql`${table.status} in (${sqlList(JOB_STATUSES)})`),
    check("jobs_progress_check", sql`${table.progress} between 0 and 100`),
    check("jobs_credit_cost_check", sql`${table.creditCost} >= 0`),
  ],
);

export const jobSteps = pgTable(
  "job_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    seq: smallint("seq").notNull(),
    kind: text("kind").notNull(),
    status: text("status").default("pending").notNull(),
    provider: text("provider"),
    // Saved immediately after submission and before waiting, so a restarted
    // worker resumes instead of resubmitting (and re-paying).
    externalId: text("external_id"),
    attempt: smallint("attempt").default(0).notNull(),
    costUsdMicros: bigint("cost_usd_micros", { mode: "number" }),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    unique("job_steps_job_seq_unique").on(table.jobId, table.seq),
    check(
      "job_steps_status_check",
      sql`${table.status} in ('pending', 'running', 'succeeded', 'failed', 'skipped')`,
    ),
  ],
);

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id),
    jobId: uuid("job_id").references(() => jobs.id, { onDelete: "set null" }),
    role: text("role").notNull(),
    kind: text("kind").notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    mime: text("mime"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    durationMs: integer("duration_ms"),
    width: integer("width"),
    height: integer("height"),
    status: text("status").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("assets_bucket_object_unique").on(table.bucket, table.objectKey),
    index("assets_job").on(table.jobId),
    index("assets_expiry")
      .on(table.expiresAt)
      .where(sql`${table.status} = 'ready'`),
    check("assets_role_check", sql`${table.role} in (${sqlList(ASSET_ROLES)})`),
    check("assets_kind_check", sql`${table.kind} in (${sqlList(ASSET_KINDS)})`),
    check("assets_status_check", sql`${table.status} in (${sqlList(ASSET_STATUSES)})`),
  ],
);

export const creditAccounts = pgTable(
  "credit_accounts",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id),
    balance: integer("balance").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [check("credit_accounts_balance_check", sql`${table.balance} >= 0`)],
);

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
    delta: integer("delta").notNull(),
    type: text("type").notNull(),
    jobId: uuid("job_id").references(() => jobs.id),
    paymentId: uuid("payment_id").references(() => payments.id),
    idempotencyKey: text("idempotency_key"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("ledger_idem")
      .on(table.userId, table.idempotencyKey)
      .where(sql`${table.idempotencyKey} is not null`),
    uniqueIndex("ledger_one_spend_per_job")
      .on(table.jobId)
      .where(sql`${table.type} = 'spend'`),
    uniqueIndex("ledger_one_refund_per_job")
      .on(table.jobId)
      .where(sql`${table.type} = 'refund'`),
    check("credit_ledger_type_check", sql`${table.type} in (${sqlList(LEDGER_ENTRY_TYPES)})`),
  ],
);
