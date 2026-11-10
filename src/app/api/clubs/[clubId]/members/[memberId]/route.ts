import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateMember } from "@/lib/member-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { memberEditInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; memberId: string }> }
): Promise<Response> {
  try {
    const { clubId, memberId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(memberId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "member-edit", 60, true);
    if (!guard.ok) return guard.response;
    const input = memberEditInput.safeParse(await readOnboardingBody(request));
    if (!input.success) return jsonPrivate({ error: "Invalid member details" }, 400);
    await updateMember(prisma, guard.userId!, clubId, memberId, input.data);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
