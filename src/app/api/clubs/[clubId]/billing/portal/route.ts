import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOnboardingPost, jsonPrivate } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { billingEnabled } from "@/lib/billing/config";
import { billingContext, billingFailure } from "@/lib/billing/http";
import { createPortalLink } from "@/lib/billing/service";

/** Owner opens the provider's hosted page to update the payment method (Stripe). */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    if (!billingEnabled()) return jsonPrivate({ error: "Paid plans are not available yet" }, 503);
    const guard = await guardOnboardingPost(request, "b8-portal", 10, true);
    if (!guard.ok) return guard.response;
    const ctx = billingContext(clubId);
    const result = await createPortalLink(
      prisma,
      ctx.providerFor,
      guard.userId!,
      clubId,
      ctx.returnUrl
    );
    return jsonPrivate(result);
  } catch (error) {
    return billingFailure(error);
  }
}
