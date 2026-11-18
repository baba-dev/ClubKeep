// Stripe adapter (USD, non-India clubs). Takes the SDK client as a parameter so
// tests never touch the network; src/lib/billing/stripe-client.ts builds the real one.
import type Stripe from "stripe";
import type { StripeConfig } from "@/lib/billing/config";
import type { BillingEventKind } from "@/lib/billing/policy";
import {
  BillingError,
  type BillingEvent,
  type BillingProvider,
  type CheckoutRequest,
  type HeaderReader,
} from "@/lib/billing/provider";

export type StripeClient = Pick<
  Stripe,
  "prices" | "checkout" | "subscriptions" | "billingPortal" | "webhooks"
>;

/** Just under Stripe's 24 hour maximum for a Checkout Session. */
const CHECKOUT_TTL_SECONDS = 24 * 3600 - 300;
const SUB_ID = /^sub_[A-Za-z0-9]{8,64}$/;
const SESSION_ID = /^cs_[A-Za-z0-9_]{8,200}$/;

type Obj = Record<string, unknown>;
const asObj = (value: unknown): Obj | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Obj) : null;

/** A subscription reference is either an id string or an expanded object with an id. */
function idOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  const o = asObj(value);
  return o && typeof o.id === "string" ? o.id : null;
}

function hintOf(metadata: unknown): string | null {
  const m = asObj(metadata);
  return m && typeof m.clubId === "string" && m.clubId.length <= 64 ? m.clubId : null;
}

/**
 * Invoice to subscription. API version 2026-10-28 links through
 * parent.subscription_details; older endpoint versions use a top-level
 * `subscription`. The webhook endpoint has its own API version, so read both.
 */
function invoiceSubscription(invoice: Obj): { id: string | null; hint: string | null } {
  const details = asObj(asObj(invoice.parent)?.subscription_details);
  const id = idOf(details?.subscription) ?? idOf(invoice.subscription);
  const hint = hintOf(details?.metadata) ?? hintOf(asObj(invoice.subscription_details)?.metadata);
  return { id: id && SUB_ID.test(id) ? id : null, hint };
}

/** Paid-through date: the latest service period end among the invoice's lines. */
function invoicePeriodEnd(invoice: Obj): Date | null {
  const lines = asObj(invoice.lines);
  const data = Array.isArray(lines?.data) ? lines.data : [];
  let max = 0;
  for (const line of data) {
    const end = asObj(asObj(line)?.period)?.end;
    if (typeof end === "number" && Number.isSafeInteger(end) && end > max) max = end;
  }
  return max > 0 ? new Date(max * 1000) : null;
}

