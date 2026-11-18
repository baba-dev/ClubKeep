import assert from "node:assert/strict";
import test from "node:test";
import { register } from "node:module";
import Stripe from "stripe";

register("../integration/helpers/src-alias-hook.mjs", import.meta.url);
const { createStripeProvider } = await import("../../src/lib/billing/stripe.ts");
const { BillingError } = await import("../../src/lib/billing/provider.ts");
const { requireStripeConfig, availableProviders } = await import("../../src/lib/billing/config.ts");

const SECRET = "whsec_" + "a".repeat(32);
const config = {
  secretKey: "sk_test_" + "b".repeat(24),
  webhookSecret: SECRET,
  prices: { STARTER: "price_AAAAAAAAAA", GROWTH: "price_BBBBBBBBBB", PRO: "price_CCCCCCCCCC" },
  automaticTax: false,
};
// The real SDK, never used for network calls here: only its webhook verification.
const real = new Stripe(config.secretKey);
const headers = (map) => ({ get: (name) => map[name.toLowerCase()] ?? null });
const SUB = "sub_1ABCDEFGHIJK";
const SESSION = "cs_test_a1B2c3D4e5F6";

function signed(payload, over = {}) {
  const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
  const header = real.webhooks.generateTestHeaderString({ payload: raw, secret: SECRET, ...over });
  return { raw, hdr: headers({ "stripe-signature": header }) };
}
const evt = (type, object, extra = {}) => ({
  id: "evt_" + type.replace(/\W/g, "") + "1234567",
  object: "event",
  type,
  created: 1_790_000_000,
  data: { object },
  ...extra,
});
const parse = (event) => {
  const { raw, hdr } = signed(event);
  return createStripeProvider(config, real).verifyAndParseWebhook(raw, hdr);
};

test("config: strict key shapes, names only in errors, and the tax switch is mandatory", () => {
  const env = {
    STRIPE_SECRET_KEY: config.secretKey,
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_PRICE_STARTER: "price_AAAAAAAAAA",
    STRIPE_PRICE_GROWTH: "price_BBBBBBBBBB",
    STRIPE_PRICE_PRO: "price_CCCCCCCCCC",
    STRIPE_AUTOMATIC_TAX: "true",
  };
  assert.equal(requireStripeConfig(env).automaticTax, true);
  assert.equal(requireStripeConfig({ ...env, STRIPE_AUTOMATIC_TAX: "false" }).automaticTax, false);
  for (const bad of [undefined, "", "TRUE", "yes", "1"]) {
    assert.throws(
      () => requireStripeConfig({ ...env, STRIPE_AUTOMATIC_TAX: bad }),
      /STRIPE_AUTOMATIC_TAX/
    );
  }
  assert.throws(
    () => requireStripeConfig({ ...env, STRIPE_SECRET_KEY: "rk_live_x" }),
    /STRIPE_SECRET_KEY/
  );
  assert.throws(
    () => requireStripeConfig({ ...env, STRIPE_WEBHOOK_SECRET: "nope" }),
    /STRIPE_WEBHOOK_SECRET/
  );
  assert.throws(
    () => requireStripeConfig({ ...env, STRIPE_PRICE_PRO: "plan_x" }),
    /STRIPE_PRICE_PRO/
  );
  assert.throws(
    () => requireStripeConfig({ ...env, STRIPE_SECRET_KEY: "sk_test_secret_leak!" }),
    (e) => !/secret_leak/.test(e.message)
  );
  assert.deepEqual(availableProviders({}), []);
  assert.deepEqual(availableProviders(env), ["STRIPE"]);
});

