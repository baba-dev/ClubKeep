import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reviewProfile } from "@/lib/public-directory";
import { guardOnboardingPost,jsonPrivate,onboardingFailure,readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
export async function POST(request:NextRequest,{params}:{params:Promise<{revisionId:string;decision:string}>}){
  try{
    const {revisionId,decision}=await params;
    if(!idInput.safeParse(revisionId).success||!["approve","reject"].includes(decision))return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"b3-profile-review",20,true);if(!guard.ok)return guard.response;
    const body=await readOnboardingBody(request);
    if(!body||typeof body!=="object"||Object.keys(body).length!==0)return jsonPrivate({error:"Invalid request"},400);
    return jsonPrivate(await reviewProfile(prisma,guard.userId!,revisionId,decision==="approve"));
  }catch(error){return onboardingFailure(error);}
}
