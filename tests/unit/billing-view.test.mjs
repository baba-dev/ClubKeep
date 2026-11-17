import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { billingView, PLAN_COPY } = await import("../../src/lib/billing/view.ts");
const { MEMBER_LIMITS } = await import("../../src/lib/business-entitlements.ts");
const { GRACE_DAYS } = await import("../../src/lib/billing/policy.ts");

const DAY = 86_400_000;
const now = new Date("2026-11-18T10:00:00Z");
const at = (days) => new Date(now.getTime() + days * DAY);
const sub = (over = {}) => ({
  status: "ACTIVE",
  currentPeriodEnd: at(20),
  pastDueSince: null,
  cancelAtPeriodEnd: false,
  ...over,
});
const view = (over = {}) =>
  billingView({ enabled: true, countryCode: "IN", subscription: null, now, ...over });

test("a club with no subscription can subscribe when billing is on and the country is supported", () => {
  const v = view();
  assert.equal(v.mode, "FREE");
  assert.equal(v.subscribeBlock, null);
});

test("billing off wins over everything; missing or unsupported country is explained", () => {
  assert.equal(view({ enabled: false }).subscribeBlock, "BILLING_OFF");
  assert.equal(view({ enabled: false, subscription: sub() }).subscribeBlock, "BILLING_OFF");
  assert.equal(view({ countryCode: null }).subscribeBlock, "NO_COUNTRY");
  assert.equal(
    view({ countryCode: "US" }).subscribeBlock,
    "COUNTRY_UNSUPPORTED",
    "Stripe is not live yet"
  );
});

test("every running plan blocks a second subscription", () => {
  for (const subscription of [
    sub(),
    sub({ cancelAtPeriodEnd: true }),
    sub({ status: "PAST_DUE", pastDueSince: at(-1) }),
    sub({ status: "CANCELLED", currentPeriodEnd: at(3) }),
  ]) {
    assert.equal(view({ subscription }).subscribeBlock, "HAS_PLAN");
  }
});

test("modes follow the subscription state", () => {
  assert.equal(view({ subscription: sub({ status: "PENDING" }) }).mode, "PENDING");
  assert.equal(view({ subscription: sub() }).mode, "ACTIVE");
  assert.equal(view({ subscription: sub({ cancelAtPeriodEnd: true }) }).mode, "CANCELING");
  assert.equal(
    view({ subscription: sub({ status: "CANCELLED", currentPeriodEnd: at(3) }) }).mode,
    "CANCELLED_PAID"
  );
  assert.equal(
    view({ subscription: sub({ status: "CANCELLED", currentPeriodEnd: at(-1) }) }).mode,
    "FREE"
  );
  assert.equal(view({ subscription: sub({ status: "EXPIRED" }) }).mode, "FREE");
});

test("a pending checkout can be restarted; a finished plan can be replaced", () => {
  assert.equal(view({ subscription: sub({ status: "PENDING" }) }).subscribeBlock, null);
  assert.equal(view({ subscription: sub({ status: "EXPIRED" }) }).subscribeBlock, null);
  assert.equal(
    view({ subscription: sub({ status: "CANCELLED", currentPeriodEnd: at(-1) }) }).subscribeBlock,
    null
  );
});

test("past-due shows the grace end and flips to expired exactly at 7 days", () => {
  const running = view({ subscription: sub({ status: "PAST_DUE", pastDueSince: at(-6) }) });
  assert.equal(running.graceExpired, false);
  assert.equal(running.graceEndsAt.getTime(), at(1).getTime());
  assert.equal(
    view({ subscription: sub({ status: "PAST_DUE", pastDueSince: at(-7) }) }).graceExpired,
    true
  );
  assert.equal(running.graceDays, GRACE_DAYS);
  assert.equal(view({ subscription: sub() }).graceEndsAt, null);
});

test("renewal and paid-through dates are only exposed when meaningful", () => {
  assert.equal(view({ subscription: sub() }).periodEnd.getTime(), at(20).getTime());
  assert.equal(
    view({ subscription: sub({ status: "PAST_DUE", pastDueSince: at(-1) }) }).periodEnd,
    null
  );
  assert.equal(view().periodEnd, null);
});

test("plan card copy never drifts from the enforced member limits", () => {
  for (const tier of ["FREE", "STARTER", "GROWTH"]) {
    const number = Number(PLAN_COPY[tier].members.match(/\d+/)[0]);
    assert.equal(number, MEMBER_LIMITS[tier], tier);
  }
  assert.equal(MEMBER_LIMITS.PRO, null);
  assert.match(PLAN_COPY.PRO.members, /Unlimited/);
});

test("unbuilt features are only ever listed as coming soon, never as included", () => {
  const unbuilt = /GPS|City leaderboards|WhatsApp|Multi-location|export API|Priority support/i;
  for (const copy of Object.values(PLAN_COPY)) {
    for (const item of copy.includes) assert.doesNotMatch(item, unbuilt);
  }
  assert.ok(PLAN_COPY.GROWTH.soon.length > 0 && PLAN_COPY.PRO.soon.length > 0);
});
