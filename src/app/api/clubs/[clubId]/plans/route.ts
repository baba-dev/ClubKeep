import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPlan } from "@/lib/plan-service";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { planInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(request:NextRequest,context:{params:Promise<{clubId:string}>}):Promise<Response>{
  try{
    const {clubId}=await context.params;
    if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"plan-create",30,true);
    if(!guard.ok)return guard.response;
    const parsed=planInput.safeParse(await readOnboardingBody(request));
    if(!parsed.success)return jsonPrivate({error:"Invalid plan details"},400);
    const plan=await createPlan(prisma,guard.userId!,clubId,parsed.data);
    return jsonPrivate({plan},201);
  }catch(error){return onboardingFailure(error);}
}
