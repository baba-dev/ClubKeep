import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadSetup, saveSetup, setupStepInput } from "@/lib/club-setup";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

type Context = { params: Promise<{ clubId: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.emailVerified) return jsonPrivate({ error: "Sign in to continue" }, 401);
    return jsonPrivate(await loadSetup(prisma, session.user.id, clubId));
  } catch (error) {
    return onboardingFailure(error);
  }
}
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const { clubId } = await params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Not found" }, 404);
    const guard = await guardOnboardingPost(request, "b3-setup", 60, true);
    if (!guard.ok) return guard.response;
    const input = setupStepInput.safeParse(await readOnboardingBody(request));
    if (!input.success) return jsonPrivate({ error: "Check the setup fields" }, 400);
    const progress = await saveSetup(prisma, guard.userId!, clubId, input.data);
    return jsonPrivate({ ok: true, version: progress.version });
  } catch (error) {
    return onboardingFailure(error);
  }
}
