import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createCompetitionSeason } from "@/lib/competition-service";
import { createSeasonInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ clubId: string }> }): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-season", 12, true);
    if (!auth.ok) return auth.response;
    const body = createSeasonInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Choose a valid start month and activity metrics" }, 400);
    const result = await createCompetitionSeason(prisma, auth.userId!, clubId, body.data);
    return jsonPrivate({ season: result }, 201);
  } catch (error) { return onboardingFailure(error); }
}
