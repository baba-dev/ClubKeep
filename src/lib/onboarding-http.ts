import { NextRequest, NextResponse } from "next/server";
import { auth, authLimiter } from "@/lib/auth";
import { resolveAuthConfig } from "@/lib/auth-config";
import { AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { MemberLimitError } from "@/lib/business-entitlements";

export const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export function jsonPrivate(value: unknown, status = 200): NextResponse {
  return NextResponse.json(value, { status, headers: PRIVATE_HEADERS });
}
export function onboardingFailure(error: unknown): NextResponse {
  if (error instanceof OnboardingError) {
    return jsonPrivate({ error: error.message }, error.status);
  }
  if (error instanceof MemberLimitError) {
    return jsonPrivate({ error: error.message }, error.status);
  }
  if (error instanceof AccessDeniedError) {
    return jsonPrivate({ error: "Access denied" }, 403);
  }
  // Never return token hashes, database errors, SMTP or identity details.
  return jsonPrivate({ error: "This operation could not be completed" }, 500);
}

export async function readOnboardingBody(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new OnboardingError(415, "Expected JSON");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new OnboardingError(400, "Request body required");
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let body = "";
  try {
    for (;;) {
      const result = await reader.read();
      if (result.done) break;
      size += result.value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        throw new OnboardingError(413, "Request too large");
      }
      body += decoder.decode(result.value, { stream: true });
    }
    body += decoder.decode();
    return JSON.parse(body) as unknown;
  } catch (error) {
    if (error instanceof OnboardingError) throw error;
    throw new OnboardingError(400, "Invalid JSON");
  } finally {
    reader.releaseLock();
  }
}

type GuardResult =
  { ok: true; userId: string | null; origin: string } | { ok: false; response: NextResponse };

/**
 * Double-submit CSRF defenses: exact same-origin POST and Fetch Metadata,
 * verified session where needed, isolated Redis rate limits fail closed.
 */
export async function guardOnboardingPost(
  request: NextRequest,
  scope: string,
  max: number,
  requireUser: boolean
): Promise<GuardResult> {
  const config = resolveAuthConfig();
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (origin !== config.origin || (fetchSite && fetchSite !== "same-origin")) {
    return { ok: false, response: jsonPrivate({ error: "Forbidden" }, 403) };
  }
  if (!authLimiter || !config.rateLimitRedisUrl) {
    // Protected mutations never fail open. Password-only installs can use
    // dedicated ClubKeep REDIS_URL without enabling Google/email/passkeys.
    return {
      ok: false,
      response: jsonPrivate({ error: "Club setup is temporarily unavailable. Contact the administrator to check the ClubKeep security service." }, 503),
    };
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (requireUser && !session?.user) {
    return { ok: false, response: jsonPrivate({ error: "Sign in first" }, 401) };
  }
  if (requireUser && !session?.user.emailVerified) {
    return { ok: false, response: jsonPrivate({ error: "Verify your account to continue" }, 403) };
  }
  const ip = config.trustedIpHeader
    ? (request.headers.get(config.trustedIpHeader) ?? "unknown")
    : "unknown";
  const ipLimit = await authLimiter.consume("club-onboarding-ip:" + scope, ip, 3600, max * 5);
  const userLimit =
    requireUser && session?.user
      ? await authLimiter.consume("club-onboarding-user:" + scope, session.user.id, 3600, max)
      : { allowed: true };
  if (ipLimit.unavailable || userLimit.unavailable) {
    return { ok: false, response: jsonPrivate({ error: "Club setup security service is unavailable. Please try again after it is restored." }, 503) };
  }
  if (!ipLimit.allowed || !userLimit.allowed) {
    return { ok: false, response: jsonPrivate({ error: "Too many requests" }, 429) };
  }
  return { ok: true, userId: session?.user.id ?? null, origin: config.origin };
}
