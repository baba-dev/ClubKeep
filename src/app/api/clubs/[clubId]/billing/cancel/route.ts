import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOnboardingPost, jsonPrivate } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { billingEnabled, requireRazorpayConfig } from "@/lib/billing/config";
import { billingFailure } from "@/lib/billing/http";
import { createRazorpayProvider } from "@/lib/billing/razorpay";
import { requestCancel } from "@/lib/billing/service";

/** Owner cancels: an active plan runs to the end of the paid period. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    if (!billingEnabled()) return jsonPrivate({ error: "Paid plans are not available yet" }, 503);
    const guard = await guardOnboardingPost(request, "b8-cancel", 6, true);
    if (!guard.ok) return guard.response;
    let config;
    try {
      config = requireRazorpayConfig();
    } catch {
      console.error("billing: razorpay configuration is incomplete");
      return jsonPrivate({ error: "Paid plans are not available yet" }, 503);
    }
    await requestCancel(prisma, createRazorpayProvider(config), guard.userId!, clubId);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return billingFailure(error);
  }
}
