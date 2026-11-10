import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerMember } from "@/lib/member-service";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { memberInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(request: NextRequest, context: { params: Promise<{clubId:string}> }): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({error:"Club not found"},404);
    const guard = await guardOnboardingPost(request,"member-register",50,true);
    if (!guard.ok) return guard.response;
    const parsed = memberInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success) return jsonPrivate({error:"Please check member name and international phone format"},400);
    const member = await registerMember(prisma,guard.userId!,clubId,parsed.data);
    return jsonPrivate({member},201);
  } catch(error) {return onboardingFailure(error);}
}
