import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hideOwnerProfile } from "@/lib/public-directory";
import { guardOnboardingPost,jsonPrivate,onboardingFailure,readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
export async function POST(request:NextRequest,{params}:{params:Promise<{clubId:string}>}){
  try{
    const {clubId}=await params;if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"b3-profile-hide",10,true);if(!guard.ok)return guard.response;
    const body=await readOnboardingBody(request);if(!body||typeof body!=="object"||Object.keys(body).length!==0)return jsonPrivate({error:"Invalid request"},400);
    await hideOwnerProfile(prisma,guard.userId!,clubId);return jsonPrivate({ok:true});
  }catch(error){return onboardingFailure(error);}
}
