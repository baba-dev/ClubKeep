// Pure view-state for the owner billing page: which situation the club is in
// and whether a new subscription can be started. No database, clock or env access.
import { GRACE_DAYS, graceEndsAt, providerForCountry, type ProviderId } from "@/lib/billing/policy";

/** Providers that are live today. Stripe joins in B8-4. */
export const AVAILABLE_PROVIDERS: readonly ProviderId[] = ["RAZORPAY"];

export type BillingMode =
  "FREE" | "PENDING" | "ACTIVE" | "CANCELING" | "PAST_DUE" | "CANCELLED_PAID";

export type SubscribeBlock =
  null | "BILLING_OFF" | "HAS_PLAN" | "NO_COUNTRY" | "COUNTRY_UNSUPPORTED";

export type ViewSubscription = {
  status: "PENDING" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
  currentPeriodEnd: Date | null;
  pastDueSince: Date | null;
  cancelAtPeriodEnd: boolean;
};

export type BillingView = {
  mode: BillingMode;
  subscribeBlock: SubscribeBlock;
  /** PAST_DUE only: when the paid tier ends, and whether that moment has passed. */
  graceEndsAt: Date | null;
  graceExpired: boolean;
  /** ACTIVE, CANCELING and CANCELLED_PAID: the paid-through or renewal date. */
  periodEnd: Date | null;
  graceDays: number;
};

export function billingView(input: {
  enabled: boolean;
  countryCode: string | null;
  subscription: ViewSubscription | null;
  now: Date;
}): BillingView {
  const { subscription: sub, now } = input;
  let mode: BillingMode = "FREE";
  if (sub) {
    switch (sub.status) {
      case "PENDING":
        mode = "PENDING";
        break;
      case "ACTIVE":
        mode = sub.cancelAtPeriodEnd ? "CANCELING" : "ACTIVE";
        break;
      case "PAST_DUE":
        mode = "PAST_DUE";
        break;
      case "CANCELLED":
        mode =
          sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() > now.getTime()
            ? "CANCELLED_PAID"
            : "FREE";
        break;
      case "EXPIRED":
        mode = "FREE";
        break;
    }
  }
  const ends = mode === "PAST_DUE" ? graceEndsAt(sub?.pastDueSince ?? null) : null;
  let subscribeBlock: SubscribeBlock = null;
  if (!input.enabled) subscribeBlock = "BILLING_OFF";
  else if (
    mode === "ACTIVE" ||
    mode === "CANCELING" ||
    mode === "PAST_DUE" ||
    mode === "CANCELLED_PAID"
  ) {
    subscribeBlock = "HAS_PLAN";
  } else if (!input.countryCode) subscribeBlock = "NO_COUNTRY";
  else if (!AVAILABLE_PROVIDERS.includes(providerForCountry(input.countryCode))) {
    subscribeBlock = "COUNTRY_UNSUPPORTED";
  }
  return {
    mode,
    subscribeBlock,
    graceEndsAt: ends,
    graceExpired: ends ? ends.getTime() <= now.getTime() : false,
    periodEnd:
      mode === "ACTIVE" || mode === "CANCELING" || mode === "CANCELLED_PAID"
        ? (sub?.currentPeriodEnd ?? null)
        : null,
    graceDays: GRACE_DAYS,
  };
}

/** Plan facts shown on the cards. Only facts that exist today; the rest is "coming soon". */
export const PLAN_COPY = {
  FREE: { name: "Free", members: "Up to 25 active members", includes: [], soon: [] },
  STARTER: {
    name: "Starter",
    members: "Up to 75 active members",
    includes: ["QR and manual check-in", "ID cards", "Club leaderboard", "Payment records"],
    soon: [],
  },
  GROWTH: {
    name: "Growth",
    members: "Up to 300 active members",
    includes: ["Everything in Starter"],
    soon: ["GPS check-in", "City leaderboards", "WhatsApp messaging (50 a day)"],
  },
  PRO: {
    name: "Pro",
    members: "Unlimited active members (fair use)",
    includes: ["Everything in Growth"],
    soon: [
      "Multi-location",
      "Data export API",
      "Priority support",
      "WhatsApp messaging (200 a day)",
    ],
  },
} as const;
