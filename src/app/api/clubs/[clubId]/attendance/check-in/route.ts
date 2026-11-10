import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordAttendance } from "@/lib/attendance-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { checkInInput } from "@/lib/validations/attendance";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const guard = await guardOnboardingPost(request, "attendance-checkin", 3000, true);
    if (!guard.ok) return guard.response;
    const input = checkInInput.safeParse(await readOnboardingBody(request));
    if (!input.success) return jsonPrivate({ error: "Invalid check-in request" }, 400);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) return jsonPrivate({ error: "Check-in is temporarily unavailable" }, 503);
    const entry = await recordAttendance(prisma, guard.userId!, clubId, input.data, secret);
    return jsonPrivate({ ...entry }, 201);
  } catch (error) {
    return onboardingFailure(error);
  }
}
