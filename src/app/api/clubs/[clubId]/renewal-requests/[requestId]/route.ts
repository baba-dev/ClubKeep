import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { decideRenewalRequest } from "@/lib/renewal-request-service";
import { renewalDecisionInput } from "@/lib/validations/member-renewal";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ clubId: string; requestId: string }> }): Promise<Response> {
  try {
    const { clubId, requestId } = await params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(requestId).success) return jsonPrivate({ error: "Request not found" }, 404);
    const guard = await guardOnboardingPost(request, "b5-renewal-decision", 40, true);
    if (!guard.ok) return guard.response;
    const body = renewalDecisionInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Choose a valid decision" }, 400);
    const result = await decideRenewalRequest(prisma, guard.userId!, clubId, requestId, body.data.decision);
    return jsonPrivate({ request: result });
  } catch (error) {
    return onboardingFailure(error);
  }
}
