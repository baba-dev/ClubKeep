import type { NextRequest } from "next/server";
import { authLimiter } from "@/lib/auth";
import { resolveAuthConfig } from "@/lib/auth-config";
import { OnboardingError } from "@/lib/club-onboarding";
import { jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { prisma } from "@/lib/prisma";
import { hashCapability } from "./connections";
import { assertHealthConnectEnabled } from "./flags";
import { assertWellnessAdult } from "@/lib/personal/wellness-policy";

export function rejectBrowserOrigin(request: NextRequest): void {
  if (request.headers.has("origin") || request.headers.has("sec-fetch-site"))
    throw new OnboardingError(403, "Native companion only.");
}
export async function limitNativeRequest(request: NextRequest, scope: string, max: number) {
  if (!authLimiter) throw new OnboardingError(503, "Security service unavailable.");
  const config = resolveAuthConfig();
  const ip = config.trustedIpHeader
    ? (request.headers.get(config.trustedIpHeader) ?? "unknown") : "unknown";
  const result = await authLimiter.consume("hc-native:" + scope, ip, 3600, max);
  if (result.unavailable) throw new OnboardingError(503, "Security service unavailable.");
  if (!result.allowed) throw new OnboardingError(429, "Too many requests.");
}
export async function requireHealthDevice(request: NextRequest) {
  assertHealthConnectEnabled();
  rejectBrowserOrigin(request);
  const value = request.headers.get("authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(value))
    throw new OnboardingError(401, "Pair the Android device again.");
  const device = await prisma.healthConnectConnection.findUnique({
    where: { tokenHash: hashCapability(value.slice(7)) },
    select: { id: true, userId: true, revokedAt: true, tokenExpiresAt: true, label: true },
  });
  if (!device || device.revokedAt || device.tokenExpiresAt <= new Date())
    throw new OnboardingError(401, "Connection expired or revoked.");
  await assertWellnessAdult(prisma, device.userId);
  await limitNativeRequest(request, "device-" + device.id, 600);
  return device;
}
export async function nativePost(
  request: NextRequest,
  handler: (device: Awaited<ReturnType<typeof requireHealthDevice>>, body: unknown) => Promise<unknown>
): Promise<Response> {
  try {
    const device = await requireHealthDevice(request);
    const body = await readOnboardingBody(request);
    const result = await handler(device, body);
    return jsonPrivate({ ok: true, ...((result && typeof result === "object") ? result : {}) });
  } catch (error) { return onboardingFailure(error); }
}
