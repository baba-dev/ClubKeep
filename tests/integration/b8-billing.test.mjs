import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL 17 only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { applyWebhookEvent, startCheckout, requestCancel, reconcileClubTier } =
  await import("../../src/lib/billing/service.ts");
const { assertMemberSeatAvailable, MemberLimitError } =
  await import("../../src/lib/business-entitlements.ts");
const { BillingError } = await import("../../src/lib/billing/provider.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const DAY = 86_400_000;
const NOW = new Date("2026-11-18T10:00:00Z");
const at = (days) => new Date(NOW.getTime() + days * DAY);
const n = randomUUID().slice(0, 8);
const ids = {
  owner: "b8-owner-" + n,
  staff: "b8-staff-" + n,
  x: "b8-x-" + n,
  y: "b8-y-" + n,
  legacy: "b8-legacy-" + n,
};
const clubs = [ids.x, ids.y, ids.legacy];
let seq = 0;
const uniq = (prefix) => `${prefix}_${n}_${++seq}`;

function fakeProvider() {
  return {
    id: "RAZORPAY",
    checkouts: [],
    cancels: [],
    async createCheckout(request) {
      this.checkouts.push(request);
      return { providerSubscriptionId: uniq("sub"), checkoutUrl: "https://rzp.io/i/test" };
    },
    async cancelSubscription(id, atPeriodEnd) {
      this.cancels.push([id, atPeriodEnd]);
    },
    verifyAndParseWebhook() {
      throw new Error("not used");
    },
  };
}
const event = (kind, subId, occurredAt, over = {}) => ({
  provider: "RAZORPAY",
  providerEventId: uniq("evt"),
  eventType: "subscription." + kind.toLowerCase(),
  kind,
  occurredAt,
  providerSubscriptionId: subId,
  periodEnd: null,
  notedClubId: null,
  ...over,
});
const subOf = (clubId) => db.clubSubscription.findUnique({ where: { clubId } });
const tierOf = async (clubId) => (await db.club.findUnique({ where: { id: clubId } })).businessTier;
const auditCount = (clubId, eventType) => db.securityEvent.count({ where: { clubId, eventType } });
const rejectsWithCode = (promise, code) => assert.rejects(promise, (error) => error.code === code);

async function makeClub(id) {
  await db.club.create({ data: { id, slug: id, name: id, setupStatus: "READY" } });
}
async function addMembers(clubId, count) {
  await db.clubMemberRecord.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      clubId,
      memberNumber: i + 1,
      displayName: "Member " + (i + 1),
    })),
  });
}

test.before(async () => {
  for (const id of [ids.owner, ids.staff]) {
    await db.user.create({ data: { id, name: id, email: id + "@example.invalid" } });
  }
  for (const id of clubs) await makeClub(id);
  await db.clubMembership.createMany({
    data: [
      { clubId: ids.x, userId: ids.owner, role: "OWNER" },
      { clubId: ids.x, userId: ids.staff, role: "STAFF" },
      { clubId: ids.y, userId: ids.owner, role: "OWNER" },
    ],
  });
  await db.club.update({ where: { id: ids.legacy }, data: { businessTier: "GROWTH" } });
});