test("webhook: only a correctly signed, fresh payload is accepted", () => {
  const provider = createStripeProvider(config, real);
  const event = evt("customer.subscription.deleted", { id: SUB });
  const { raw, hdr } = signed(event);
  assert.equal(provider.verifyAndParseWebhook(raw, hdr).kind, "CANCELLED");
  const rejected = (fn) => assert.throws(fn, (e) => e instanceof BillingError && e.status === 401);
  rejected(() => provider.verifyAndParseWebhook(raw.replace(SUB, "sub_1ZZZZZZZZZZZ"), hdr));
  rejected(() =>
    provider.verifyAndParseWebhook(raw, signed(event, { secret: "whsec_" + "c".repeat(32) }).hdr)
  );
  rejected(() => provider.verifyAndParseWebhook(raw, headers({})));
  rejected(() => provider.verifyAndParseWebhook(raw, headers({ "stripe-signature": "t=1,v1=00" })));
  const old = Math.floor(Date.now() / 1000) - 3600;
  rejected(() => provider.verifyAndParseWebhook(raw, signed(event, { timestamp: old }).hdr));
});

test("checkout events activate only paid subscription checkouts and carry the session id", () => {
  const paid = parse(
    evt("checkout.session.completed", {
      id: SESSION,
      mode: "subscription",
      payment_status: "paid",
      subscription: SUB,
      client_reference_id: "club_abc",
    })
  );
  assert.deepEqual(
    [paid.kind, paid.providerSubscriptionId, paid.checkoutSessionId, paid.notedClubId],
    ["ACTIVATED", SUB, SESSION, "club_abc"]
  );
  const asyncPaid = parse(
    evt("checkout.session.async_payment_succeeded", {
      id: SESSION,
      mode: "subscription",
      payment_status: "paid",
      subscription: { id: SUB },
    })
  );
  assert.equal(asyncPaid.kind, "ACTIVATED", "an expanded subscription object is accepted");
  for (const object of [
    { id: SESSION, mode: "subscription", payment_status: "unpaid", subscription: SUB },
    { id: SESSION, mode: "payment", payment_status: "paid", subscription: null },
    { id: SESSION, mode: "subscription", payment_status: "paid", subscription: null },
    { id: "not-a-session", mode: "subscription", payment_status: "paid", subscription: SUB },
  ]) {
    assert.equal(
      parse(evt("checkout.session.completed", object)).kind,
      "IGNORED",
      JSON.stringify(object)
    );
  }
});

test("invoices map to charge and failure in both API shapes, with the latest paid-through date", () => {
  const lines = {
    data: [
      { period: { start: 1, end: 1_792_000_000 } },
      { period: { start: 1, end: 1_795_000_000 } },
    ],
  };
  const current = {
    id: "in_1",
    parent: { subscription_details: { subscription: SUB, metadata: { clubId: "club_abc" } } },
    lines,
  };
  const paid = parse(evt("invoice.paid", current));
  assert.deepEqual(
    [paid.kind, paid.providerSubscriptionId, paid.notedClubId],
    ["CHARGED", SUB, "club_abc"]
  );
  assert.equal(paid.periodEnd.getTime(), 1_795_000_000 * 1000);
  assert.equal(parse(evt("invoice.payment_failed", current)).kind, "PAYMENT_PENDING");
  assert.equal(parse(evt("invoice.payment_failed", current)).periodEnd, null);

  const legacy = {
    id: "in_2",
    subscription: SUB,
    subscription_details: { metadata: { clubId: "club_old" } },
    lines,
  };
  const old = parse(evt("invoice.paid", legacy));
  assert.deepEqual(
    [old.kind, old.providerSubscriptionId, old.notedClubId],
    ["CHARGED", SUB, "club_old"]
  );

  assert.equal(
    parse(evt("invoice.paid", { id: "in_3", lines })).kind,
    "IGNORED",
    "one-off invoice"
  );
  assert.equal(
    parse(evt("invoice.paid", { id: "in_4", subscription: "not-a-sub", lines })).kind,
    "IGNORED"
  );
});

