import type { NextRequest } from "next/server";
import { handleBillingWebhook } from "@/lib/billing/webhook-route";

/** Stripe webhook: signature-only authentication, see handleBillingWebhook. */
export async function POST(request: NextRequest): Promise<Response> {
  return handleBillingWebhook(request, "STRIPE");
}
