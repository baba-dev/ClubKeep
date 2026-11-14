import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { setMyRankingConsent } from "@/lib/competition-service";
import { rankingConsentInput } from "@/lib/validations/competition";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ clubId: string }> }): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const auth = await guardOnboardingPost(request, "b6-consent", 16, true);
    if (!auth.ok) return auth.response;
    const body = rankingConsentInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Choose opt in or opt out" }, 400);
    return jsonPrivate(await setMyRankingConsent(prisma, auth.userId!, clubId, body.data.enabled));
  } catch (error) { return onboardingFailure(error); }
}