export function createStripeProvider(config: StripeConfig, client: StripeClient): BillingProvider {
  async function guard<T>(work: Promise<T>): Promise<T> {
    try {
      return await work;
    } catch {
      // Never surface Stripe's error text: it can echo request details.
      throw new BillingError(502, "The billing provider rejected the request.");
    }
  }

  return {
    id: "STRIPE",

    async createCheckout(request: CheckoutRequest) {
      if (request.currency !== "USD") throw new BillingError(400, "Stripe bills in USD only");
      const priceId = config.prices[request.tier];
      const price = await guard(client.prices.retrieve(priceId));
      // Fail closed if the operator's Stripe Price does not match our price exactly.
      if (
        !price.active ||
        price.currency !== "usd" ||
        price.type !== "recurring" ||
        price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1 ||
        price.unit_amount !== request.chargeAmountMinor ||
        (config.automaticTax && price.tax_behavior !== "exclusive")
      ) {
        throw new BillingError(500, "Billing is not configured correctly for this plan.");
      }
      const session = await guard(
        client.checkout.sessions.create({
          mode: "subscription",
          line_items: [{ price: priceId, quantity: 1 }],
          allowed_payment_method_types: ["card"],
          // Hints only: our stored session id, not these, decides which club is billed.
          client_reference_id: request.clubId,
          subscription_data: { metadata: { clubId: request.clubId, tier: request.tier } },
          success_url: request.returnUrl + "?checkout=success",
          cancel_url: request.returnUrl + "?checkout=cancelled",
          expires_at: Math.floor(request.now.getTime() / 1000) + CHECKOUT_TTL_SECONDS,
          automatic_tax: { enabled: config.automaticTax },
          ...(config.automaticTax ? { billing_address_collection: "required" as const } : {}),
        })
      );
      if (!SESSION_ID.test(session.id) || !session.url) {
        throw new BillingError(502, "Unexpected billing provider response.");
      }
      return { providerSubscriptionId: session.id, checkoutUrl: session.url };
    },

    async abandonCheckout(providerSubscriptionId) {
      if (!SESSION_ID.test(providerSubscriptionId)) return;
      try {
        await client.checkout.sessions.expire(providerSubscriptionId);
      } catch {
        /* best effort: it may already be complete or expired */
      }
    },

    async cancelSubscription(providerSubscriptionId, atPeriodEnd) {
      if (!SUB_ID.test(providerSubscriptionId)) throw new BillingError(400, "Invalid subscription");
      if (atPeriodEnd) {
        await guard(
          client.subscriptions.update(providerSubscriptionId, { cancel_at_period_end: true })
        );
      } else {
        await guard(client.subscriptions.cancel(providerSubscriptionId));
      }
    },

    async createPortalSession(providerSubscriptionId, returnUrl) {
      if (!SUB_ID.test(providerSubscriptionId)) throw new BillingError(400, "Invalid subscription");
      const subscription = await guard(client.subscriptions.retrieve(providerSubscriptionId));
      const customer = idOf(subscription.customer);
      if (!customer) throw new BillingError(502, "Unexpected billing provider response.");
      const session = await guard(
        client.billingPortal.sessions.create({ customer, return_url: returnUrl })
      );
      return session.url;
    },

    verifyAndParseWebhook(rawBody: string, headers: HeaderReader): BillingEvent {
      const signature = headers.get("stripe-signature");
      if (!signature) throw new BillingError(401, "Invalid signature");
      let event: Stripe.Event;
      try {
        // Verifies the signed timestamp (5 minute tolerance) and every v1 signature.
        event = client.webhooks.constructEvent(rawBody, signature, config.webhookSecret);
      } catch {
        throw new BillingError(401, "Invalid signature");
      }
      const base = {
        provider: "STRIPE" as const,
        providerEventId: event.id,
        eventType: event.type,
        occurredAt: new Date(event.created * 1000),
        providerSubscriptionId: null as string | null,
        periodEnd: null as Date | null,
        notedClubId: null as string | null,
      };
      const ignored = (): BillingEvent => ({ ...base, kind: "IGNORED" });
      const make = (kind: BillingEventKind, extra: Partial<BillingEvent>): BillingEvent => ({
        ...base,
        kind,
        ...extra,
      });

      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object as unknown as Obj;
          const subscription = idOf(session.subscription);
          const sessionId = typeof session.id === "string" ? session.id : "";
          // Only a paid subscription checkout activates. Card-only checkout is
          // synchronous; an async success arrives as its own event.
          if (
            session.mode !== "subscription" ||
            session.payment_status !== "paid" ||
            !subscription ||
            !SUB_ID.test(subscription) ||
            !SESSION_ID.test(sessionId)
          ) {
            return ignored();
          }
          return make("ACTIVATED", {
            providerSubscriptionId: subscription,
            checkoutSessionId: sessionId,
            notedClubId:
              typeof session.client_reference_id === "string" &&
              session.client_reference_id.length <= 64
                ? session.client_reference_id
                : null,
          });
        }
        case "invoice.paid":
        case "invoice.payment_failed": {
          const invoice = event.data.object as unknown as Obj;
          const { id, hint } = invoiceSubscription(invoice);
          if (!id) return ignored(); // one-off invoice or not a subscription
          return make(event.type === "invoice.paid" ? "CHARGED" : "PAYMENT_PENDING", {
            providerSubscriptionId: id,
            periodEnd: event.type === "invoice.paid" ? invoicePeriodEnd(invoice) : null,
            notedClubId: hint,
          });
        }
        case "customer.subscription.deleted": {
          const subscription = event.data.object as unknown as Obj;
          const id = idOf(subscription);
          if (!id || !SUB_ID.test(id)) return ignored();
          return make("CANCELLED", {
            providerSubscriptionId: id,
            notedClubId: hintOf(subscription.metadata),
          });
        }
        case "customer.subscription.updated": {
          const subscription = event.data.object as unknown as Obj;
          const id = idOf(subscription);
          if (!id || !SUB_ID.test(id)) return ignored();
          const common = { providerSubscriptionId: id, notedClubId: hintOf(subscription.metadata) };
          // Stripe's dashboard setting can end retries as "unpaid" instead of cancelling.
          if (subscription.status === "unpaid") return make("HALTED", common);
          return typeof subscription.cancel_at_period_end === "boolean"
            ? make("SYNC", { ...common, cancelAtPeriodEnd: subscription.cancel_at_period_end })
            : ignored();
        }
        default:
          return ignored();
      }
    },
  };
}
