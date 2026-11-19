import type { NextRequest } from "next/server";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { requireHealthDevice } from "@/lib/personal/health-connect/native-http";
import { prisma } from "@/lib/prisma";
export async function POST(request: NextRequest) {
  try {
    const d = await requireHealthDevice(request);
    await prisma.healthConnectConnection.updateMany({
      where: { id: d.id, userId: d.userId, revokedAt: null },
      data: { revokedAt: new Date(), grantedTypes: [] },
    });
    return jsonPrivate({ ok: true, revoked: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
