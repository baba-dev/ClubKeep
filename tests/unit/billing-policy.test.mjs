import assert from "node:assert/strict";
import test from "node:test";
import {
  GRACE_DAYS,
  LIST_PRICE_MINOR,
  currencyForCountry,
  effectiveTier,
  graceEndsAt,
  chargeAmount,
  normalizeCountry,
  priceWithTax,
  providerForCountry,
  transitionFor,
} from "../../src/lib/billing/policy.ts";

const DAY = 86_400_000;
const now = new Date("2026-11-18T10:00:00Z");
const at = (days) => new Date(now.getTime() + days * DAY);

test("list prices match the approved monthly pricing", () => {
  assert.deepEqual(LIST_PRICE_MINOR.INR, { STARTER: 29900, GROWTH: 74900, PRO: 179900 });
  assert.deepEqual(LIST_PRICE_MINOR.USD, { STARTER: 500, GROWTH: 1500, PRO: 2500 });
});

test("priceWithTax adds tax on top with integer half-up rounding", () => {
  assert.equal(priceWithTax(29900, 1800), 35282);
  assert.equal(priceWithTax(74900, 1800), 88382);
  assert.equal(priceWithTax(179900, 1800), 212282);
  assert.equal(priceWithTax(29900, 0), 29900);
  assert.equal(priceWithTax(5, 1000), 6, "5.5 rounds half up");
  assert.equal(priceWithTax(4, 1250), 5, "4.5 rounds half up");
  assert.equal(priceWithTax(3, 1000), 3, "3.3 rounds down");
});

test("priceWithTax rejects non-integer, non-positive and out-of-range input", () => {
  assert.throws(() => priceWithTax(0, 1800));
  assert.throws(() => priceWithTax(299.5, 1800));
  assert.throws(() => priceWithTax(29900, -1));
  assert.throws(() => priceWithTax(29900, 10001));
  assert.throws(() => priceWithTax(29900, 18.5));
});

test("India bills INR through Razorpay, everyone else USD through Stripe", () => {
  assert.equal(providerForCountry("in"), "RAZORPAY");
  assert.equal(currencyForCountry("IN"), "INR");
  assert.equal(providerForCountry("US"), "STRIPE");
  assert.equal(currencyForCountry("GB"), "USD");
  assert.throws(() => normalizeCountry("IND"));
  assert.throws(() => normalizeCountry(""));
});

const sub = (over = {}) => ({
  tier: "GROWTH",
  status: "ACTIVE",
  currentPeriodEnd: null,
  pastDueSince: null,
  ...over,
});

test("a club with no subscription keeps its stored tier", () => {
  assert.equal(effectiveTier(null, "STARTER", now), "STARTER");
  assert.equal(effectiveTier(null, "FREE", now), "FREE");
});

test("pending checkout changes nothing; active gives the purchased tier", () => {
  assert.equal(effectiveTier(sub({ status: "PENDING" }), "STARTER", now), "STARTER");
  assert.equal(effectiveTier(sub({ status: "ACTIVE" }), "FREE", now), "GROWTH");
});

test("past-due keeps the tier for exactly 7 days, then falls to FREE", () => {
  assert.equal(GRACE_DAYS, 7);
  const since = at(-6.99);
  assert.equal(
    effectiveTier(sub({ status: "PAST_DUE", pastDueSince: since }), "GROWTH", now),
    "GROWTH"
  );
  assert.equal(
    effectiveTier(sub({ status: "PAST_DUE", pastDueSince: at(-7) }), "GROWTH", now),
    "FREE"
  );
  assert.equal(
    effectiveTier(sub({ status: "PAST_DUE", pastDueSince: at(-30) }), "GROWTH", now),
    "FREE"
  );
  assert.equal(
    effectiveTier(sub({ status: "PAST_DUE", pastDueSince: null }), "GROWTH", now),
    "FREE"
  );
  assert.equal(graceEndsAt(at(-1)).getTime(), at(6).getTime());
  assert.equal(graceEndsAt(null), null);
});

