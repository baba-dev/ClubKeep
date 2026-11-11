import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { revokeClubMember } from "@/lib/club-onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; memberId: string }> }
): Promise<Response> {
  try {
    // The URL slot is shared with business member records. Revocation uses a club membership ID.
    const { clubId, memberId: membershipId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(membershipId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "revoke-member", 20, true);
    if (!guard.ok) return guard.response;
    const body = await readOnboardingBody(request);
    if (typeof body !== "object" || body === null || Object.keys(body).length !== 0)
      return jsonPrivate({ error: "Invalid request" }, 400);
    await revokeClubMember(prisma, guard.userId!, clubId, membershipId);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
