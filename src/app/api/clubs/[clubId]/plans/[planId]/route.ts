import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePlan } from "@/lib/plan-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { planInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; planId: string }> }
): Promise<Response> {
  try {
    const { clubId, planId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(planId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "plan-edit", 30, true);
    if (!guard.ok) return guard.response;
    const parsed = planInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success) return jsonPrivate({ error: "Invalid plan details" }, 400);
    await updatePlan(prisma, guard.userId!, clubId, planId, parsed.data);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
