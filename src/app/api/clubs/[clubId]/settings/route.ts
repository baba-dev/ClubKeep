import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClubRole, AccessDeniedError } from "@/lib/club-access";
import { guardOnboardingPost, jsonPrivate, onboardingFailure, readOnboardingBody } from "@/lib/onboarding-http";
import { idInput } from "@/lib/validations/onboarding";
import { VERTICALS } from "@/lib/club-setup";

const input=z.object({
  vertical:z.enum(VERTICALS),
  countryCode:z.string().regex(/^[A-Z]{2}$/),
  city:z.string().trim().max(100)
}).strict();
export async function PATCH(request:NextRequest,{params}:{params:Promise<{clubId:string}>}){
  try{
    const {clubId}=await params;
    if(!idInput.safeParse(clubId).success)return jsonPrivate({error:"Club not found"},404);
    const guard=await guardOnboardingPost(request,"b3-settings",20,true);
    if(!guard.ok)return guard.response;
    const parsed=input.safeParse(await readOnboardingBody(request));
    if(!parsed.success)return jsonPrivate({error:"Check club type, country and city"},400);
    await prisma.$transaction(async tx=>{
      await requireClubRole(tx,guard.userId!,clubId,["OWNER"]);
      const club=await tx.club.findFirst({where:{id:clubId,status:"ACTIVE",setupStatus:{in:["READY","LEGACY_ACTIVE"]}},select:{id:true}});
      if(!club)throw new AccessDeniedError();
      await tx.club.update({where:{id:clubId},data:{vertical:parsed.data.vertical}});
      await tx.clubSetupProgress.upsert({
        where:{clubId},
        create:{clubId,countryCode:parsed.data.countryCode,city:parsed.data.city||null},
        update:{countryCode:parsed.data.countryCode,city:parsed.data.city||null,version:{increment:1}}
      });
    });
    return jsonPrivate({ok:true});
  }catch(error){return onboardingFailure(error);}
}
