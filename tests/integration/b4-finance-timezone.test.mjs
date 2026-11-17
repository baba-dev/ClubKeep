import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL 17 only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { ownerOverviewSnapshot } = await import("../../src/lib/owner-dashboard.ts");
const { financeMonthlyTrend } = await import("../../src/lib/finance-trend.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const TZ = "Asia/Kolkata";
const HOUR = 3_600_000;

class Rollback extends Error {}

/** Runs fn inside an interactive transaction that is always rolled back (payments are append-only). */
async function inRolledBackTx(fn) {
  await assert.rejects(
    db.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }),
    (err) => err instanceof Rollback
  );
}

async function fixture(tx) {
  const n = randomUUID().slice(0, 8);
  const user = await tx.user.create({
    data: { id: "b4tz-u-" + n, name: "Tz Tester", email: `b4tz-${n}@example.invalid` },
  });
  const club = await tx.club.create({
    data: {
      id: "b4tz-c-" + n,
      slug: "b4tz-c-" + n,
      name: "Tz Club",
      timeZone: TZ,
      setupStatus: "READY",
    },
  });
  const plan = await tx.clubPlan.create({
    data: {
      clubId: club.id,
      name: "Monthly",
      durationUnit: "MONTHS",
      durationCount: 1,
      priceMinor: 15000,
      currency: "INR",
    },
  });
  const member = await tx.clubMemberRecord.create({
    data: { clubId: club.id, memberNumber: 1, displayName: "Walk-in" },
  });
  const term = await tx.memberSubscription.create({
    data: {
      clubId: club.id,
      memberRecordId: member.id,
      planId: plan.id,
      planName: "Monthly",
      priceMinor: 15000,
      currency: "INR",
      startAt: new Date("2026-01-01T00:00:00Z"),
      endAt: new Date("2027-01-01T00:00:00Z"),
      operationKey: "b4tz-term-" + n,
      createdByUserId: user.id,
    },
  });
  let receipt = 0;
  const pay = (receivedAt, amountMinor) =>
    tx.clubPayment.create({
      data: {
        clubId: club.id,
        memberRecordId: member.id,
        subscriptionId: term.id,
        receiptNo: ++receipt,
        operationKey: `b4tz-pay-${n}-${receipt}`,
        amountMinor,
        currency: "INR",
        method: "CASH",
        receivedAt,
        recordedByUserId: user.id,
        clubName: "Tz Club",
        memberName: "Walk-in",
        memberNumber: 1,
        planName: "Monthly",
        termPriceMinor: 15000,
        termStartsAt: term.startAt,
        termEndsAt: term.endAt,
      },
    });
  return { club, pay };
}

test("owner overview buckets a payment at 20:00Z on 31 Oct into club-local November", async () => {
  await inRolledBackTx(async (tx) => {
    const { club, pay } = await fixture(tx);
    // 20:00Z on 31 Oct is 01:30 on 1 Nov in Asia/Kolkata: November revenue.
    await pay(new Date("2026-10-31T20:00:00Z"), 5000);
    // 17:00Z on 31 Oct is 22:30 on 31 Oct in Asia/Kolkata: October revenue.
    await pay(new Date("2026-10-31T17:00:00Z"), 700);
    // 18:30Z on 30 Nov is 00:00 on 1 Dec in Asia/Kolkata: December revenue.
    await pay(new Date("2026-11-30T18:30:00Z"), 90);

    const november = await ownerOverviewSnapshot(
      tx,
      club.id,
      TZ,
      true,
      new Date("2026-11-17T20:00:00Z")
    );
    assert.equal(november.month, "2026-11");
    assert.deepEqual(november.revenue, [{ currency: "INR", amountMinor: 5000 }]);

    const october = await ownerOverviewSnapshot(
      tx,
      club.id,
      TZ,
      true,
      new Date("2026-10-31T18:00:00Z")
    );
    assert.equal(october.month, "2026-10");
    assert.deepEqual(october.revenue, [{ currency: "INR", amountMinor: 700 }]);
  });
});

test("financeMonthlyTrend buckets a payment just after a club-local month boundary correctly", async () => {
  await inRolledBackTx(async (tx) => {
    const { club, pay } = await fixture(tx);
    // The trend only looks ~215 days back from the wall clock, so anchor on the current UTC month.
    const now = new Date();
    const firstOfThisMonthUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    // 20:00Z on the last UTC day of the previous month is 01:30 on the 1st (IST) of the current UTC month.
    await pay(new Date(firstOfThisMonthUtc - 4 * HOUR), 5000);
    // 17:00Z the same day is still the previous month in IST.
    await pay(new Date(firstOfThisMonthUtc - 7 * HOUR), 700);

    const label = (ms) => {
      const d = new Date(ms);
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    };
    const thisMonth = label(firstOfThisMonthUtc);
    const prevMonth = label(firstOfThisMonthUtc - 24 * HOUR);

    const trend = await financeMonthlyTrend(tx, club.id, TZ);
    assert.deepEqual(trend, [
      { month: prevMonth, currency: "INR", amount: 700 },
      { month: thisMonth, currency: "INR", amount: 5000 },
    ]);
  });
});

test.after(async () => {
  await db.$disconnect();
  await pool.end();
});
