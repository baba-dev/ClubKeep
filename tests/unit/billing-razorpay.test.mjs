import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";

register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { createRazorpayProvider, sign, TOTAL_COUNT } =
  await import("../../src/lib/billing/razorpay.ts");
const { BillingError } = await import("../../src/lib/billing/provider.ts");
const { billingEnabled, requireRazorpayConfig } = await import("../../src/lib/billing/config.ts");

const config = {
  keyId: "rzp_test_abcdef123456",
  keySecret: "key-secret-value",
  webhookSecret: "webhook-secret-0123456789",
  plans: {
    STARTER: "plan_AAAAAAAAAAAAAA",
    GROWTH: "plan_BBBBBBBBBBBBBB",
    PRO: "plan_CCCCCCCCCCCCCC",
  },
  taxBasisPoints: 1800,
};
const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });
const body = (event, entity = {}) =>
  JSON.stringify({
    event,
    created_at: 1_790_000_000,
    payload: {
      subscription: { entity: { id: "sub_ABCDEFGH1234", current_end: 1_792_000_000, ...entity } },
    },
  });
const signed = (raw, extra = {}) =>
  headers({
    "x-razorpay-signature": sign(raw, config.webhookSecret),
    "x-razorpay-event-id": "evt_123456",
    ...extra,
  });

test("a correctly signed subscription event is parsed and normalized", () => {
  const raw = body("subscription.charged", { notes: { clubId: "club_1", tier: "GROWTH" } });
  const event = createRazorpayProvider(config).verifyAndParseWebhook(raw, signed(raw));
  assert.equal(event.kind, "CHARGED");
  assert.equal(event.providerSubscriptionId, "sub_ABCDEFGH1234");
  assert.equal(event.providerEventId, "evt_123456");
  assert.equal(event.occurredAt.toISOString(), new Date(1_790_000_000_000).toISOString());
  assert.equal(event.periodEnd.getTime(), 1_792_000_000_000);
  assert.equal(event.notedClubId, "club_1");
});

test("every subscription event name maps to the right kind", () => {
  const expected = {
    "subscription.activated": "ACTIVATED",
    "subscription.charged": "CHARGED",
    "subscription.pending": "PAYMENT_PENDING",
    "subscription.halted": "HALTED",
    "subscription.cancelled": "CANCELLED",
    "subscription.completed": "COMPLETED",
    "subscription.authenticated": "IGNORED",
    "subscription.paused": "IGNORED",
    "subscription.updated": "IGNORED",
  };
  const provider = createRazorpayProvider(config);
  for (const [name, kind] of Object.entries(expected)) {
    const raw = body(name);
    assert.equal(provider.verifyAndParseWebhook(raw, signed(raw)).kind, kind, name);
  }
});

test("tampered body, wrong secret and missing signature are rejected with 401", () => {
  const provider = createRazorpayProvider(config);
  const raw = body("subscription.charged");
  const good = signed(raw);
  for (const attempt of [
    () => provider.verifyAndParseWebhook(raw.replace("1792000000", "1799999999"), good),
    () =>
      provider.verifyAndParseWebhook(
        raw,
        headers({
          "x-razorpay-signature": sign(raw, "another-secret-0123456"),
          "x-razorpay-event-id": "evt_123456",
        })
      ),
    () => provider.verifyAndParseWebhook(raw, headers({ "x-razorpay-event-id": "evt_123456" })),
    () =>
      provider.verifyAndParseWebhook(
        raw,
        headers({ "x-razorpay-signature": "zz".repeat(32), "x-razorpay-event-id": "evt_123456" })
      ),
  ]) {
    assert.throws(attempt, (e) => e instanceof BillingError && e.status === 401);
  }
});

test("a valid signature with a missing event id or malformed body is rejected with 400", () => {
  const provider = createRazorpayProvider(config);
  const raw = body("subscription.charged");
  assert.throws(
    () =>
      provider.verifyAndParseWebhook(
        raw,
        headers({ "x-razorpay-signature": sign(raw, config.webhookSecret) })
      ),
    (e) => e instanceof BillingError && e.status === 400
  );
  const notJson = "not json";
  assert.throws(
    () => provider.verifyAndParseWebhook(notJson, signed(notJson)),
    (e) => e.status === 400
  );
  const badShape = JSON.stringify({ event: 1 });
  assert.throws(
    () => provider.verifyAndParseWebhook(badShape, signed(badShape)),
    (e) => e.status === 400
  );
});

test("non-subscription events and empty-array notes are tolerated", () => {
  const provider = createRazorpayProvider(config);
  const payment = JSON.stringify({
    event: "payment.captured",
    created_at: 1_790_000_000,
    payload: { payment: {} },
  });
  const ignored = provider.verifyAndParseWebhook(payment, signed(payment));
  assert.equal(ignored.kind, "IGNORED");
  assert.equal(ignored.providerSubscriptionId, null);
  const raw = body("subscription.activated", { notes: [] });
  assert.equal(provider.verifyAndParseWebhook(raw, signed(raw)).notedClubId, null);
});

function fakeFetch(handlers) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init });
    const key = (init.method ?? "GET") + " " + url.replace("https://api.razorpay.com/v1", "");
    const handler = handlers[key];
    if (!handler) return new Response("{}", { status: 404 });
    return handler(init);
  };
  return { impl, calls };
}
const ok = (value) => () => new Response(JSON.stringify(value), { status: 200 });
const goodPlan = { period: "monthly", interval: 1, item: { amount: 35282, currency: "INR" } };
const request = {
  clubId: "club_1",
  tier: "STARTER",
  currency: "INR",
  chargeAmountMinor: 35282,
  now: new Date("2026-11-18T10:00:00Z"),
};

