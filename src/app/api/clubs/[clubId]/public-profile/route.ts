import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readOwnerProfile,saveOwnerProfile,publicDraftInput } from "@/lib/public-directory";
import { guardOnboardingPost,jsonPrivate,onboardingFailure,readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
type Context={params:Promise<{clubId:string}>};
export async function GET(request:NextRequest,{params}:Context){
  try{
    const {clubId}=await params;
    if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Not found"},404);
    const session=await auth.api.getSession({headers:request.headers});
    if(!session?.user?.emailVerified)return jsonPrivate({error:"Sign in to continue"},401);
    return jsonPrivate(await readOwnerProfile(prisma,session.user.id,clubId));
  }catch(error){return onboardingFailure(error);}
}
export async function PATCH(request:NextRequest,{params}:Context){
  try{
    const {clubId}=await params;
    if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Not found"},404);
    const guard=await guardOnboardingPost(request,"b3-profile-edit",50,true);
    if(!guard.ok)return guard.response;
    const data=publicDraftInput.safeParse(await readOnboardingBody(request));
    if(!data.success)return jsonPrivate({error:"Check your public profile"},400);
    await saveOwnerProfile(prisma,guard.userId!,clubId,data.data);
    return jsonPrivate({ok:true});
  }catch(error){return onboardingFailure(error);}
}
