import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOnboardingPost, jsonPrivate, readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { checkoutInput } from "@/lib/validations/billing";
import { billingEnabled, requireRazorpayConfig } from "@/lib/billing/config";
import { billingFailure } from "@/lib/billing/http";
import { createRazorpayProvider } from "@/lib/billing/razorpay";
import { startCheckout } from "@/lib/billing/service";

/** Owner starts a subscription; the response is Razorpay's hosted checkout URL. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    if (!billingEnabled()) return jsonPrivate({ error: "Paid plans are not available yet" }, 503);
    const guard = await guardOnboardingPost(request, "b8-checkout", 6, true);
    if (!guard.ok) return guard.response;
    const parsed = checkoutInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success) return jsonPrivate({ error: "Choose a paid plan" }, 400);
    let config;
    try {
      config = requireRazorpayConfig();
    } catch {
      console.error("billing: razorpay configuration is incomplete");
      return jsonPrivate({ error: "Paid plans are not available yet" }, 503);
    }
    const result = await startCheckout(
      prisma,
      createRazorpayProvider(config),
      config.taxBasisPoints,
      guard.userId!,
      clubId,
      { tier: parsed.data.tier }
    );
    return jsonPrivate(result);
  } catch (error) {
    return billingFailure(error);
  }
}
