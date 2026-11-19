import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { OnboardingError } from "@/lib/club-onboarding";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { requireHealthDevice } from "@/lib/personal/health-connect/native-http";
import { acceptHealthBatch } from "@/lib/personal/health-connect/ingestion";
import { readNativeBatch } from "@/lib/personal/health-connect/read-body";
import { healthBatchInput } from "@/lib/validations/health-connect-batch";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const device = await requireHealthDevice(request);
    const input = healthBatchInput.safeParse(await readNativeBatch(request));
    if (!input.success) throw new OnboardingError(400, "Invalid fitness sync batch.");
    return jsonPrivate({ ok: true, ...(await acceptHealthBatch(prisma, device, input.data)) });
  } catch (error) {
    return onboardingFailure(error);
  }
}
