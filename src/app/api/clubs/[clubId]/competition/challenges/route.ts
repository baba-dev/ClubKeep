import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClubChallenge } from "@/lib/competition-challenges";
import { createChallengeInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ clubId: string }> }): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-create-challenge", 20, true);
    if (!auth.ok) return auth.response;
    const body = createChallengeInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Check your challenge title, goal and season" }, 400);
    return jsonPrivate({ challenge: await createClubChallenge(prisma, auth.userId!, clubId, body.data) }, 201);
  } catch (error) { return onboardingFailure(error); }
}
