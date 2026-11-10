import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { linkMemberAccount } from "@/lib/member-service";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { linkMemberInput } from "@/lib/validations/business";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(request:NextRequest,context:{params:Promise<{clubId:string;memberId:string}>}):Promise<Response>{
  try{
    const {clubId,memberId}=await context.params;
    if(!idInput.safeParse(clubId).success||!idInput.safeParse(memberId).success)return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"member-link",20,true);
    if(!guard.ok)return guard.response;
    const parsed=linkMemberInput.safeParse(await readOnboardingBody(request));
    if(!parsed.success)return jsonPrivate({error:"Invalid account selection"},400);
    const linked=await linkMemberAccount(prisma,guard.userId!,clubId,memberId,parsed.data.membershipId);
    return jsonPrivate({linked});
  }catch(error){return onboardingFailure(error);}
}
