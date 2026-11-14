import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRenewalRequest } from "@/lib/renewal-request-service";
import { newRenewalRequestInput } from "@/lib/validations/member-renewal";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ clubId: string }> }): Promise<Response> {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const guard = await guardOnboardingPost(request, "b5-member-renewal-request", 10, true);
    if (!guard.ok) return guard.response;
    const body = newRenewalRequestInput.safeParse(await readOnboardingBody(request));
    if (!body.success) return jsonPrivate({ error: "Check your message and try again" }, 400);
    const result = await createRenewalRequest(prisma, guard.userId!, clubId, body.data.operationKey, body.data.message);
    return jsonPrivate({ request: result }, result.repeated ? 200 : 201);
  } catch (error) {
    return onboardingFailure(error);
  }
}
