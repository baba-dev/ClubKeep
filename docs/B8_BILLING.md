# B8: Club subscription billing

Status: **B8-1 engine implemented on a feature branch, not released.** No owner UI yet (B8-2) and no Stripe adapter yet (B8-4). Everything is behind `BILLING_ENABLED=false`. Approved plan: owner decisions of 17 Nov 2026. ClubKeep still never collects club-member fees (rule 2); this is only the owner-to-ClubKeep subscription.

## Decisions

| Topic         | Decision                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| Billed entity | One subscription **per club** (`ClubSubscription.clubId` is unique).                                          |
| Providers     | Razorpay first (INR, India); Stripe later (USD, everywhere else) behind the same `BillingProvider` interface. |
| Grace         | 7 days from the first failed renewal, then Free. Retries do not extend it.                                    |
| Tax           | Tax-exclusive. Razorpay plans are fixed amounts, so each dashboard plan must equal list price + tax (below).  |
| Cadence       | Monthly only. Annual Business pricing is not approved.                                                        |

## How it works

- `src/lib/billing/policy.ts` (pure): approved list prices, `priceWithTax`, `providerForCountry`, **`effectiveTier`**, and the webhook state machine `transitionFor`.
- `Club.businessTier` is kept in step with the subscription by `reconcileClubTier` (with an audit `SecurityEvent`), but **enforcement does not rely on it**: `assertMemberSeatAvailable` and `requireClubActive` read through `effectiveTier`, so an expired grace period or ended plan limits new members immediately with no timer.
- A club with **no** `ClubSubscription` row keeps whatever tier it has (hand-set or otherwise). Existing clubs are never downgraded by this feature.
- Entitlement rules: ACTIVE gives the purchased tier; PAST_DUE keeps it for 7 days then Free; CANCELLED keeps it until the paid-through date; EXPIRED is Free; PENDING (checkout not completed) changes nothing.
- Safety rules: only a paid subscription can fail, cancel or complete, so an abandoned checkout never earns grace nor downgrades a hand-set tier; CANCELLED and EXPIRED are terminal.

## Razorpay integration

- No SDK and no new dependency: `fetch` with Basic auth and `node:crypto` HMAC (`src/lib/billing/razorpay.ts`).
- Checkout creates a subscription and redirects the owner to Razorpay's hosted page (`short_url`), so no third-party script runs in ClubKeep and no card data touches ClubKeep. Before creating it, ClubKeep **fetches the dashboard plan and refuses checkout** unless it is monthly, INR and exactly list price + tax.
- Webhook: `POST /api/billing/webhooks/razorpay`. Authenticated only by `X-Razorpay-Signature` (HMAC-SHA256 of the raw body, constant-time compare); `X-Razorpay-Event-Id` is the idempotency key; 256 KiB cap; answers 503 when billing is off or misconfigured so Razorpay retries. Handled events: `subscription.activated`, `.charged`, `.pending`, `.halted`, `.cancelled`, `.completed`; all others are recorded and ignored.
- The club is found **only** through ClubKeep's own stored provider subscription id. A `clubId` in provider metadata is a hint that must match; a mismatch is recorded and not applied.
- Events are serialized per club (Club row lock first, always) and ordered by the provider's event time; older events cannot undo newer ones. Any unexpected error rolls back everything, including the idempotency claim, so the provider's retry works.
- Logs contain no payloads, emails, secrets or tokens; provider error bodies are never shown to users.

## Configuration (operator, host only)

Never in git, CI or chat. All in `/etc/clubkeep/web.env`; see `.env.example` for placeholders.

`BILLING_ENABLED`, `BILLING_TAX_BASIS_POINTS` (no default), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (at least 16 characters, different from the API secret), `RAZORPAY_PLAN_STARTER`, `RAZORPAY_PLAN_GROWTH`, `RAZORPAY_PLAN_PRO`.

Create three **monthly** plans in the Razorpay dashboard (test mode first) with amounts, in paise: Starter `priceWithTax(29900)`, Growth `priceWithTax(74900)`, Pro `priceWithTax(179900)`. At 18%: 35,282, 88,382 and 212,282. Register the webhook URL above with the six events and the webhook secret.

## Launch gates (outside the code)

1. A tax adviser confirms GST treatment, seller registration, invoicing and the rate and rounding to configure. Razorpay subscriptions do not add tax themselves; nothing in this feature produces a GST invoice.
2. Razorpay live account activated; test-mode end-to-end passed (checkout, activation, failed renewal through grace, recovery, cancel, replayed webhook). Record it in [PILOT_GO_LIVE.md](PILOT_GO_LIVE.md).
3. Confirm in test mode that `total_count` 120 is accepted and that `subscription.pending` is what Razorpay sends for a failed charge.
4. Operator sets the flag and secrets. Setting `BILLING_ENABLED=false` stops new checkouts and webhook processing; existing tiers stay as stored.

## Known limits

- No plan changes while a plan runs; no refunds or proration logic beyond Razorpay's own defaults.
- Staff caps, Free quotas, and feature gates (GPS, city leaderboards, WhatsApp) are not enforced; they are OPEN in ENTITLEMENTS.md.
- Non-India clubs are told billing is not available until the Stripe adapter ships.
- No owner UI, complimentary-tier script or reconcile timer yet (B8-2 and B8-3).

## Verification

- Unit: `tests/unit/billing-policy.test.mjs`, `tests/unit/billing-razorpay.test.mjs` (price and tax maths, entitlement boundaries, state machine, signature checks, fake-`fetch` checkout and cancel).
- PG17 integration: `tests/integration/b8-billing.test.mjs`, wired into CI: constraints, owner-only checkout, idempotent replay and concurrent duplicates, ordering under races, grace expiry limiting new members, cancel semantics, tenant mismatch, legacy and abandoned-checkout protection. Deliberately breaking the grace and stale-event rules makes these tests fail.
