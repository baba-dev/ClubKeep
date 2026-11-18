# B8: Club subscription billing

Status: **B8-1 engine (#38), B8-2 owner billing page (#39) and B8-3 operator tooling (#40) merged; B8-4 Stripe adapter implemented on a feature branch.** Everything is behind `BILLING_ENABLED=false`. Approved plan: owner decisions of 17 Nov 2026. ClubKeep still never collects club-member fees (rule 2); this is only the owner-to-ClubKeep subscription.

## Decisions

| Topic         | Decision                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Billed entity | One subscription **per club** (`ClubSubscription.clubId` is unique).                                                                                                          |
| Providers     | Razorpay (INR, India) and Stripe (USD, everywhere else) behind the same `BillingProvider` interface. A provider is offered to owners only when its configuration is complete. |
| Grace         | 7 days from the first failed renewal, then Free. Retries do not extend it.                                                                                                    |
| Tax           | Tax-exclusive. Razorpay plans are fixed amounts, so each dashboard plan must equal list price + tax (below).                                                                  |
| Cadence       | Monthly only. Annual Business pricing is not approved.                                                                                                                        |

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

## Stripe integration (B8-4)

Uses the official `stripe` package, pinned exactly (`23.1.0`). Why a package here and not for Razorpay: Stripe's signed-timestamp webhook scheme (replay tolerance, several `v1` signatures during secret rotation) and its Checkout, Price and Billing Portal calls are easy to get subtly wrong by hand, and the typings settle API-version field differences. MIT licence, no runtime dependencies, about 0.4 MiB added to the standalone release (measured). The SDK is built in one place (`src/lib/billing/stripe-client.ts`) and injected into the adapter, so tests never touch the network.

- **Checkout:** a Stripe Checkout Session in subscription mode, **card only**, returning to the club's billing page. Before creating it, ClubKeep fetches the configured Price and **refuses** unless it is active, USD, monthly, exactly the list price ($5, $15, $25) and, if Stripe Tax is on, tax-exclusive.
- **Binding.** Stripe has no subscription id until the customer pays, so a pending row stores the **Checkout Session id** in `providerSubscriptionId`. `checkout.session.completed` (or `checkout.session.async_payment_succeeded`) for a paid subscription session carries both ids; the row holding that session id is rebound to the `sub_` id and activated, under the club lock. The session id (not metadata) is the only key for this step; an id already bound to another club is refused, and starting a second checkout expires the first session so it can no longer be paid.
- **Events:** `invoice.paid` (charge, paid-through date from the invoice line periods), `invoice.payment_failed` (starts the 7-day grace), `customer.subscription.deleted` (cancelled, keeping the paid-through date), `customer.subscription.updated` (`unpaid` halts; otherwise only the cancel-at-period-end flag is mirrored, e.g. when a customer cancels in the portal). Mirroring the flag does not move the ordering clock, so it can never make a real event look stale.
- **Early events are retried, not dropped.** Stripe may deliver `invoice.*` before the checkout event that binds the subscription. An unbound subscription whose metadata marks it as ours answers 503, which rolls back the idempotency claim so Stripe redelivers; events with no ClubKeep marker are recorded and ignored. A paid checkout with no matching pending row (for example an expired replacement) is logged loudly and recorded; it cannot be fixed by retrying.
- **API versions:** the SDK pins `2026-10-28.endive`. The webhook **endpoint** has its own API version, so the parser reads both shapes (`invoice.parent.subscription_details` and the older top-level `subscription`). Create the endpoint on the pinned version anyway.
- **Payment method updates:** owners with a Stripe plan get an **Update payment method** button (Stripe's hosted billing portal, which also shows invoices and lets customers cancel). Razorpay owners keep the email-link instruction. The portal needs a default portal configuration saved in the Stripe dashboard (test and live modes separately).
- **Tax:** `STRIPE_AUTOMATIC_TAX=true|false` is **required with no default**, so billing cannot start until the operator chooses. `true` enables Stripe Tax at checkout (billing address required; set up Stripe Tax and registrations in the dashboard first); `false` charges the list price with no tax added. This is a launch gate, not a code default.

## Configuration (operator, host only)

Never in git, CI or chat. All in `/etc/clubkeep/web.env`; see `.env.example` for placeholders.

`BILLING_ENABLED`, `BILLING_TAX_BASIS_POINTS` (no default; Razorpay GST only), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (at least 16 characters, different from the API secret), `RAZORPAY_PLAN_STARTER`, `RAZORPAY_PLAN_GROWTH`, `RAZORPAY_PLAN_PRO`.

Stripe: `STRIPE_SECRET_KEY` (`sk_test_`/`sk_live_`), `STRIPE_WEBHOOK_SECRET` (`whsec_`), `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO` (`price_`), and `STRIPE_AUTOMATIC_TAX` (`true` or `false`, required). Create three **monthly USD** Prices ($5, $15, $25; tax behavior `exclusive` if Stripe Tax is on), a webhook endpoint at `/api/billing/webhooks/stripe` subscribed to exactly: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, and save a default Billing Portal configuration.

Create three **monthly** plans in the Razorpay dashboard (test mode first) with amounts, in paise: Starter `priceWithTax(29900)`, Growth `priceWithTax(74900)`, Pro `priceWithTax(179900)`. At 18%: 35,282, 88,382 and 212,282. Register the webhook URL above with the six events and the webhook secret.

## Owner billing page (B8-2)

`/clubs/[clubId]/settings/billing`, **OWNER only** (managers and staff get a 404), linked from Club settings and from the members page capacity tile.

- Shows the entitled tier, a member-usage meter that uses the **same seat count as enforcement** (`countMemberSeats`), plan cards, and the situation the club is in: free, checkout pending, active (with renewal date), cancelling, payment retrying (with the grace end date), paused after grace, or cancelled but paid through.
- Prices are list price plus tax. The tax-inclusive total is shown only when the operator has set `BILLING_TAX_BASIS_POINTS`; otherwise the page says tax is added.
- Subscribe sends the owner to the provider's hosted checkout; cancel is two-step and runs to the end of the paid period. Both go through `POST /api/clubs/[clubId]/billing/checkout` and `.../cancel` (same-origin, owner-only, rate-limited, Redis-backed and fail-closed like other owner mutations).
- Honest states: billing off, no country set (links to Club settings), and countries without a live provider all disable the buttons and say why. While a plan runs the page says plan changes are not available yet.
- Plan cards list only what exists today (member cap, QR and manual check-in, ID cards, club leaderboard, payment records). GPS check-in, city leaderboards, WhatsApp, multi-location, export API and priority support are labelled **Coming soon**, never as included. A unit test enforces this and that the card copy matches `MEMBER_LIMITS`.
- Cancel and checkout are unavailable while `BILLING_ENABLED=false` (the kill switch also stops them).
- Not yet done: phone-width (360/390px) and screen-reader QA, and a real checkout round-trip (needs the operator's Razorpay test keys).

## Operator tooling (B8-3)

`infra/billing/clubkeep-billing-ops.sh`: root-only, pure SQL through `psql` as the `postgres` user, installed like the other host tools (`clubkeep-restore-drill`, `clubkeep-cleanup`). It is a shell script, not a Node script, because **lean releases ship only the standalone app and the migration kit**, so nothing under `prisma/*.mjs` exists on the host.

```bash
# From a trusted checkout of the reviewed, merged SHA:
git rev-parse HEAD
bash -n infra/billing/clubkeep-billing-ops.sh
sudo install -o root -g root -m 0750 infra/billing/clubkeep-billing-ops.sh /usr/local/sbin/clubkeep-billing-ops
```

| Command                                                             | What it does                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `list`                                                              | Clubs with a paid tier or subscription, and whether the tier is `complimentary`, `subscription` or free |
| `grant --club ID_OR_SLUG --tier STARTER\|GROWTH\|PRO --reason TEXT` | Gives a pilot club a complimentary paid tier, with no payment                                           |
| `revoke --club ID_OR_SLUG --reason TEXT`                            | Returns a complimentary club to FREE                                                                    |
| `reconcile`                                                         | Writes each subscribed club's entitled tier (grace expiry, paid-through end) and an audit row           |

Rules:

- **Dry run by default.** Each of `grant`, `revoke` and `reconcile` runs inside a transaction that is rolled back and prints what would change; add `--execute` to commit. Run the dry run first.
- `grant` and `revoke` **refuse any club that has a paid subscription** (billing owns its tier), unknown or inactive clubs, and repeated or malformed flags. Nothing is ever deleted.
- `reconcile` only touches clubs **with** a subscription row; hand-set and complimentary clubs are never changed by it. It mirrors `effectiveTier()` in SQL (UTC-safe), and `tests/integration/b8-billing-ops.test.mjs` compares the two across twelve states in CI so they cannot drift.
- The database name must match `clubkeep` or `clubkeep_*` and the script refuses a database without the B8 tables. Defaults: `--db clubkeep --port 5432`.
- Every change writes a `BILLING_TIER_CHANGED` audit row whose reference records the operator (`SUDO_USER`) and the reason, for example `operator-grant:STARTER:by=alice:pilot gym onboarding`. No new schema or migration.
- A complimentary club that later subscribes is governed by its subscription from then on; if that subscription ends the club falls to FREE. Grant again after it ends if the pilot should continue.

Optional daily reconcile (not required for correctness, since enforcement reads `effectiveTier()` directly; it only keeps the stored tier and audit trail tidy). Off until you install it, and not installed by any deploy:

```bash
sudo install -o root -g root -m 0644 infra/billing/clubkeep-billing-reconcile.service /etc/systemd/system/
sudo install -o root -g root -m 0644 infra/billing/clubkeep-billing-reconcile.timer /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/clubkeep-billing-reconcile.service
sudo clubkeep-billing-ops reconcile          # dry run first
sudo systemctl daemon-reload && sudo systemctl enable --now clubkeep-billing-reconcile.timer
```

The systemd units have not been run on the host; verify with `systemd-analyze verify` and one manual run before enabling.

## Launch gates (outside the code)

1. A tax adviser confirms GST treatment, seller registration, invoicing and the rate and rounding to configure. Razorpay subscriptions do not add tax themselves; nothing in this feature produces a GST invoice.
2. Razorpay live account activated; test-mode end-to-end passed (checkout, activation, failed renewal through grace, recovery, cancel, replayed webhook). Record it in [PILOT_GO_LIVE.md](PILOT_GO_LIVE.md).
3. Confirm in test mode that `total_count` 120 is accepted and that `subscription.pending` is what Razorpay sends for a failed charge.
4. Operator sets the flag and secrets. Setting `BILLING_ENABLED=false` stops new checkouts and webhook processing; existing tiers stay as stored.

## Known limits

- No plan changes while a plan runs; no refunds or proration logic beyond Razorpay's own defaults.
- Staff caps, Free quotas, and feature gates (GPS, city leaderboards, WhatsApp) are not enforced; they are OPEN in ENTITLEMENTS.md.
- A provider is offered only when fully configured; until then clubs in its countries see "not available yet". Indian clubs are always Razorpay, everyone else Stripe.
- Unlike the original plan, ClubKeep does not re-verify the Stripe line-item price at binding: the Price is validated (fail closed) when the session is created, the session is ours, and binding is keyed on the stored session id.

## Verification

- Operator tools: `tests/integration/b8-billing-ops.test.mjs` runs the real script against a real database (argument rejection, dry run versus execute, audit rows, refusal of subscribed clubs, reconcile parity with `effectiveTier()`); `tests/unit/billing-ops-static.test.mjs` guards the script and units (strict mode, root-only, no eval, no deletes, UTC time maths).
- Stripe: `tests/unit/billing-stripe.test.mjs` (the **real SDK's** signature verification with valid, tampered, wrong-secret, missing and stale cases; every event mapping in both API shapes; Price validation failing closed; checkout parameters; cancel, abandon and portal calls) and `tests/integration/b8-stripe.test.mjs` (binding exactly once under concurrent delivery, early events retried, forged or orphaned or replaced checkouts refused, ordering with `SYNC`, portal access, grace on a Stripe club). Deliberately removing the retry, making `SYNC` move the clock, or reverting the session-first lookup makes them fail.
- Unit: `tests/unit/billing-policy.test.mjs`, `tests/unit/billing-razorpay.test.mjs` (price and tax maths, entitlement boundaries, state machine, signature checks, fake-`fetch` checkout and cancel).
- PG17 integration: `tests/integration/b8-billing.test.mjs`, wired into CI: constraints, owner-only checkout, idempotent replay and concurrent duplicates, ordering under races, grace expiry limiting new members, cancel semantics, tenant mismatch, legacy and abandoned-checkout protection. Deliberately breaking the grace and stale-event rules makes these tests fail.
