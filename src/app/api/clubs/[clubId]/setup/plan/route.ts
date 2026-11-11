import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPlan } from "@/lib/plan-service";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { planInput } from "@/lib/validations/business";
export async function POST(request:NextRequest,{params}:{params:Promise<{clubId:string}>}){
  try{
    const {clubId}=await params;
    if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"b3-first-plan",15,true);
    if(!guard.ok)return guard.response;
    const input=planInput.safeParse(await readOnboardingBody(request));
    if(!input.success)return jsonPrivate({error:"Check membership plan fields"},400);
    const plan=await createPlan(prisma,guard.userId!,clubId,input.data,true);
    return jsonPrivate({plan},201);
  }catch(error){return onboardingFailure(error);}
}
