// Pure B8 billing rules. No database, clock or network access, so every
// definition is unit-testable and shared by enforcement, webhooks and the UI.
import type { BusinessTier } from "@/generated/prisma/client";

export type BillableTier = Exclude<BusinessTier, "FREE">;
export type BillingCurrency = "INR" | "USD";
export type ProviderId = "RAZORPAY" | "STRIPE";

export const BILLABLE_TIERS: readonly BillableTier[] = ["STARTER", "GROWTH", "PRO"];
/** Owner decision 17 Nov 2026: paid tier is kept 7 days after a failed renewal. */
export const GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

/** Approved monthly list prices, minor units, tax-exclusive (docs/PRODUCT.md). */
export const LIST_PRICE_MINOR: Record<BillingCurrency, Record<BillableTier, number>> = {
  INR: { STARTER: 29_900, GROWTH: 74_900, PRO: 179_900 },
  USD: { STARTER: 500, GROWTH: 1_500, PRO: 2_500 },
};

export function isBillableTier(value: unknown): value is BillableTier {
  return typeof value === "string" && (BILLABLE_TIERS as readonly string[]).includes(value);
}

/** India bills in INR through Razorpay; everywhere else bills in USD through Stripe. */
export function providerForCountry(countryCode: string): ProviderId {
  return normalizeCountry(countryCode) === "IN" ? "RAZORPAY" : "STRIPE";
}
export function currencyForCountry(countryCode: string): BillingCurrency {
  return providerForCountry(countryCode) === "RAZORPAY" ? "INR" : "USD";
}
export function normalizeCountry(countryCode: string): string {
  const value = countryCode.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(value)) throw new Error("Invalid country code");
  return value;
}

/**
 * What the provider plan charges per month, minor units. Razorpay plans are fixed
 * amounts, so GST is computed into them (see priceWithTax). Stripe calculates and
 * adds tax itself at checkout (Stripe Tax), so its Price is the list price.
 */
export function chargeAmount(provider: ProviderId, listMinor: number, taxBasisPoints: number) {
  return provider === "RAZORPAY" ? priceWithTax(listMinor, taxBasisPoints) : listMinor;
}

/**
 * Tax is added on top of the list price (owner decision: tax-exclusive).
 * `taxBasisPoints` is 100ths of a percent (1800 = 18%) and is deliberately
 * required from configuration: the GST rate and rounding are OPEN until a tax
 * adviser confirms them. Rounds to the nearest minor unit, halves up, using
 * integer arithmetic only (no floats for money).
 */
export function priceWithTax(listMinor: number, taxBasisPoints: number): number {
  if (!Number.isSafeInteger(listMinor) || listMinor <= 0) throw new Error("Invalid list price");
  if (!Number.isSafeInteger(taxBasisPoints) || taxBasisPoints < 0 || taxBasisPoints > 10_000) {
    throw new Error("Invalid tax rate");
  }
  return Math.floor((listMinor * (10_000 + taxBasisPoints) + 5_000) / 10_000);
}

export type SubscriptionFacts = {
  /** A paid tier; the database CHECK constraint rejects FREE. */
  tier: BusinessTier;
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
};

/**
 * The tier a club is entitled to right now.
 * - No subscription row: the stored tier stands (hand-set or complimentary).
 * - PENDING (checkout not completed): nothing changes; the stored tier stands.
 * - ACTIVE: the purchased tier.
 * - PAST_DUE: the purchased tier for GRACE_DAYS after the first failure, then FREE.
 * - CANCELLED: the purchased tier until the paid-through date, then FREE.
 * - EXPIRED: FREE.
 * Never deletes anything: FREE only blocks *new* members beyond the cap.
 */
export function effectiveTier(
  subscription: SubscriptionFacts | null,
  storedTier: BusinessTier,
  now: Date
): BusinessTier {
  if (!subscription) return storedTier;
  switch (subscription.status) {
    case "PENDING":
      return storedTier;
    case "ACTIVE":
      return subscription.tier;
    case "PAST_DUE": {
      const since = subscription.pastDueSince;
      return since && now.getTime() < since.getTime() + GRACE_DAYS * DAY_MS
        ? subscription.tier
        : "FREE";
    }
    case "CANCELLED": {
      const end = subscription.currentPeriodEnd;
      return end && now.getTime() < end.getTime() ? subscription.tier : "FREE";
    }
    case "EXPIRED":
      return "FREE";
  }
}

/** When a PAST_DUE club falls to FREE, or null if not applicable. */
export function graceEndsAt(pastDueSince: Date | null): Date | null {
  return pastDueSince ? new Date(pastDueSince.getTime() + GRACE_DAYS * DAY_MS) : null;
}

/** Provider-agnostic webhook outcomes (see provider.ts for the event shape). */
export type BillingEventKind =
  | "ACTIVATED"
  | "CHARGED"
  | "PAYMENT_PENDING"
  | "HALTED"
  | "CANCELLED"
  | "COMPLETED"
  /** No status change; only syncs cancel-at-period-end (e.g. the customer cancelled in the portal). */
  | "SYNC"
  | "IGNORED";

export type SubscriptionPatch = {
  status: SubscriptionFacts["status"];
  currentPeriodEnd?: Date;
  pastDueSince: Date | null;
  /** Set only by SYNC; other transitions leave the stored flag (CANCELLED clears it). */
  cancelAtPeriodEnd?: boolean;
};

/**
 * State transition for one provider event, or null when the event must not
 * change state. Rules that protect revenue and entitlements:
 * - Only a subscription that has been paid (ACTIVE or PAST_DUE) can fail,
 *   cancel or complete; a PENDING (never completed) checkout never earns grace
 *   and an abandoned one never downgrades a hand-set tier.
 * - CANCELLED and EXPIRED are terminal: a late or replayed event cannot revive them.
 * `occurredAt` is the provider's event time, so the grace clock starts at the
 * first failure and not at delivery time.
 */
export function transitionFor(
  current: Pick<SubscriptionFacts, "status" | "pastDueSince">,
  kind: BillingEventKind,
  occurredAt: Date,
  periodEnd: Date | null,
  cancelAtPeriodEnd: boolean | null = null
): SubscriptionPatch | null {
  const keepEnd = periodEnd ? { currentPeriodEnd: periodEnd } : {};
  const paid = current.status === "ACTIVE" || current.status === "PAST_DUE";
  switch (kind) {
    case "ACTIVATED":
    case "CHARGED":
      return paid || current.status === "PENDING"
        ? { status: "ACTIVE", ...keepEnd, pastDueSince: null }
        : null;
    case "PAYMENT_PENDING":
    case "HALTED":
      return paid
        ? {
            status: "PAST_DUE",
            ...keepEnd,
            pastDueSince: current.status === "PAST_DUE" ? current.pastDueSince : occurredAt,
          }
        : null;
    case "CANCELLED":
      return paid ? { status: "CANCELLED", ...keepEnd, pastDueSince: null } : null;
    case "COMPLETED":
      return paid ? { status: "EXPIRED", ...keepEnd, pastDueSince: null } : null;
    case "SYNC":
      // Only a running plan has a cancel flag to sync; status and grace never move.
      return paid && cancelAtPeriodEnd !== null
        ? {
            status: current.status as "ACTIVE" | "PAST_DUE",
            pastDueSince: current.pastDueSince,
            cancelAtPeriodEnd,
          }
        : null;
    case "IGNORED":
      return null;
  }
}
