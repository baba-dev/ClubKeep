import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelMembershipTerm } from "@/lib/subscription-service";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(request:NextRequest,context:{params:Promise<{clubId:string;memberId:string;subscriptionId:string}>}):Promise<Response>{
  try{
    const {clubId,memberId,subscriptionId}=await context.params;
    if(![clubId,memberId,subscriptionId].every(id=>idInput.safeParse(id).success))return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"member-cancel",20,true);
    if(!guard.ok)return guard.response;
    const body=await readOnboardingBody(request);
    if(!body||typeof body!=="object"||Object.keys(body).length!==0)return jsonPrivate({error:"Invalid request"},400);
    await cancelMembershipTerm(prisma,guard.userId!,clubId,memberId,subscriptionId);
    return jsonPrivate({ok:true});
  }catch(error){return onboardingFailure(error);}
}
