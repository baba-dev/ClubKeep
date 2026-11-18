import Stripe from "stripe";
import type { StripeConfig } from "@/lib/billing/config";
import type { StripeClient } from "@/lib/billing/stripe";

/** The only place the real SDK is constructed. Short timeout, one automatic retry. */
export function createStripeClient(config: StripeConfig): StripeClient {
  return new Stripe(config.secretKey, {
    maxNetworkRetries: 1,
    timeout: 10_000,
    appInfo: { name: "ClubKeep billing" },
  });
}
