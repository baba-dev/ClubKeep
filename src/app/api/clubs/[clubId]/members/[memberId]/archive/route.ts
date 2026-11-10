import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { archiveMember } from "@/lib/member-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string; memberId: string }> }
): Promise<Response> {
  try {
    const { clubId, memberId } = await context.params;
    if (!idInput.safeParse(clubId).success || !idInput.safeParse(memberId).success)
      return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "member-archive", 20, true);
    if (!guard.ok) return guard.response;
    const body = await readOnboardingBody(request);
    if (!body || typeof body !== "object" || Object.keys(body).length !== 0)
      return jsonPrivate({ error: "Invalid request" }, 400);
    await archiveMember(prisma, guard.userId!, clubId, memberId);
    return jsonPrivate({ ok: true });
  } catch (error) {
    return onboardingFailure(error);
  }
}
