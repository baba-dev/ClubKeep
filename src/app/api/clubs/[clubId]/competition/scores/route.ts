import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitClubScore } from "@/lib/competition-scores";
import { submitScoreInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-score-submit", 28, true);
    if (!auth.ok) return auth.response;
    const body = submitScoreInput.safeParse(await readOnboardingBody(request));
    if (!body.success)
      return jsonPrivate({ error: "Check metric, verified score and submission ID" }, 400);
    const score = await submitClubScore(prisma, auth.userId!, clubId, body.data);
    return jsonPrivate({ score }, score.repeated ? 200 : 201);
  } catch (error) {
    return onboardingFailure(error);
  }
}
