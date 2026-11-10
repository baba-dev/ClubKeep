import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClub } from "@/lib/club-onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { createClubInput } from "@/lib/validations/onboarding";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const guard = await guardOnboardingPost(request, "create-club", 3, true);
    if (!guard.ok) return guard.response;
    const parsed = createClubInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success)
      return jsonPrivate({ error: "Enter a club name of 3–100 characters" }, 400);
    const club = await createClub(prisma, guard.userId!, parsed.data.name);
    return jsonPrivate({ club }, 201);
  } catch (error) {
    return onboardingFailure(error);
  }
}
