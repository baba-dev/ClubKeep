import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { previewClubInvite } from "@/lib/club-onboarding";
import { requireAuthConfig } from "@/lib/server-env";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { inviteTokenInput } from "@/lib/validations/onboarding";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const guard = await guardOnboardingPost(request, "preview-invite", 60, false);
    if (!guard.ok) return guard.response;
    const parsed = inviteTokenInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success) return jsonPrivate({ error: "Invitation is invalid or unavailable" }, 400);
    const club = await previewClubInvite(prisma, parsed.data.token, requireAuthConfig().secret);
    return jsonPrivate({ club });
  } catch (error) {
    return onboardingFailure(error);
  }
}