test("subscription events: deletion cancels, unpaid halts, cancel flag syncs, noise is ignored", () => {
  assert.equal(parse(evt("customer.subscription.deleted", { id: SUB })).kind, "CANCELLED");
  assert.equal(
    parse(evt("customer.subscription.updated", { id: SUB, status: "unpaid" })).kind,
    "HALTED"
  );
  const on = parse(
    evt("customer.subscription.updated", { id: SUB, status: "active", cancel_at_period_end: true })
  );
  assert.deepEqual([on.kind, on.cancelAtPeriodEnd], ["SYNC", true]);
  const off = parse(
    evt("customer.subscription.updated", { id: SUB, status: "active", cancel_at_period_end: false })
  );
  assert.deepEqual([off.kind, off.cancelAtPeriodEnd], ["SYNC", false]);
  assert.equal(
    parse(evt("customer.subscription.updated", { id: SUB, status: "active" })).kind,
    "IGNORED"
  );
  assert.equal(parse(evt("customer.created", { id: "cus_1" })).kind, "IGNORED");
  assert.equal(parse(evt("charge.succeeded", { id: "ch_1" })).kind, "IGNORED");
});

function fakeClient(over = {}) {
  const calls = [];
  const rec =
    (name, result) =>
    async (...args) => {
      calls.push([name, ...args]);
      return typeof result === "function" ? result(...args) : result;
    };
  const price = {
    active: true,
    currency: "usd",
    type: "recurring",
    recurring: { interval: "month", interval_count: 1 },
    unit_amount: 500,
    tax_behavior: "exclusive",
  };
  const client = {
    prices: { retrieve: rec("price", () => ({ ...price, ...over.price })) },
    checkout: {
      sessions: {
        create: rec(
          "create",
          over.create ?? { id: SESSION, url: "https://checkout.stripe.com/c/pay/x" }
        ),
        expire: rec("expire", over.expire ?? {}),
      },
    },
    subscriptions: {
      update: rec("update", {}),
      cancel: rec("cancel", {}),
      retrieve: rec("retrieve", over.retrieve ?? { customer: "cus_123" }),
    },
    billingPortal: {
      sessions: { create: rec("portal", { url: "https://billing.stripe.com/p/session/x" }) },
    },
    webhooks: real.webhooks,
  };
  return { client, calls };
}
const request = {
  clubId: "club_abc",
  tier: "STARTER",
  currency: "USD",
  chargeAmountMinor: 500,
  now: new Date("2026-11-18T10:00:00Z"),
  returnUrl: "https://clubkeep.example.test/clubs/club_abc/settings/billing",
};

test("checkout: validates the Stripe Price, then creates a card-only subscription session", async () => {
  const { client, calls } = fakeClient();
  const result = await createStripeProvider(config, client).createCheckout(request);
  assert.deepEqual(result, {
    providerSubscriptionId: SESSION,
    checkoutUrl: "https://checkout.stripe.com/c/pay/x",
  });
  const params = calls.find((c) => c[0] === "create")[1];
  assert.equal(params.mode, "subscription");
  assert.deepEqual(params.line_items, [{ price: "price_AAAAAAAAAA", quantity: 1 }]);
  assert.deepEqual(params.allowed_payment_method_types, ["card"]);
  assert.equal(params.client_reference_id, "club_abc");
  assert.deepEqual(params.subscription_data.metadata, { clubId: "club_abc", tier: "STARTER" });
  assert.equal(params.success_url, request.returnUrl + "?checkout=success");
  assert.equal(params.cancel_url, request.returnUrl + "?checkout=cancelled");
  assert.deepEqual(params.automatic_tax, { enabled: false });
  assert.equal(params.billing_address_collection, undefined);
  const ttl = params.expires_at - Math.floor(request.now.getTime() / 1000);
  assert.ok(ttl > 23 * 3600 && ttl < 24 * 3600, "expiry is just under Stripe's 24 hour maximum");
});