test.after(async () => {
  try {
    const run = (sql, params) => pool.query(sql, params);
    await run('DELETE FROM "SecurityEvent" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "ClubSubscription" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "BillingWebhookEvent" WHERE "providerEventId" LIKE $1', [`evt_${n}_%`]);
    await run('DELETE FROM "ClubMemberRecord" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "ClubMembership" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "Club" WHERE "id" = ANY($1)', [clubs]);
    await run('DELETE FROM "user" WHERE "id" = ANY($1)', [[ids.owner, ids.staff]]);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
});

test("database constraints reject free, non-positive, malformed and duplicate subscriptions", async () => {
  const insert = (over) => {
    const row = {
      id: uniq("cs"),
      clubId: ids.y,
      tier: "STARTER",
      provider: "RAZORPAY",
      providerSubscriptionId: uniq("sub"),
      currency: "INR",
      amountMinor: 29900,
      chargeAmountMinor: 35282,
      countryCode: "IN",
      createdByUserId: ids.owner,
      ...over,
    };
    return pool.query(
      `INSERT INTO "ClubSubscription" ("id","clubId","tier","provider","providerSubscriptionId","currency","amountMinor","chargeAmountMinor","countryCode","createdByUserId","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())`,
      [
        row.id,
        row.clubId,
        row.tier,
        row.provider,
        row.providerSubscriptionId,
        row.currency,
        row.amountMinor,
        row.chargeAmountMinor,
        row.countryCode,
        row.createdByUserId,
      ]
    );
  };
  await rejectsWithCode(insert({ tier: "FREE" }), "23514");
  await rejectsWithCode(insert({ amountMinor: 0 }), "23514");
  await rejectsWithCode(insert({ chargeAmountMinor: 100 }), "23514", "charge below list price");
  await rejectsWithCode(insert({ currency: "inr" }), "23514");
  await rejectsWithCode(insert({ countryCode: "IND" }), "22001");
  await rejectsWithCode(insert({ clubId: "no-such-club" }), "23503");
  // One valid row, then a second subscription for the same club is refused.
  await insert({ clubId: ids.legacy, providerSubscriptionId: uniq("sub_c") });
  await rejectsWithCode(insert({ clubId: ids.legacy }), "23505");
  await pool.query('DELETE FROM "ClubSubscription" WHERE "clubId" = $1', [ids.legacy]);
});

test("checkout is owner-only, needs a supported country, and stores the tax-inclusive price", async () => {
  const provider = fakeProvider();
  await assert.rejects(
    () =>
      startCheckout(
        db,
        provider,
        1800,
        ids.staff,
        ids.x,
        { tier: "STARTER", countryCode: "IN" },
        NOW
      ),
    (error) => error.name === "AccessDeniedError"
  );
  await assert.rejects(
    () =>
      startCheckout(db, provider, 1800, ids.owner, ids.x, { tier: "FREE", countryCode: "IN" }, NOW),
    (error) => error instanceof BillingError && error.status === 400
  );
  await assert.rejects(
    () => startCheckout(db, provider, 1800, ids.owner, ids.x, { tier: "STARTER" }, NOW),
    (error) => error instanceof BillingError && /country/i.test(error.message)
  );
  await assert.rejects(
    () =>
      startCheckout(
        db,
        provider,
        1800,
        ids.owner,
        ids.x,
        { tier: "STARTER", countryCode: "US" },
        NOW
      ),
    (error) => error instanceof BillingError && error.status === 409
  );
  assert.equal(provider.checkouts.length, 0, "no provider call for any rejected request");
  assert.equal(await subOf(ids.x), null);

  const { checkoutUrl } = await startCheckout(
    db,
    provider,
    1800,
    ids.owner,
    ids.x,
    { tier: "STARTER", countryCode: "in" },
    NOW
  );
  assert.equal(checkoutUrl, "https://rzp.io/i/test");
  assert.equal(provider.checkouts[0].chargeAmountMinor, 35282);
  const row = await subOf(ids.x);
  assert.deepEqual(
    [row.status, row.tier, row.currency, row.amountMinor, row.chargeAmountMinor, row.countryCode],
    ["PENDING", "STARTER", "INR", 29900, 35282, "IN"]
  );
  assert.equal(await tierOf(ids.x), "FREE", "a pending checkout grants nothing");
  assert.equal(await auditCount(ids.x, "BILLING_SUBSCRIPTION_STARTED"), 1);
});

test("webhook lifecycle: activate, replay, fail, grace, recover, with audit rows", async () => {
  const sub = await subOf(ids.x);
  const activate = event("ACTIVATED", sub.providerSubscriptionId, at(0), {
    periodEnd: at(30),
    notedClubId: ids.x,
  });
  assert.equal(await applyWebhookEvent(db, activate, NOW), "APPLIED");
  assert.equal(await tierOf(ids.x), "STARTER");
  assert.equal((await subOf(ids.x)).status, "ACTIVE");
  assert.equal(await auditCount(ids.x, "BILLING_TIER_CHANGED"), 1);

  assert.equal(await applyWebhookEvent(db, activate, NOW), "DUPLICATE", "replay is a no-op");
  assert.equal(await auditCount(ids.x, "BILLING_TIER_CHANGED"), 1);

  assert.equal(
    await applyWebhookEvent(
      db,
      event("PAYMENT_PENDING", sub.providerSubscriptionId, at(31)),
      at(31)
    ),
    "APPLIED"
  );
  let row = await subOf(ids.x);
  assert.equal(row.status, "PAST_DUE");
  assert.equal(row.pastDueSince.getTime(), at(31).getTime());
  assert.equal(await tierOf(ids.x), "STARTER", "tier is kept during grace");

  // A retry/halt does not extend the grace clock.
  await applyWebhookEvent(db, event("HALTED", sub.providerSubscriptionId, at(35)), at(35));
  assert.equal((await subOf(ids.x)).pastDueSince.getTime(), at(31).getTime());

  assert.equal(
    await applyWebhookEvent(
      db,
      event("CHARGED", sub.providerSubscriptionId, at(36), { periodEnd: at(61) }),
      at(36)
    ),
    "APPLIED"
  );
  row = await subOf(ids.x);
  assert.deepEqual(
    [row.status, row.pastDueSince, row.currentPeriodEnd.getTime()],
    ["ACTIVE", null, at(61).getTime()]
  );
});

test("older events are ignored and unrelated, unknown or mismatched events change nothing", async () => {
  const sub = await subOf(ids.x);
  const before = (await subOf(ids.x)).lastEventAt.getTime();
  assert.equal(
    await applyWebhookEvent(db, event("PAYMENT_PENDING", sub.providerSubscriptionId, at(1)), NOW),
    "STALE"
  );
  assert.equal((await subOf(ids.x)).status, "ACTIVE");
  assert.equal((await subOf(ids.x)).lastEventAt.getTime(), before);

  assert.equal(
    await applyWebhookEvent(db, event("IGNORED", sub.providerSubscriptionId, at(40)), NOW),
    "IGNORED"
  );
  assert.equal(
    await applyWebhookEvent(db, event("CHARGED", "sub_does_not_exist", at(40)), NOW),
    "UNKNOWN_SUBSCRIPTION"
  );

  // Club Y has its own subscription; an event naming club X's id for Y's
  // subscription must not be applied to either club.
  await startCheckout(
    db,
    fakeProvider(),
    1800,
    ids.owner,
    ids.y,
    { tier: "GROWTH", countryCode: "IN" },
    NOW
  );
  const y = await subOf(ids.y);
  const forged = event("ACTIVATED", y.providerSubscriptionId, at(41), { notedClubId: ids.x });
  assert.equal(await applyWebhookEvent(db, forged, NOW), "CLUB_MISMATCH");
  assert.equal((await subOf(ids.y)).status, "PENDING");
  assert.equal(await tierOf(ids.y), "FREE");
  assert.equal((await subOf(ids.x)).status, "ACTIVE");
});

test("one event delivered many times concurrently applies exactly once", async () => {
  const sub = await subOf(ids.y);
  const activate = event("ACTIVATED", sub.providerSubscriptionId, at(50), { periodEnd: at(80) });
  const outcomes = await Promise.all(
    Array.from({ length: 8 }, () => applyWebhookEvent(db, activate, at(50)))
  );
  assert.equal(outcomes.filter((o) => o === "APPLIED").length, 1);
  assert.equal(outcomes.filter((o) => o === "DUPLICATE").length, 7);
  assert.equal(await tierOf(ids.y), "GROWTH");
  assert.equal(await auditCount(ids.y, "BILLING_TIER_CHANGED"), 1);
});

test("racing different events resolve by provider event time, whatever the arrival order", async () => {
  const sub = await subOf(ids.y);
  for (let round = 0; round < 6; round += 1) {
    const base = 100 + round * 20;
    const failed = event("PAYMENT_PENDING", sub.providerSubscriptionId, at(base));
    const charged = event("CHARGED", sub.providerSubscriptionId, at(base + 1), {
      periodEnd: at(base + 30),
    });
    const order = round % 2 === 0 ? [failed, charged] : [charged, failed];
    await Promise.all(order.map((e) => applyWebhookEvent(db, e, at(base + 1))));
    const row = await subOf(ids.y);
    assert.equal(row.status, "ACTIVE", `round ${round}: the later CHARGED wins`);
    assert.equal(row.lastEventAt.getTime(), at(base + 1).getTime());
  }
});

test("grace expiry limits NEW members immediately, without any webhook or timer", async () => {
  await addMembers(ids.x, 30);
  // Active STARTER (cap 75): 30 members is fine.
  await assertMemberSeatAvailable(db, ids.x);
  const sub = await subOf(ids.x);
  const longAgo = new Date(Date.now() - 8 * DAY);
  await db.$transaction(async (tx) => {
    await tx.clubSubscription.update({
      where: { clubId: ids.x },
      data: { status: "PAST_DUE", pastDueSince: longAgo, lastEventAt: longAgo },
    });
  });
  // Past the 7-day grace: FREE cap (25) applies although Club.businessTier still says STARTER.
  assert.equal(await tierOf(ids.x), "STARTER");
  await assert.rejects(
    () => assertMemberSeatAvailable(db, ids.x),
    (e) => e instanceof MemberLimitError && e.limit === 25
  );
  assert.equal(
    await db.clubMemberRecord.count({ where: { clubId: ids.x } }),
    30,
    "nothing is deleted"
  );

  // Reconcile writes the entitled tier and an audit row.
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Club" WHERE "id" = ${ids.x} FOR UPDATE`;
    assert.equal(await reconcileClubTier(tx, ids.x, new Date()), "FREE");
  });
  assert.equal(await tierOf(ids.x), "FREE");

  // Paying again restores the tier and the cap.
  assert.equal(
    await applyWebhookEvent(
      db,
      event("CHARGED", sub.providerSubscriptionId, new Date(), { periodEnd: at(90) }),
      new Date()
    ),
    "APPLIED"
  );
  assert.equal(await tierOf(ids.x), "STARTER");
  await assertMemberSeatAvailable(db, ids.x);
});

