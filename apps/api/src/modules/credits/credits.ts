import { eq, sql } from "drizzle-orm";
import type { LedgerEntryType } from "@app/shared";
import type { DbExecutor } from "../../db/client.js";
import { creditAccounts, creditLedger } from "../../db/schema/core.js";
import { AppError, insufficientCredits, isUniqueViolation } from "../../lib/errors.js";

export type CreditExecutor = DbExecutor;

const LEDGER_IDEM_CONSTRAINT = "ledger_idem";

export interface SpendInput {
  userId: string;
  amount: number;
  jobId: string;
}

export interface GrantInput {
  userId: string;
  amount: number;
  type: Extract<LedgerEntryType, "grant_plan" | "grant_topup" | "grant_trial">;
  idempotencyKey: string;
  paymentId?: string;
  note?: string;
}

export interface RefundInput {
  userId: string;
  amount: number;
  jobId: string;
  note?: string;
}

export interface AdjustInput {
  userId: string;
  /** Positive credits the account, negative debits it. */
  delta: number;
  note: string;
}

/**
 * Credits are an append-only ledger. Every balance change happens with a
 * ledger row in the same transaction, and the account row is locked first.
 * See `docs/plans/03-database.md` — these rules are not negotiable.
 */
export async function ensureCreditAccount(db: CreditExecutor, userId: string): Promise<void> {
  await db.insert(creditAccounts).values({ userId }).onConflictDoNothing();
}

export async function getBalance(db: CreditExecutor, userId: string): Promise<number> {
  const [row] = await db
    .select({ balance: creditAccounts.balance })
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, userId))
    .limit(1);
  return row?.balance ?? 0;
}

/**
 * Locks the account and deducts credits. Throws 402 without writing anything
 * when the balance is short. The unique `ledger_one_spend_per_job` index makes
 * a second spend for the same job impossible.
 */
export async function spendCredits(db: CreditExecutor, input: SpendInput): Promise<number> {
  if (input.amount <= 0) throw new AppError(500, "INTERNAL", "Job cost must be positive");
  await ensureCreditAccount(db, input.userId);

  const [account] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, input.userId))
    .for("update");

  if (!account) throw new AppError(500, "INTERNAL", "Credit account is missing");

  if (account.balance < input.amount) {
    throw insufficientCredits(input.amount, account.balance);
  }

  await db.insert(creditLedger).values({
    userId: input.userId,
    delta: -input.amount,
    type: "spend",
    jobId: input.jobId,
  });

  const nextBalance = account.balance - input.amount;
  await db
    .update(creditAccounts)
    .set({ balance: nextBalance, updatedAt: new Date() })
    .where(eq(creditAccounts.userId, input.userId));

  return nextBalance;
}

/**
 * Refunds a failed job exactly once. Returns false when a refund already
 * exists (unique `ledger_one_refund_per_job`) so retries are safe.
 */
export async function refundCredits(db: CreditExecutor, input: RefundInput): Promise<boolean> {
  if (input.amount <= 0) return false;

  await ensureCreditAccount(db, input.userId);

  const [account] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, input.userId))
    .for("update");

  if (!account) return false;

  try {
    await db.insert(creditLedger).values({
      userId: input.userId,
      delta: input.amount,
      type: "refund",
      jobId: input.jobId,
      note: input.note ?? null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) return false;
    throw error;
  }

  await db
    .update(creditAccounts)
    .set({ balance: account.balance + input.amount, updatedAt: new Date() })
    .where(eq(creditAccounts.userId, input.userId));

  return true;
}

/**
 * Grants credits once per idempotency key (payment webhooks replay a lot).
 * Returns false when the grant was already applied.
 */
export async function grantCredits(db: CreditExecutor, input: GrantInput): Promise<boolean> {
  if (input.amount <= 0) throw new AppError(500, "INTERNAL", "Grant must be positive");

  await ensureCreditAccount(db, input.userId);

  const [account] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, input.userId))
    .for("update");

  if (!account) throw new AppError(500, "INTERNAL", "Credit account is missing");

  try {
    await db.insert(creditLedger).values({
      userId: input.userId,
      delta: input.amount,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      paymentId: input.paymentId ?? null,
      note: input.note ?? null,
    });
  } catch (error) {
    if (isUniqueViolation(error, LEDGER_IDEM_CONSTRAINT)) return false;
    throw error;
  }

  await db
    .update(creditAccounts)
    .set({ balance: account.balance + input.amount, updatedAt: new Date() })
    .where(eq(creditAccounts.userId, input.userId));

  return true;
}

/** Admin-only manual adjustment; the caller writes the audit log row. */
export async function adjustCredits(db: CreditExecutor, input: AdjustInput): Promise<number> {
  await ensureCreditAccount(db, input.userId);

  const [account] = await db
    .select()
    .from(creditAccounts)
    .where(eq(creditAccounts.userId, input.userId))
    .for("update");

  if (!account) throw new AppError(404, "NOT_FOUND", "User not found");

  const nextBalance = account.balance + input.delta;
  if (nextBalance < 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Adjustment would make the balance negative");
  }

  await db.insert(creditLedger).values({
    userId: input.userId,
    delta: input.delta,
    type: "adjustment",
    note: input.note,
  });

  await db
    .update(creditAccounts)
    .set({ balance: nextBalance, updatedAt: new Date() })
    .where(eq(creditAccounts.userId, input.userId));

  return nextBalance;
}

/**
 * Nightly reconciliation: every balance must equal the sum of its ledger.
 * Returns only the accounts that disagree.
 */
export async function findLedgerMismatches(
  db: CreditExecutor,
): Promise<Array<{ userId: string; balance: number; ledgerSum: number }>> {
  const rows = await db
    .select({
      userId: creditAccounts.userId,
      balance: creditAccounts.balance,
      ledgerSum: sql<string>`coalesce(sum(${creditLedger.delta}), 0)`,
    })
    .from(creditAccounts)
    .leftJoin(creditLedger, eq(creditLedger.userId, creditAccounts.userId))
    .groupBy(creditAccounts.userId, creditAccounts.balance);

  return rows
    .map((row) => ({
      userId: row.userId,
      balance: row.balance,
      ledgerSum: Number(row.ledgerSum),
    }))
    .filter((row) => row.balance !== row.ledgerSum);
}

/**
 * credits = ceil(creditsPerUnit × units), clamped to the model's min/max.
 * `creditsPerUnit` arrives as a numeric string from Postgres.
 */
export function calculateCredits(input: {
  creditsPerUnit: string | number;
  units: number;
  minUnits?: string | number | null;
  maxUnits?: string | number | null;
}): { units: number; credits: number } {
  const perUnit = Number(input.creditsPerUnit);
  if (!Number.isFinite(perUnit) || perUnit < 0) {
    throw new AppError(500, "INTERNAL", "Model has an invalid credit price");
  }

  let units = input.units;
  const min = input.minUnits === null || input.minUnits === undefined ? null : Number(input.minUnits);
  const max = input.maxUnits === null || input.maxUnits === undefined ? null : Number(input.maxUnits);

  if (!Number.isFinite(units) || units <= 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Duration or count must be positive");
  }
  if (min !== null && Number.isFinite(min)) units = Math.max(units, min);
  if (max !== null && Number.isFinite(max)) units = Math.min(units, max);

  // Floating-point noise must never produce an extra credit.
  const credits = Math.max(1, Math.ceil(perUnit * units - 1e-9));
  return { units, credits };
}