test("checkout: automatic tax is explicit and demands a tax-exclusive Price", async () => {
  const taxed = { ...config, automaticTax: true };
  const { client, calls } = fakeClient();
  await createStripeProvider(taxed, client).createCheckout(request);
  const params = calls.find((c) => c[0] === "create")[1];
  assert.deepEqual(params.automatic_tax, { enabled: true });
  assert.equal(params.billing_address_collection, "required");
  for (const tax_behavior of ["inclusive", "unspecified", null]) {
    const bad = fakeClient({ price: { tax_behavior } });
    await assert.rejects(
      () => createStripeProvider(taxed, bad.client).createCheckout(request),
      (e) => e.status === 500
    );
  }
  // With the switch off, tax behaviour on the Price is not our concern.
  const off = fakeClient({ price: { tax_behavior: "unspecified" } });
  await createStripeProvider(config, off.client).createCheckout(request);
});

test("checkout fails closed on any Price that is not exactly our monthly USD price", async () => {
  for (const price of [
    { active: false },
    { currency: "eur" },
    { type: "one_time", recurring: null },
    { recurring: { interval: "year", interval_count: 1 } },
    { recurring: { interval: "month", interval_count: 3 } },
    { unit_amount: 499 },
    { unit_amount: null },
  ]) {
    const { client, calls } = fakeClient({ price });
    await assert.rejects(
      () => createStripeProvider(config, client).createCheckout(request),
      (e) => e instanceof BillingError && e.status === 500,
      JSON.stringify(price)
    );
    assert.equal(
      calls.some((c) => c[0] === "create"),
      false,
      "no session for a mismatched price"
    );
  }
  await assert.rejects(
    () =>
      createStripeProvider(config, fakeClient().client).createCheckout({
        ...request,
        currency: "INR",
      }),
    (e) => e.status === 400
  );
});

test("checkout: unexpected responses and SDK errors never leak provider detail", async () => {
  for (const create of [
    { id: "weird", url: "https://x" },
    { id: SESSION, url: null },
  ]) {
    const { client } = fakeClient({ create });
    await assert.rejects(
      () => createStripeProvider(config, client).createCheckout(request),
      (e) => e.status === 502
    );
  }
  const { client } = fakeClient();
  client.prices.retrieve = async () => {
    throw new Error("No such price: price_secret_detail");
  };
  await assert.rejects(
    () => createStripeProvider(config, client).createCheckout(request),
    (e) => e.status === 502 && !/secret_detail/.test(e.message)
  );
});

test("cancel, abandon and portal use the right Stripe calls and validate ids", async () => {
  const { client, calls } = fakeClient();
  const provider = createStripeProvider(config, client);
  await provider.cancelSubscription(SUB, true);
  await provider.cancelSubscription(SUB, false);
  assert.deepEqual(
    calls.filter((c) => c[0] === "update" || c[0] === "cancel").map((c) => [c[0], c[2]]),
    [
      ["update", { cancel_at_period_end: true }],
      ["cancel", undefined],
    ]
  );
  await assert.rejects(
    () => provider.cancelSubscription(SESSION, true),
    (e) => e.status === 400
  );
  await assert.rejects(
    () => provider.cancelSubscription("../../x", false),
    (e) => e.status === 400
  );

  await provider.abandonCheckout(SESSION);
  await provider.abandonCheckout(SUB);
  assert.deepEqual(
    calls.filter((c) => c[0] === "expire").map((c) => c[1]),
    [SESSION],
    "only checkout sessions are expired"
  );
  const failing = fakeClient();
  failing.client.checkout.sessions.expire = async () => {
    throw new Error("already complete");
  };
  await createStripeProvider(config, failing.client).abandonCheckout(SESSION);

  const url = await provider.createPortalSession(SUB, request.returnUrl);
  assert.equal(url, "https://billing.stripe.com/p/session/x");
  assert.deepEqual(calls.find((c) => c[0] === "portal")[1], {
    customer: "cus_123",
    return_url: request.returnUrl,
  });
  const expanded = fakeClient({ retrieve: { customer: { id: "cus_999" } } });
  await createStripeProvider(config, expanded.client).createPortalSession(SUB, request.returnUrl);
  assert.equal(expanded.calls.find((c) => c[0] === "portal")[1].customer, "cus_999");
  await assert.rejects(
    () => provider.createPortalSession(SESSION, request.returnUrl),
    (e) => e.status === 400
  );
});
