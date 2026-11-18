import { resolveAuthConfig } from "@/lib/auth-config";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { readTaxBasisPoints } from "@/lib/billing/config";
import { BillingError } from "@/lib/billing/provider";
import { getBillingProvider } from "@/lib/billing/providers";
import type { BillingContext } from "@/lib/billing/service";

/** Billing messages are written for owners; everything else uses the shared safe mapper. */
export function billingFailure(error: unknown) {
  if (error instanceof BillingError) return jsonPrivate({ error: error.message }, error.status);
  return onboardingFailure(error);
}

/** The club's billing page, always on ClubKeep's own configured origin. */
export function billingPageUrl(clubId: string): string {
  return resolveAuthConfig().origin + "/clubs/" + encodeURIComponent(clubId) + "/settings/billing";
}

/** Everything a billing request needs, built from the host's configuration. */
export function billingContext(clubId: string): BillingContext {
  return {
    providerFor: (id) => getBillingProvider(id),
    taxBasisPoints: readTaxBasisPoints(),
    returnUrl: billingPageUrl(clubId),
  };
}
