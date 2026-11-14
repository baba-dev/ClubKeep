import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewClubScore } from "@/lib/competition-scores";
import { decideScoreInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ clubId: string; scoreId: string }>;
}): Promise<Response> {
  try {
    const { clubId, scoreId } = await params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(scoreId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-score-review", 60, true);
    if (!auth.ok) return auth.response;
    const body = decideScoreInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Choose approve or reject" }, 400);
    return jsonPrivate({ review: await reviewClubScore(prisma, auth.userId!, clubId, scoreId, body.data.decision) });
  } catch (error) { return onboardingFailure(error); }
}