test("checkout verifies the plan price, then creates a subscription with Basic auth", async () => {
  const { impl, calls } = fakeFetch({
    "GET /plans/plan_AAAAAAAAAAAAAA": ok(goodPlan),
    "POST /subscriptions": ok({ id: "sub_ABCDEFGH1234", short_url: "https://rzp.io/i/abc" }),
  });
  const result = await createRazorpayProvider(config, impl).createCheckout(request);
  assert.deepEqual(result, {
    providerSubscriptionId: "sub_ABCDEFGH1234",
    checkoutUrl: "https://rzp.io/i/abc",
  });
  assert.equal(
    calls[0].init.headers.Authorization,
    "Basic " + Buffer.from(config.keyId + ":" + config.keySecret).toString("base64")
  );
  const sent = JSON.parse(calls[1].init.body);
  assert.equal(sent.plan_id, "plan_AAAAAAAAAAAAAA");
  assert.equal(sent.total_count, TOTAL_COUNT);
  assert.deepEqual(sent.notes, { clubId: "club_1", tier: "STARTER" });
  assert.equal(sent.expire_by, Math.floor(request.now.getTime() / 1000) + 86400);
});

test("checkout fails closed when the dashboard plan does not match our price", async () => {
  for (const wrong of [
    { ...goodPlan, item: { amount: 29900, currency: "INR" } },
    { ...goodPlan, item: { amount: 35282, currency: "USD" } },
    { ...goodPlan, period: "yearly" },
    { ...goodPlan, interval: 2 },
  ]) {
    const { impl, calls } = fakeFetch({ "GET /plans/plan_AAAAAAAAAAAAAA": ok(wrong) });
    await assert.rejects(
      () => createRazorpayProvider(config, impl).createCheckout(request),
      (e) => e instanceof BillingError && e.status === 500
    );
    assert.equal(calls.length, 1, "no subscription is created for a mismatched plan");
  }
});

test("provider errors never leak the provider's response body", async () => {
  const { impl } = fakeFetch({
    "GET /plans/plan_AAAAAAAAAAAAAA": () =>
      new Response('{"error":{"description":"secret detail"}}', { status: 400 }),
  });
  await assert.rejects(
    () => createRazorpayProvider(config, impl).createCheckout(request),
    (e) => e instanceof BillingError && e.status === 502 && !/secret detail/.test(e.message)
  );
  const down = async () => {
    throw new Error("ECONNRESET with token");
  };
  await assert.rejects(
    () => createRazorpayProvider(config, down).createCheckout(request),
    (e) => e.status === 502 && !/token/.test(e.message)
  );
});

test("INR only, and cancel sends cancel_at_cycle_end", async () => {
  await assert.rejects(
    () => createRazorpayProvider(config).createCheckout({ ...request, currency: "USD" }),
    (e) => e.status === 400
  );
  const { impl, calls } = fakeFetch({ "POST /subscriptions/sub_ABCDEFGH1234/cancel": ok({}) });
  const provider = createRazorpayProvider(config, impl);
  await provider.cancelSubscription("sub_ABCDEFGH1234", true);
  await provider.cancelSubscription("sub_ABCDEFGH1234", false);
  assert.deepEqual(
    calls.map((c) => JSON.parse(c.init.body)),
    [{ cancel_at_cycle_end: true }, { cancel_at_cycle_end: false }]
  );
  await assert.rejects(
    () => provider.cancelSubscription("../../evil", true),
    (e) => e.status === 400
  );
});

test("billing is off unless explicitly enabled; config errors name keys, never values", () => {
  assert.equal(billingEnabled({}), false);
  assert.equal(billingEnabled({ BILLING_ENABLED: "TRUE" }), false);
  assert.equal(billingEnabled({ BILLING_ENABLED: "true" }), true);
  const env = {
    RAZORPAY_KEY_ID: "rzp_test_abcdef123456",
    RAZORPAY_KEY_SECRET: "s3cret-value",
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret-0123456789",
    RAZORPAY_PLAN_STARTER: "plan_AAAAAAAAAAAAAA",
    RAZORPAY_PLAN_GROWTH: "plan_BBBBBBBBBBBBBB",
    RAZORPAY_PLAN_PRO: "plan_CCCCCCCCCCCCCC",
    BILLING_TAX_BASIS_POINTS: "1800",
  };
  assert.equal(requireRazorpayConfig(env).taxBasisPoints, 1800);
  assert.throws(
    () => requireRazorpayConfig({ ...env, BILLING_TAX_BASIS_POINTS: undefined }),
    /BILLING_TAX_BASIS_POINTS/
  );
  assert.throws(
    () => requireRazorpayConfig({ ...env, BILLING_TAX_BASIS_POINTS: "18%" }),
    /BILLING_TAX_BASIS_POINTS/
  );
  assert.throws(
    () => requireRazorpayConfig({ ...env, RAZORPAY_PLAN_PRO: "oops" }),
    /RAZORPAY_PLAN_PRO/
  );
  assert.throws(
    () => requireRazorpayConfig({ ...env, RAZORPAY_WEBHOOK_SECRET: "short" }),
    /at least 16/
  );
  assert.throws(
    () => requireRazorpayConfig({ ...env, RAZORPAY_KEY_ID: "bad" }),
    (e) =>
      /RAZORPAY_KEY_ID/.test(e.message) && !/bad/.test(e.message.replace("RAZORPAY_KEY_ID", ""))
  );
});
