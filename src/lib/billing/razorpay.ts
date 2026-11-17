import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { RazorpayConfig } from "@/lib/billing/config";
import type { BillingEventKind } from "@/lib/billing/policy";
import {
  BillingError,
  type BillingEvent,
  type BillingProvider,
  type CheckoutRequest,
  type HeaderReader,
} from "@/lib/billing/provider";

const API = "https://api.razorpay.com/v1";
const API_TIMEOUT_MS = 10_000;
/** Monthly cycles requested for a subscription (10 years). Confirm the provider maximum in test mode. */
export const TOTAL_COUNT = 120;
const CHECKOUT_LINK_TTL_SECONDS = 24 * 3600;

// Event names verified against Razorpay's subscription webhook documentation.
const EVENT_KIND: Record<string, BillingEventKind> = {
  "subscription.activated": "ACTIVATED",
  "subscription.charged": "CHARGED",
  "subscription.pending": "PAYMENT_PENDING",
  "subscription.halted": "HALTED",
  "subscription.cancelled": "CANCELLED",
  "subscription.completed": "COMPLETED",
};

const planShape = z.object({
  period: z.string(),
  interval: z.number(),
  item: z.object({ amount: z.number(), currency: z.string() }),
});
const createdShape = z.object({
  id: z.string().regex(/^sub_[A-Za-z0-9]{8,40}$/),
  short_url: z.string().url(),
});
const webhookShape = z.object({
  event: z.string().max(80),
  created_at: z.number().int().positive(),
  payload: z
    .object({
      subscription: z
        .object({
          entity: z.object({
            id: z.string().regex(/^sub_[A-Za-z0-9]{8,40}$/),
            current_end: z.number().int().nullable().optional(),
            notes: z.union([z.record(z.string(), z.unknown()), z.array(z.unknown())]).nullish(),
          }),
        })
        .optional(),
    })
    .optional(),
});

export function sign(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(a) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a.toLowerCase(), "hex"), Buffer.from(b.toLowerCase(), "hex"));
}

export function createRazorpayProvider(
  config: RazorpayConfig,
  fetchImpl: typeof fetch = fetch
): BillingProvider {
  const authorization =
    "Basic " + Buffer.from(config.keyId + ":" + config.keySecret).toString("base64");

  async function call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await fetchImpl(API + path, {
        method,
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
    } catch {
      throw new BillingError(502, "The billing provider is unreachable. Try again shortly.");
    }
    if (!response.ok) {
      // Never surface provider error bodies: they can echo request details.
      throw new BillingError(502, "The billing provider rejected the request.");
    }
    return response.json();
  }

  return {
    id: "RAZORPAY",

    async createCheckout(request: CheckoutRequest) {
      if (request.currency !== "INR") throw new BillingError(400, "Razorpay bills in INR only");
      const planId = config.plans[request.tier];
      // Fail closed if the operator's dashboard plan does not match our price exactly.
      const plan = planShape.safeParse(await call("GET", "/plans/" + planId));
      if (
        !plan.success ||
        plan.data.period !== "monthly" ||
        plan.data.interval !== 1 ||
        plan.data.item.currency !== "INR" ||
        plan.data.item.amount !== request.chargeAmountMinor
      ) {
        throw new BillingError(500, "Billing is not configured correctly for this plan.");
      }
      const created = createdShape.safeParse(
        await call("POST", "/subscriptions", {
          plan_id: planId,
          total_count: TOTAL_COUNT,
          expire_by: Math.floor(request.now.getTime() / 1000) + CHECKOUT_LINK_TTL_SECONDS,
          notes: { clubId: request.clubId, tier: request.tier },
        })
      );
      if (!created.success) throw new BillingError(502, "Unexpected billing provider response.");
      return { providerSubscriptionId: created.data.id, checkoutUrl: created.data.short_url };
    },

    async cancelSubscription(providerSubscriptionId, atPeriodEnd) {
      if (!/^sub_[A-Za-z0-9]{8,40}$/.test(providerSubscriptionId)) {
        throw new BillingError(400, "Invalid subscription");
      }
      await call("POST", `/subscriptions/${providerSubscriptionId}/cancel`, {
        cancel_at_cycle_end: atPeriodEnd,
      });
    },

    verifyAndParseWebhook(rawBody: string, headers: HeaderReader): BillingEvent {
      const signature = headers.get("x-razorpay-signature") ?? "";
      // Authenticate the exact received bytes before parsing anything.
      if (!constantTimeEqualHex(signature, sign(rawBody, config.webhookSecret))) {
        throw new BillingError(401, "Invalid signature");
      }
      const eventId = headers.get("x-razorpay-event-id") ?? "";
      if (!/^[A-Za-z0-9_-]{6,80}$/.test(eventId)) throw new BillingError(400, "Missing event id");
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        throw new BillingError(400, "Malformed body");
      }
      const parsed = webhookShape.safeParse(json);
      if (!parsed.success) throw new BillingError(400, "Malformed event");
      const entity = parsed.data.payload?.subscription?.entity;
      const notes = entity?.notes;
      const noted =
        notes && !Array.isArray(notes) && typeof notes.clubId === "string" ? notes.clubId : null;
      return {
        provider: "RAZORPAY",
        providerEventId: eventId,
        eventType: parsed.data.event,
        kind: entity ? (EVENT_KIND[parsed.data.event] ?? "IGNORED") : "IGNORED",
        occurredAt: new Date(parsed.data.created_at * 1000),
        providerSubscriptionId: entity?.id ?? null,
        periodEnd: entity?.current_end ? new Date(entity.current_end * 1000) : null,
        notedClubId: noted && noted.length <= 64 ? noted : null,
      };
    },
  };
}
