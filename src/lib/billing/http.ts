import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { BillingError } from "@/lib/billing/provider";

/** Billing messages are written for owners; everything else uses the shared safe mapper. */
export function billingFailure(error: unknown) {
  if (error instanceof BillingError) return jsonPrivate({ error: error.message }, error.status);
  return onboardingFailure(error);
}