test("cancel: an active plan runs to its paid-through date; terminal states stay terminal", async () => {
  const provider = fakeProvider();
  const sub = await subOf(ids.x);
  await assert.rejects(
    () => requestCancel(db, provider, ids.staff, ids.x),
    (e) => e.name === "AccessDeniedError"
  );
  await requestCancel(db, provider, ids.owner, ids.x);
  assert.deepEqual(provider.cancels, [[sub.providerSubscriptionId, true]]);
  assert.equal((await subOf(ids.x)).cancelAtPeriodEnd, true);
  assert.equal(await auditCount(ids.x, "BILLING_CANCEL_REQUESTED"), 1);

  const future = new Date(Date.now() + 5 * DAY);
  await applyWebhookEvent(
    db,
    event("CANCELLED", sub.providerSubscriptionId, new Date(Date.now() + 1000), {
      periodEnd: future,
    }),
    new Date()
  );
  const row = await subOf(ids.x);
  assert.deepEqual([row.status, row.cancelAtPeriodEnd], ["CANCELLED", false]);
  assert.equal(await tierOf(ids.x), "STARTER", "paid-through period is honoured");
  // Cannot resubscribe or revive while the paid period is still running.
  await assert.rejects(
    () =>
      startCheckout(
        db,
        provider,
        1800,
        ids.owner,
        ids.x,
        { tier: "GROWTH", countryCode: "IN" },
        new Date()
      ),
    (e) => e.status === 409
  );
  assert.equal(
    await applyWebhookEvent(
      db,
      event("CHARGED", sub.providerSubscriptionId, new Date(Date.now() + 2000)),
      new Date()
    ),
    "NO_CHANGE"
  );
  assert.equal((await subOf(ids.x)).status, "CANCELLED");
  await assert.rejects(
    () => requestCancel(db, provider, ids.owner, ids.x),
    (e) => e.status === 409
  );
});

