import { requireRazorpayConfig, requireStripeConfig, type EnvSource } from "@/lib/billing/config";
import type { ProviderId } from "@/lib/billing/policy";
import { BillingError, type BillingProvider } from "@/lib/billing/provider";
import { createRazorpayProvider } from "@/lib/billing/razorpay";
import { createStripeProvider } from "@/lib/billing/stripe";
import { createStripeClient } from "@/lib/billing/stripe-client";

/**
 * Build a provider from the host's configuration. Incomplete configuration is a
 * 503 for owners ("not available yet"); the missing key names go to the log only.
 */
export function getBillingProvider(
  id: ProviderId,
  source: EnvSource = process.env
): BillingProvider {
  try {
    if (id === "RAZORPAY") return createRazorpayProvider(requireRazorpayConfig(source));
    const config = requireStripeConfig(source);
    return createStripeProvider(config, createStripeClient(config));
  } catch (error) {
    console.error(
      "billing: " + id.toLowerCase() + " configuration is unavailable:",
      error instanceof Error ? error.message : "unknown"
    );
    throw new BillingError(503, "Paid plans are not available yet");
  }
}
