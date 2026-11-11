import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { reverseClubPayment } from "@/lib/finance-service";
import { reverseClubPaymentInput } from "@/lib/validations/finance";
import { idInput } from "@/lib/validations/onboarding";
import { guardOnboardingPost,jsonPrivate,onboardingFailure,readOnboardingBody } from "@/lib/onboarding-http";

export async function POST(request:NextRequest,{params}:{
  params:Promise<{clubId:string;paymentId:string}>
}):Promise<Response>{
  try{
    const {clubId,paymentId}=await params;
    if(!idInput.safeParse(clubId).success||!idInput.safeParse(paymentId).success)
      return jsonPrivate({error:"Payment not found"},404);
    const guard=await guardOnboardingPost(request,"b4-reverse-payment",12,true);
    if(!guard.ok)return guard.response;
    const input=reverseClubPaymentInput.safeParse(await readOnboardingBody(request));
    if(!input.success)return jsonPrivate({error:"Reason must contain 8–240 characters"},400);
    const reversal=await reverseClubPayment(prisma,guard.userId!,clubId,paymentId,input.data.reason);
    return jsonPrivate({reversal},reversal.repeated?200:201);
  }catch(error){return onboardingFailure(error);}
}
