import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { assignMembership } from "@/lib/subscription-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { assignPlanInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; memberId: string }> }
): Promise<Response> {
  try {
    const { clubId, memberId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(memberId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "member-assign", 40, true);
    if (!guard.ok) return guard.response;
    const parsed = assignPlanInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success) return jsonPrivate({ error: "Invalid plan or date" }, 400);
    const term = await assignMembership(
      prisma,
      guard.userId!,
      clubId,
      memberId,
      parsed.data,
      "ASSIGN"
    );
    return jsonPrivate({ term }, 201);
  } catch (error) {
    return onboardingFailure(error);
  }
}
