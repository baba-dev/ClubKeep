import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { issueClubInvite } from "@/lib/club-onboarding";
import { invitationUrl } from "@/lib/invite-token";
import { requireAuthConfig } from "@/lib/server-env";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const guard = await guardOnboardingPost(request, "issue-invite", 20, true);
    if (!guard.ok) return guard.response;
    const body = await readOnboardingBody(request);
    if (typeof body !== "object" || body === null || Object.keys(body).length !== 0)
      return jsonPrivate({ error: "Invalid invitation request" }, 400);
    const issued = await issueClubInvite(prisma, guard.userId!, clubId, requireAuthConfig().secret);
    return jsonPrivate(
      {
        id: issued.id,
        url: invitationUrl(guard.origin, issued.token),
        expiresAt: issued.expiresAt,
      },
      201
    );
  } catch (error) {
    return onboardingFailure(error);
  }
}
