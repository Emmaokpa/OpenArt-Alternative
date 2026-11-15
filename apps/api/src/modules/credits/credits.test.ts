import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { isAppError } from "../../lib/errors.js";
import {
  adjustCredits,
  calculateCredits,
  ensureCreditAccount,
  findLedgerMismatches,
  getBalance,
  grantCredits,
  refundCredits,
  spendCredits,
} from "./credits.js";
import {
  createTestJob,
  createTestModel,
  createTestUser,
} from "../../test-utils/fixtures.js";
import { openTestDatabase, resetDatabase, testDatabaseAvailable } from "../../test-utils/db.js";

const available = await testDatabaseAvailable();
const { pool, db } = openTestDatabase();

afterAll(async () => {
  await pool.end();
});

describe.skipIf(!available)("credit ledger", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  it("grants, spends and refunds while keeping balance and ledger in step", async () => {
    const userId = await createTestUser(db);
    const modelId = await createTestModel(db);

    await ensureCreditAccount(db, userId);
    expect(await getBalance(db, userId)).toBe(0);

    expect(
      await grantCredits(db, {
        userId,
        amount: 100,
        type: "grant_trial",
        idempotencyKey: "welcome",
      }),
    ).toBe(true);
    expect(await getBalance(db, userId)).toBe(100);

    const jobId = await createTestJob(db, { userId, modelId, creditCost: 30 });
    expect(await spendCredits(db, { userId, amount: 30, jobId })).toBe(70);
    expect(await getBalance(db, userId)).toBe(70);

    expect(
      await refundCredits(db, { userId, amount: 30, jobId, note: "provider failed" }),
    ).toBe(true);
    expect(await getBalance(db, userId)).toBe(100);

    const mismatches = await findLedgerMismatches(db);
    expect(mismatches).toEqual([]);
  });

  it("rejects a spend that exceeds the balance and writes nothing", async () => {
    const userId = await createTestUser(db);
    await grantCredits(db, {
      userId,
      amount: 5,
      type: "grant_trial",
      idempotencyKey: "welcome",
    });
    const jobId = await createTestJob(db, { userId, creditCost: 50 });

    await expect(spendCredits(db, { userId, amount: 50, jobId })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.code === "INSUFFICIENT_CREDITS",
    );

    expect(await getBalance(db, userId)).toBe(5);
    expect(await findLedgerMismatches(db)).toEqual([]);
  });

  it("allows only one spend and one refund per job", async () => {
    const userId = await createTestUser(db);
    await grantCredits(db, {
      userId,
      amount: 100,
      type: "grant_trial",
      idempotencyKey: "welcome",
    });
    const jobId = await createTestJob(db, { userId, creditCost: 20 });

    await spendCredits(db, { userId, amount: 20, jobId });
    await expect(spendCredits(db, { userId, amount: 20, jobId })).rejects.toThrow();
    expect(await getBalance(db, userId)).toBe(80);

    expect(await refundCredits(db, { userId, amount: 20, jobId })).toBe(true);
    expect(await refundCredits(db, { userId, amount: 20, jobId })).toBe(false);
    expect(await getBalance(db, userId)).toBe(100);
  });

  it("applies a grant only once per idempotency key", async () => {
    const userId = await createTestUser(db);

    const first = await grantCredits(db, {
      userId,
      amount: 50,
      type: "grant_topup",
      idempotencyKey: "payment-123",
    });
    const replay = await grantCredits(db, {
      userId,
      amount: 50,
      type: "grant_topup",
      idempotencyKey: "payment-123",
    });

    expect(first).toBe(true);
    expect(replay).toBe(false);
    expect(await getBalance(db, userId)).toBe(50);
  });

  it("never lets a manual adjustment make the balance negative", async () => {
    const userId = await createTestUser(db);
    await adjustCredits(db, { userId, delta: 10, note: "goodwill" });

    await expect(
      adjustCredits(db, { userId, delta: -11, note: "correction" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await getBalance(db, userId)).toBe(10);
  });

  it("detects a balance that drifted from the ledger", async () => {
    const userId = await createTestUser(db);
    await grantCredits(db, {
      userId,
      amount: 40,
      type: "grant_trial",
      idempotencyKey: "welcome",
    });

    expect(await findLedgerMismatches(db)).toEqual([]);

    const { creditAccounts } = await import("../../db/schema/index.js");
    const { eq } = await import("drizzle-orm");
    await db.update(creditAccounts).set({ balance: 999 }).where(eq(creditAccounts.userId, userId));

    const mismatches = await findLedgerMismatches(db);
    expect(mismatches).toEqual([{ userId, balance: 999, ledgerSum: 40 }]);
  });
});

describe("calculateCredits", () => {
  it("rounds up, clamps and never returns zero", () => {
    expect(calculateCredits({ creditsPerUnit: "18", units: 5, minUnits: "1", maxUnits: "30" })).toEqual(
      { units: 5, credits: 90 },
    );
    expect(calculateCredits({ creditsPerUnit: "2.5", units: 10 })).toEqual({
      units: 10,
      credits: 25,
    });
    expect(calculateCredits({ creditsPerUnit: "0.01", units: 0.1 })).toEqual({
      units: 0.1,
      credits: 1,
    });
    expect(calculateCredits({ creditsPerUnit: "3", units: 90, maxUnits: "60" })).toEqual({
      units: 60,
      credits: 180,
    });
    expect(calculateCredits({ creditsPerUnit: "3", units: 0.01, minUnits: "1" })).toEqual({
      units: 1,
      credits: 3,
    });
  });

  it("rejects a non-positive unit count", () => {
    expect(() => calculateCredits({ creditsPerUnit: "1", units: 0 })).toThrow();
  });
});