test("a club with no subscription keeps its hand-set tier and is never downgraded", async () => {
  await addMembers(ids.legacy, 100);
  await assertMemberSeatAvailable(db, ids.legacy); // GROWTH cap is 300
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Club" WHERE "id" = ${ids.legacy} FOR UPDATE`;
    assert.equal(await reconcileClubTier(tx, ids.legacy, NOW), "GROWTH");
  });
  assert.equal(await tierOf(ids.legacy), "GROWTH");
  assert.equal(await auditCount(ids.legacy, "BILLING_TIER_CHANGED"), 0);
});

test("an abandoned checkout never downgrades a hand-set tier or earns grace", async () => {
  await db.clubMembership.create({
    data: { clubId: ids.legacy, userId: ids.owner, role: "OWNER" },
  });
  const provider = fakeProvider();
  await startCheckout(
    db,
    provider,
    1800,
    ids.owner,
    ids.legacy,
    { tier: "PRO", countryCode: "IN" },
    NOW
  );
  const sub = await subOf(ids.legacy);
  for (const kind of ["CANCELLED", "COMPLETED", "PAYMENT_PENDING", "HALTED"]) {
    assert.equal(
      await applyWebhookEvent(db, event(kind, sub.providerSubscriptionId, at(5)), at(5)),
      "NO_CHANGE",
      kind
    );
  }
  assert.equal((await subOf(ids.legacy)).status, "PENDING");
  assert.equal(await tierOf(ids.legacy), "GROWTH");
});
