import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { authLimiter } from "@/lib/auth";
import { OnboardingError } from "@/lib/club-onboarding";
import { jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { assertHealthConnectEnabled } from "@/lib/personal/health-connect/flags";
import { rejectBrowserOrigin, limitNativeRequest } from "@/lib/personal/health-connect/native-http";
import { claimHealthPairing, hashCapability } from "@/lib/personal/health-connect/connections";
import { healthPairClaimInput } from "@/lib/validations/health-connect";
export async function POST(request: NextRequest) {
  try {
    assertHealthConnectEnabled();
    rejectBrowserOrigin(request);
    await limitNativeRequest(request, "claim-ip", 30);
    const result = healthPairClaimInput.safeParse(await readOnboardingBody(request));
    if (!result.success) throw new OnboardingError(400, "Invalid pairing request.");
    if (!authLimiter) throw new OnboardingError(503, "Security service unavailable.");
    const decision = await authLimiter.consume(
      "hc-pair-hash",
      hashCapability(result.data.pairCode),
      600,
      5
    );
    if (decision.unavailable) throw new OnboardingError(503, "Security service unavailable.");
    if (!decision.allowed) throw new OnboardingError(429, "Too many attempts.");
    return jsonPrivate({ ok: true, ...(await claimHealthPairing(prisma, result.data)) });
  } catch (error) {
    return onboardingFailure(error);
  }
}
