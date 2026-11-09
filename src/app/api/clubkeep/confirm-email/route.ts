import { NextRequest, NextResponse } from "next/server";
import { auth, authLimiter } from "@/lib/auth";
import { resolveAuthConfig } from "@/lib/auth-config";
import { validateConfirmPayload } from "@/lib/confirm-email-security";

const NO_STORE = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };

export async function POST(request: NextRequest): Promise<Response> {
  const config = resolveAuthConfig();
  if (!config.features.emailLink || !authLimiter) {
    return NextResponse.json({ error: "Unavailable" }, { status: 404, headers: NO_STORE });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length > 4096) {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400, headers: NO_STORE });
  }
  const token = validateConfirmPayload(request.headers, body, config.origin);
  if (!token) {
    return NextResponse.json({ error: "Invalid confirmation" }, { status: 400, headers: NO_STORE });
  }
  // The edge overwrites this configured header. Missing values share a
  // conservative limited bucket rather than trusting client X-Forwarded-For.
  const ip = config.trustedIpHeader
    ? (request.headers.get(config.trustedIpHeader) ?? "unknown")
    : "unknown";
  const [ipLimit, tokenLimit] = await Promise.all([
    authLimiter.consume("magic-confirm-ip", ip, 300, 20),
    authLimiter.consume("magic-confirm-token", token, 300, 3),
  ]);
  if (!ipLimit.allowed || !tokenLimit.allowed) {
    return NextResponse.json({ error: "Try again later" }, { status: 429, headers: NO_STORE });
  }
  try {
    // Calling the Better Auth server API directly avoids an HTTP URL query,
    // while asResponse forwards the authenticated Set-Cookie headers.
    const response = await auth.api.magicLinkVerify({
      query: { token },
      headers: request.headers,
      asResponse: true,
    });
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    // Deliberately don't distinguish expired, already used, or bad tokens.
    return NextResponse.json(
      { error: "Invalid or expired confirmation" },
      { status: 400, headers: NO_STORE }
    );
  }
}
