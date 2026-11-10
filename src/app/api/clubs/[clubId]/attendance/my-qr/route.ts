import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { issueMemberAttendanceQr } from "@/lib/attendance-card-service";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function GET(
  request: NextRequest, context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return jsonPrivate({ error: "Sign in to show your check-in card" }, 401);
    if (!session.user.emailVerified) return jsonPrivate({ error: "Verify your account first" }, 403);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) return jsonPrivate({ error: "Check-in is temporarily unavailable" }, 503);
    const card = await issueMemberAttendanceQr(prisma, session.user.id, clubId, secret);
    return jsonPrivate(card);
  } catch (error) {
    return onboardingFailure(error);
  }
}
