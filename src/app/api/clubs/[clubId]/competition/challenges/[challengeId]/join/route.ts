import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setMyChallengeParticipation } from "@/lib/competition-challenges";
import { challengeJoinInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ clubId: string; challengeId: string }>;
}): Promise<Response> {
  try {
    const { clubId, challengeId } = await params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(challengeId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-challenge-join", 24, true);
    if (!auth.ok) return auth.response;
    const body = challengeJoinInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Choose join or leave" }, 400);
    return jsonPrivate(await setMyChallengeParticipation(prisma, auth.userId!, clubId, challengeId, body.data.active));
  } catch (error) { return onboardingFailure(error); }
}
