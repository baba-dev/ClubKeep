import type { NextRequest } from "next/server";
import { handleBillingWebhook } from "@/lib/billing/webhook-route";

/** Razorpay webhook: signature-only authentication, see handleBillingWebhook. */
export async function POST(request: NextRequest): Promise<Response> {
  return handleBillingWebhook(request, "RAZORPAY");
}
