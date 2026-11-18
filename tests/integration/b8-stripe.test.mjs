import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { applyWebhookEvent, startCheckout, requestCancel, createPortalLink } =
  await import("../../src/lib/billing/service.ts");
const { BillingError } = await import("../../src/lib/billing/provider.ts");
const { assertMemberSeatAvailable, MemberLimitError } =
  await import("../../src/lib/business-entitlements.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const DAY = 86_400_000;
const NOW = new Date("2026-11-18T10:00:00Z");
const at = (days) => new Date(NOW.getTime() + days * DAY);
const n = randomUUID().slice(0, 8);
const ids = {
  owner: "b8s-owner-" + n,
  staff: "b8s-staff-" + n,
  a: "b8s-a-" + n,
  b: "b8s-b-" + n,
  rz: "b8s-rz-" + n,
};
const clubs = [ids.a, ids.b, ids.rz];
let seq = 0;
const uniq = (prefix) => `${prefix}${n}${String(++seq).padStart(4, "0")}`;
const newSub = () => "sub_" + uniq("S");
const newSession = () => "cs_test_" + uniq("C");

function stripeProvider() {
  return {
    id: "STRIPE",
    abandoned: [],
    cancels: [],
    portals: [],
    sessions: [],
    async createCheckout(request) {
      assert.equal(request.currency, "USD");
      const list = { STARTER: 500, GROWTH: 1500, PRO: 2500 }[request.tier];
      assert.equal(request.chargeAmountMinor, list, "Stripe's Price is the list price");
      const id = newSession();
      this.sessions.push(id);
      return { providerSubscriptionId: id, checkoutUrl: "https://checkout.stripe.com/c/" + id };
    },
    async abandonCheckout(id) {
      this.abandoned.push(id);
    },
    async cancelSubscription(id, atPeriodEnd) {
      this.cancels.push([id, atPeriodEnd]);
    },
    async createPortalSession(id, returnUrl) {
      this.portals.push([id, returnUrl]);
      return "https://billing.stripe.com/p/" + id;
    },
    verifyAndParseWebhook() {
      throw new Error("not used");
    },
  };
}
const ctxFor = (provider) => ({
  providerFor: () => provider,
  taxBasisPoints: null,
  returnUrl: "https://clubkeep.example.test/clubs/x/settings/billing",
});
const event = (kind, subId, occurredAt, over = {}) => ({
  provider: "STRIPE",
  providerEventId: uniq("evt_"),
  eventType: "stripe." + kind.toLowerCase(),
  kind,
  occurredAt,
  providerSubscriptionId: subId,
  periodEnd: null,
  notedClubId: null,
  checkoutSessionId: null,
  cancelAtPeriodEnd: null,
  ...over,
});
const subOf = (clubId) => db.clubSubscription.findUnique({ where: { clubId } });
const tierOf = async (id) => (await db.club.findUnique({ where: { id } })).businessTier;
const claimCount = (eventId) =>
  db.billingWebhookEvent.count({ where: { provider: "STRIPE", providerEventId: eventId } });

test.before(async () => {
  for (const id of [ids.owner, ids.staff]) {
    await db.user.create({ data: { id, name: id, email: id + "@example.invalid" } });
  }
  for (const id of clubs) {
    await db.club.create({ data: { id, slug: id, name: id, setupStatus: "READY" } });
  }
  await db.clubMembership.createMany({
    data: [
      ...clubs.map((clubId) => ({ clubId, userId: ids.owner, role: "OWNER" })),
      { clubId: ids.a, userId: ids.staff, role: "STAFF" },
    ],
  });
});

test.after(async () => {
  try {
    const run = (sql, params) => pool.query(sql, params);
    await run('DELETE FROM "SecurityEvent" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "ClubSubscription" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "BillingWebhookEvent" WHERE "providerEventId" LIKE $1', [`evt_${n}%`]);
    await run('DELETE FROM "ClubMemberRecord" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "ClubMembership" WHERE "clubId" = ANY($1)', [clubs]);
    await run('DELETE FROM "Club" WHERE "id" = ANY($1)', [clubs]);
    await run('DELETE FROM "user" WHERE "id" = ANY($1)', [[ids.owner, ids.staff]]);
  } finally {
    await db.$disconnect();
    await pool.end();
  }
});

test("a non-India club starts a USD checkout; the pending row holds the session id", async () => {
  const provider = stripeProvider();
  const { checkoutUrl } = await startCheckout(
    db,
    ctxFor(provider),
    ids.owner,
    ids.a,
    { tier: "STARTER", countryCode: "US" },
    NOW
  );
  assert.equal(checkoutUrl, "https://checkout.stripe.com/c/" + provider.sessions[0]);
  const row = await subOf(ids.a);
  assert.deepEqual(
    [
      row.status,
      row.provider,
      row.currency,
      row.amountMinor,
      row.chargeAmountMinor,
      row.countryCode,
    ],
    ["PENDING", "STRIPE", "USD", 500, 500, "US"]
  );
  assert.equal(row.providerSubscriptionId, provider.sessions[0]);
  assert.equal(await tierOf(ids.a), "FREE", "pending grants nothing");
  assert.deepEqual(provider.abandoned, []);
});

test("an unbound subscription event for one of our clubs is retried, not dropped", async () => {
  const sub = newSub();
  const early = event("CHARGED", sub, at(0), { periodEnd: at(30), notedClubId: ids.a });
  await assert.rejects(
    () => applyWebhookEvent(db, early, NOW),
    (error) => error instanceof BillingError && error.status === 503
  );
  assert.equal(
    await claimCount(early.providerEventId),
    0,
    "the claim rolled back so the redelivery is processed"
  );
  // Not ours (no metadata hint): recorded and ignored, never retried.
  const foreign = event("CHARGED", newSub(), at(0));
  assert.equal(await applyWebhookEvent(db, foreign, NOW), "UNKNOWN_SUBSCRIPTION");
  assert.equal(await claimCount(foreign.providerEventId), 1);

  // The checkout event binds the subscription; the earlier event then applies on redelivery.
  const pending = await subOf(ids.a);
  const activate = event("ACTIVATED", sub, at(0), {
    checkoutSessionId: pending.providerSubscriptionId,
    notedClubId: ids.a,
  });
  assert.equal(await applyWebhookEvent(db, activate, NOW), "APPLIED");
  assert.equal(
    await applyWebhookEvent(db, early, NOW),
    "APPLIED",
    "redelivery now finds the bound subscription"
  );
  const row = await subOf(ids.a);
  assert.deepEqual(
    [row.status, row.providerSubscriptionId, row.currentPeriodEnd.getTime()],
    ["ACTIVE", sub, at(30).getTime()]
  );
  assert.equal(await tierOf(ids.a), "STARTER");
});

test("binding applies exactly once under concurrent delivery, and a replay is a no-op", async () => {
  const provider = stripeProvider();
  await startCheckout(
    db,
    ctxFor(provider),
    ids.owner,
    ids.b,
    { tier: "GROWTH", countryCode: "DE" },
    NOW
  );
  const pending = await subOf(ids.b);
  const sub = newSub();
  const activate = event("ACTIVATED", sub, at(1), {
    checkoutSessionId: pending.providerSubscriptionId,
    notedClubId: ids.b,
  });
  const outcomes = await Promise.all(
    Array.from({ length: 8 }, () => applyWebhookEvent(db, activate, at(1)))
  );
  assert.equal(outcomes.filter((o) => o === "APPLIED").length, 1);
  assert.equal(outcomes.filter((o) => o === "DUPLICATE").length, 7);
  const row = await subOf(ids.b);
  assert.deepEqual([row.status, row.providerSubscriptionId], ["ACTIVE", sub]);
  assert.equal(await tierOf(ids.b), "GROWTH");
});

test("forged, orphaned and replaced checkouts never bind to the wrong club", async () => {
  // A paid checkout naming another club in its metadata is refused outright.
  const provider = stripeProvider();
  await startCheckout(
    db,
    ctxFor(provider),
    ids.owner,
    ids.rz,
    { tier: "STARTER", countryCode: "US" },
    NOW
  );
  const pending = await subOf(ids.rz);
  const forged = event("ACTIVATED", newSub(), at(2), {
    checkoutSessionId: pending.providerSubscriptionId,
    notedClubId: ids.a,
  });
  assert.equal(await applyWebhookEvent(db, forged, NOW), "CLUB_MISMATCH");
  assert.deepEqual(
    [(await subOf(ids.rz)).status, (await subOf(ids.rz)).providerSubscriptionId],
    ["PENDING", pending.providerSubscriptionId]
  );
  assert.equal(await tierOf(ids.rz), "FREE");

  // A paid checkout for a session we never stored: recorded as unknown, never retried.
  const orphan = event("ACTIVATED", newSub(), at(2), {
    checkoutSessionId: newSession(),
    notedClubId: ids.rz,
  });
  assert.equal(await applyWebhookEvent(db, orphan, NOW), "UNKNOWN_SUBSCRIPTION");
  assert.equal(await claimCount(orphan.providerEventId), 1);

  // Starting checkout again replaces the pending row and expires the old session.
  await startCheckout(
    db,
    ctxFor(provider),
    ids.owner,
    ids.rz,
    { tier: "PRO", countryCode: "US" },
    NOW
  );
  assert.deepEqual(provider.abandoned, [pending.providerSubscriptionId]);
  const replaced = event("ACTIVATED", newSub(), at(2), {
    checkoutSessionId: pending.providerSubscriptionId,
  });
  assert.equal(
    await applyWebhookEvent(db, replaced, NOW),
    "UNKNOWN_SUBSCRIPTION",
    "the old session can no longer bind"
  );
  const row = await subOf(ids.rz);
  assert.deepEqual([row.status, row.tier], ["PENDING", "PRO"]);

  // A subscription id already bound to another club cannot be claimed again.
  const taken = event("ACTIVATED", (await subOf(ids.a)).providerSubscriptionId, at(2), {
    checkoutSessionId: row.providerSubscriptionId,
  });
  assert.equal(await applyWebhookEvent(db, taken, NOW), "CLUB_MISMATCH");
  assert.equal((await subOf(ids.rz)).status, "PENDING");
});

test("renewal, failure, grace and deletion follow the same rules as Razorpay", async () => {
  const row0 = await subOf(ids.a);
  const sub = row0.providerSubscriptionId;
  assert.equal(
    await applyWebhookEvent(
      db,
      event("CHARGED", sub, at(31), { periodEnd: at(61), notedClubId: ids.a }),
      at(31)
    ),
    "APPLIED"
  );
  assert.equal((await subOf(ids.a)).currentPeriodEnd.getTime(), at(61).getTime());

  assert.equal(
    await applyWebhookEvent(db, event("PAYMENT_PENDING", sub, at(62)), at(62)),
    "APPLIED"
  );
  let row = await subOf(ids.a);
  assert.equal(row.status, "PAST_DUE");
  assert.equal(row.pastDueSince.getTime(), at(62).getTime());
  assert.equal(await tierOf(ids.a), "STARTER", "tier is kept during grace");
  assert.equal(await applyWebhookEvent(db, event("HALTED", sub, at(65)), at(65)), "APPLIED");
  assert.equal(
    (await subOf(ids.a)).pastDueSince.getTime(),
    at(62).getTime(),
    "retries do not extend grace"
  );

  assert.equal(
    await applyWebhookEvent(db, event("CHARGED", sub, at(66), { periodEnd: at(91) }), at(66)),
    "APPLIED"
  );
  assert.equal((await subOf(ids.a)).status, "ACTIVE");

  // Deletion keeps the paid-through date, so the plan runs to the end of the period.
  const future = new Date(Date.now() + 5 * DAY);
  await db.clubSubscription.update({
    where: { clubId: ids.a },
    data: { currentPeriodEnd: future, lastEventAt: new Date(Date.now() - DAY) },
  });
  assert.equal(
    await applyWebhookEvent(db, event("CANCELLED", sub, new Date()), new Date()),
    "APPLIED"
  );
  row = await subOf(ids.a);
  assert.deepEqual([row.status, row.currentPeriodEnd.getTime()], ["CANCELLED", future.getTime()]);
  assert.equal(await tierOf(ids.a), "STARTER");
  assert.equal(
    await applyWebhookEvent(db, event("CHARGED", sub, new Date(Date.now() + 1000)), new Date()),
    "NO_CHANGE",
    "cancelled is terminal"
  );
});

test("SYNC mirrors the cancel flag without moving the ordering clock or blocking older events", async () => {
  const provider = stripeProvider();
  await db.club.update({ where: { id: ids.b }, data: { businessTier: "GROWTH" } });
  const sub = (await subOf(ids.b)).providerSubscriptionId;
  // Later than anything an earlier test stamped on this club.
  const t0 = new Date(Math.max(Date.now(), (await subOf(ids.b)).lastEventAt.getTime()) + 10_000);
  await applyWebhookEvent(db, event("CHARGED", sub, t0, { periodEnd: at(30) }), t0);
  const clock = (await subOf(ids.b)).lastEventAt.getTime();

  const sync = event("SYNC", sub, new Date(t0.getTime() + 5000), { cancelAtPeriodEnd: true });
  assert.equal(await applyWebhookEvent(db, sync, t0), "APPLIED");
  let row = await subOf(ids.b);
  assert.deepEqual(
    [row.cancelAtPeriodEnd, row.status, row.lastEventAt.getTime()],
    [true, "ACTIVE", clock]
  );
  // A charge stamped between the two (but after the real last event) must still apply.
  const between = event("CHARGED", sub, new Date(t0.getTime() + 3000), { periodEnd: at(60) });
  assert.equal(await applyWebhookEvent(db, between, t0), "APPLIED");
  assert.equal((await subOf(ids.b)).currentPeriodEnd.getTime(), at(60).getTime());
  // Same flag again is a no-op; turning it off (customer resumed) syncs back.
  assert.equal(
    await applyWebhookEvent(
      db,
      event("SYNC", sub, new Date(t0.getTime() + 6000), { cancelAtPeriodEnd: true }),
      t0
    ),
    "NO_CHANGE"
  );
  assert.equal(
    await applyWebhookEvent(
      db,
      event("SYNC", sub, new Date(t0.getTime() + 7000), { cancelAtPeriodEnd: false }),
      t0
    ),
    "APPLIED"
  );
  assert.equal((await subOf(ids.b)).cancelAtPeriodEnd, false);

  // Owner cancel through the service sets the flag locally and calls Stripe at period end.
  await requestCancel(db, () => provider, ids.owner, ids.b);
  assert.deepEqual(provider.cancels, [[sub, true]]);
  assert.equal((await subOf(ids.b)).cancelAtPeriodEnd, true);

  // Pending and finished rows ignore SYNC entirely.
  const pendingSub = newSub();
  const pending = await subOf(ids.rz);
  assert.equal(pending.status, "PENDING");
  assert.equal(
    await applyWebhookEvent(
      db,
      event("SYNC", pending.providerSubscriptionId, t0, { cancelAtPeriodEnd: true }),
      t0
    ),
    "NO_CHANGE"
  );
  assert.equal(pendingSub.startsWith("sub_"), true);
});

test("the payment portal link is owner-only and only for a bound, running Stripe plan", async () => {
  const provider = stripeProvider();
  const sub = (await subOf(ids.b)).providerSubscriptionId;
  const url = "https://clubkeep.example.test/clubs/b/settings/billing";
  const { url: portal } = await createPortalLink(db, () => provider, ids.owner, ids.b, url);
  assert.equal(portal, "https://billing.stripe.com/p/" + sub);
  assert.deepEqual(provider.portals, [[sub, url]]);

  await assert.rejects(
    () => createPortalLink(db, () => provider, ids.staff, ids.a, url),
    (e) => e.name === "AccessDeniedError"
  );
  // Pending (session id, not yet a subscription) has nothing to manage.
  await assert.rejects(
    () => createPortalLink(db, () => provider, ids.owner, ids.rz, url),
    (e) => e.status === 409
  );
  // A provider without a portal (Razorpay) explains where to go instead.
  const noPortal = { id: "RAZORPAY" };
  await assert.rejects(
    () => createPortalLink(db, () => noPortal, ids.owner, ids.b, url),
    (e) => e.status === 409 && /email/.test(e.message)
  );
  assert.equal(provider.portals.length, 1, "no provider call for a refused request");
});

test("grace expiry on a Stripe club limits new members like any other plan", async () => {
  await db.clubMemberRecord.createMany({
    data: Array.from({ length: 30 }, (_, i) => ({
      clubId: ids.b,
      memberNumber: i + 1,
      displayName: "M" + i,
    })),
  });
  await db.$transaction(async (tx) => {
    await tx.clubSubscription.update({
      where: { clubId: ids.b },
      data: {
        status: "PAST_DUE",
        cancelAtPeriodEnd: false,
        pastDueSince: new Date(Date.now() - 8 * DAY),
      },
    });
  });
  await assert.rejects(
    () => assertMemberSeatAvailable(db, ids.b),
    (e) => e instanceof MemberLimitError && e.limit === 25
  );
  assert.equal(
    await db.clubMemberRecord.count({ where: { clubId: ids.b } }),
    30,
    "nothing is deleted"
  );
});
