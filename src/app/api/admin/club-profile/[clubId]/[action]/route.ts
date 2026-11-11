import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { moderateProfileVisibility } from "@/lib/public-directory";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string; action: string }> }
) {
  try {
    const { clubId, action } = await params;
    if (!idInput.safeParse(clubId).success || !["suspend", "reinstate"].includes(action))
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "b3-profile-moderation", 20, true);
    if (!guard.ok) return guard.response;
    const body = await readOnboardingBody(request);
    if (!body || typeof body !== "object" || Object.keys(body).length !== 0)
      return jsonPrivate({ error: "Invalid request" }, 400);
    return jsonPrivate(
      await moderateProfileVisibility(
        prisma,
        guard.userId!,
        clubId,
        action as "suspend" | "reinstate"
      )
    );
  } catch (error) {
    return onboardingFailure(error);
  }
}
