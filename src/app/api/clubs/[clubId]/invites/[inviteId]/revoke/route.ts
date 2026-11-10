import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { revokeClubInvite } from "@/lib/club-onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; inviteId: string }> }
): Promise<Response> {
  try {
    const { clubId, inviteId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(inviteId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "revoke-invite", 25, true);
    if (!guard.ok) return guard.response;
    const body = await readOnboardingBody(request);
    if (typeof body !== "object" || body === null || Object.keys(body).length !== 0)
      return jsonPrivate({ error: "Invalid request" }, 400);
    await revokeClubInvite(prisma, guard.userId!, clubId, inviteId);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
