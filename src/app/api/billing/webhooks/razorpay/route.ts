import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { billingEnabled, requireRazorpayConfig } from "@/lib/billing/config";
import { BillingError } from "@/lib/billing/provider";
import { createRazorpayProvider } from "@/lib/billing/razorpay";
import { applyWebhookEvent } from "@/lib/billing/service";

const MAX_BODY_BYTES = 256 * 1024;
const HEADERS = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: HEADERS });
}

/** Read the exact request bytes (needed for the signature) with a hard size cap. */
async function readRawBody(request: NextRequest): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    return text + decoder.decode();
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

/**
 * Razorpay webhook. Authenticated solely by the HMAC signature over the raw body:
 * no session, no cookies. Never logs payloads, emails or secrets.
 * Non-2xx makes Razorpay retry, so a disabled or misconfigured server answers 503.
 */
export async function POST(request: NextRequest): Promise<Response> {
  await connection();
  if (!billingEnabled()) return reply(503, { error: "Billing is not enabled" });
  let provider;
  try {
    provider = createRazorpayProvider(requireRazorpayConfig());
  } catch {
    console.error("billing: razorpay configuration is incomplete");
    return reply(503, { error: "Billing is not configured" });
  }
  const raw = await readRawBody(request);
  if (raw === null) return reply(400, { error: "Invalid body" });
  try {
    const event = provider.verifyAndParseWebhook(raw, request.headers);
    const outcome = await applyWebhookEvent(prisma, event);
    return reply(200, { ok: true, outcome });
  } catch (error) {
    if (error instanceof BillingError) return reply(error.status, { error: error.message });
    // Unknown failure: a 5xx asks the provider to retry; nothing was committed.
    console.error("billing: webhook processing failed");
    return reply(500, { error: "Processing failed" });
  }
}