test("cancelled keeps the tier until the paid-through date, expired is FREE", () => {
  assert.equal(
    effectiveTier(sub({ status: "CANCELLED", currentPeriodEnd: at(3) }), "GROWTH", now),
    "GROWTH"
  );
  assert.equal(
    effectiveTier(sub({ status: "CANCELLED", currentPeriodEnd: at(-0.001) }), "GROWTH", now),
    "FREE"
  );
  assert.equal(
    effectiveTier(sub({ status: "CANCELLED", currentPeriodEnd: null }), "GROWTH", now),
    "FREE"
  );
  assert.equal(effectiveTier(sub({ status: "EXPIRED" }), "GROWTH", now), "FREE");
});

test("activation, charge and recovery clear the grace clock", () => {
  const t = (status, pastDueSince, kind) =>
    transitionFor({ status, pastDueSince }, kind, now, at(30));
  assert.deepEqual(t("PENDING", null, "ACTIVATED"), {
    status: "ACTIVE",
    currentPeriodEnd: at(30),
    pastDueSince: null,
  });
  assert.equal(t("PAST_DUE", at(-3), "CHARGED").status, "ACTIVE");
  assert.equal(t("PAST_DUE", at(-3), "CHARGED").pastDueSince, null);
});

test("the first payment failure starts the grace clock and later ones keep it", () => {
  const first = transitionFor(
    { status: "ACTIVE", pastDueSince: null },
    "PAYMENT_PENDING",
    at(-2),
    null
  );
  assert.equal(first.status, "PAST_DUE");
  assert.equal(first.pastDueSince.getTime(), at(-2).getTime());
  const repeat = transitionFor({ status: "PAST_DUE", pastDueSince: at(-2) }, "HALTED", now, null);
  assert.equal(repeat.pastDueSince.getTime(), at(-2).getTime(), "grace is not extended by retries");
});

test("a never-paid checkout cannot earn grace, cancel, or complete", () => {
  for (const kind of ["PAYMENT_PENDING", "HALTED", "CANCELLED", "COMPLETED"]) {
    assert.equal(
      transitionFor({ status: "PENDING", pastDueSince: null }, kind, now, null),
      null,
      kind
    );
  }
});

test("cancelled and expired are terminal; ignored events never change state", () => {
  for (const status of ["CANCELLED", "EXPIRED"]) {
    for (const kind of [
      "ACTIVATED",
      "CHARGED",
      "PAYMENT_PENDING",
      "HALTED",
      "CANCELLED",
      "COMPLETED",
    ]) {
      assert.equal(
        transitionFor({ status, pastDueSince: null }, kind, now, null),
        null,
        status + " " + kind
      );
    }
  }
  assert.equal(transitionFor({ status: "ACTIVE", pastDueSince: null }, "IGNORED", now, null), null);
});

test("a paid subscription can be cancelled or completed", () => {
  assert.equal(
    transitionFor({ status: "ACTIVE", pastDueSince: null }, "CANCELLED", now, at(5)).status,
    "CANCELLED"
  );
  assert.equal(
    transitionFor({ status: "PAST_DUE", pastDueSince: at(-1) }, "CANCELLED", now, null)
      .pastDueSince,
    null
  );
  assert.equal(
    transitionFor({ status: "ACTIVE", pastDueSince: null }, "COMPLETED", now, null).status,
    "EXPIRED"
  );
});

test("only Razorpay amounts include tax we compute; Stripe's Price is the list price", () => {
  assert.equal(chargeAmount("RAZORPAY", 29900, 1800), 35282);
  assert.equal(chargeAmount("STRIPE", 500, 1800), 500);
  assert.equal(chargeAmount("STRIPE", 500, 0), 500);
});

test("SYNC mirrors the cancel flag on a running plan and nothing else", () => {
  const running = { status: "ACTIVE", pastDueSince: null };
  const on = transitionFor(running, "SYNC", now, null, true);
  assert.deepEqual(on, { status: "ACTIVE", pastDueSince: null, cancelAtPeriodEnd: true });
  const pastDue = transitionFor(
    { status: "PAST_DUE", pastDueSince: at(-2) },
    "SYNC",
    now,
    null,
    false
  );
  assert.equal(pastDue.status, "PAST_DUE");
  assert.equal(pastDue.pastDueSince.getTime(), at(-2).getTime(), "grace clock untouched");
  assert.equal(transitionFor(running, "SYNC", now, null, null), null, "no flag, no change");
  for (const status of ["PENDING", "CANCELLED", "EXPIRED"]) {
    assert.equal(
      transitionFor({ status, pastDueSince: null }, "SYNC", now, null, true),
      null,
      status
    );
  }
});
