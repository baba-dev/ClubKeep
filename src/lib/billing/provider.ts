import type {
  BillableTier,
  BillingCurrency,
  BillingEventKind,
  ProviderId,
} from "@/lib/billing/policy";

export class BillingError extends Error {
  // Explicit field, not a parameter property: Node's type stripping (used by the
  // test runner) does not support parameter properties.
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "BillingError";
    this.status = status;
  }
}

/** Normalized provider webhook event. Contains identifiers only, no personal data. */
export type BillingEvent = {
  provider: ProviderId;
  providerEventId: string;
  /** Provider's raw event name, kept for the audit ledger. */
  eventType: string;
  kind: BillingEventKind;
  occurredAt: Date;
  providerSubscriptionId: string | null;
  periodEnd: Date | null;
  /** UNTRUSTED hint from provider metadata. Never used to choose a club. */
  notedClubId: string | null;
};

export type CheckoutRequest = {
  clubId: string;
  tier: BillableTier;
  currency: BillingCurrency;
  /** What the provider plan must charge per month, tax included, minor units. */
  chargeAmountMinor: number;
  now: Date;
};

export type CheckoutResult = { providerSubscriptionId: string; checkoutUrl: string };

export type HeaderReader = { get(name: string): string | null };

export interface BillingProvider {
  readonly id: ProviderId;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  cancelSubscription(providerSubscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  /** Throws BillingError(401) for a bad signature and BillingError(400) for a malformed body. */
  verifyAndParseWebhook(rawBody: string, headers: HeaderReader): BillingEvent;
}
