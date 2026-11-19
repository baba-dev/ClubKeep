import type { NextRequest } from "next/server";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { requireHealthDevice } from "@/lib/personal/health-connect/native-http";
import { prisma } from "@/lib/prisma";
export async function GET(request: NextRequest) {
  try {
    const d = await requireHealthDevice(request);
    await prisma.healthConnectConnection.updateMany({
      where: { id: d.id, revokedAt: null },
      data: { lastSeenAt: new Date() },
    });
    return jsonPrivate({ ok: true, connectionId: d.id, label: d.label });
  } catch (error) {
    return onboardingFailure(error);
  }
}
