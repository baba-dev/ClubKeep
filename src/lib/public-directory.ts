import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubRole, AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";

const httpsUrl=z.union([z.literal(""),z.url().max(512).refine(value=>value.startsWith("https://"))]);
export const publicDraftInput=z.object({
  tagline:z.string().trim().max(140).default(""),
  description:z.string().trim().max(1800).default(""),
  city:z.string().trim().max(100).default(""),
  website:httpsUrl.default(""),
  contactEmail:z.union([z.literal(""),z.email().max(254)]).default(""),
  listed:z.boolean().default(true),
}).strict();
export type PublicDraft=z.infer<typeof publicDraftInput>;
export function validatedPublic(value:unknown):PublicDraft|null{
  const result=publicDraftInput.safeParse(value);
  return result.success?result.data:null;
}
async function owner(db:PrismaClient,actorId:string,clubId:string){
  await requireClubRole(db,actorId,clubId,["OWNER"]);
  const club=await db.club.findFirst({where:{id:clubId,status:"ACTIVE",setupStatus:{in:["READY","LEGACY_ACTIVE"]}},select:{id:true}});
  if(!club)throw new AccessDeniedError();
}
export async function readOwnerProfile(db:PrismaClient,actorId:string,clubId:string){
  await owner(db,actorId,clubId);
  const [club,profile]=await Promise.all([
    db.club.findUniqueOrThrow({where:{id:clubId},select:{id:true,name:true,vertical:true,slug:true}}),
    db.clubPublicProfile.findUnique({where:{clubId},select:{draft:true,status:true,publishedAt:true}}),
  ]);
  return {club,profile:{draft:validatedPublic(profile?.draft)||publicDraftInput.parse({}),status:profile?.status||"HIDDEN",publishedAt:profile?.publishedAt||null}};
}
export async function saveOwnerProfile(db:PrismaClient,actorId:string,clubId:string,data:PublicDraft){
  await owner(db,actorId,clubId);
  await db.clubPublicProfile.upsert({
    where:{clubId},create:{clubId,draft:data},update:{draft:data}
  });
}
export async function submitProfile(db:PrismaClient,actorId:string,clubId:string){
  await owner(db,actorId,clubId);
  return db.$transaction(async tx=>{
    const profile=await tx.clubPublicProfile.update({where:{clubId},data:{updatedAt:new Date()}});
    if(!profile||profile.status==="SUSPENDED")throw new OnboardingError(409,"Profile unavailable for publication");
    const data=validatedPublic(profile.draft);
    if(!data?.tagline||!data.description||!data.city)throw new OnboardingError(409,"Add a tagline, description and city before submitting");
    const already=await tx.clubPublicRevision.findFirst({where:{clubId,status:"PENDING"},select:{id:true}});
    if(already)throw new OnboardingError(409,"A profile revision is already awaiting review");
    const revision=await tx.clubPublicRevision.create({data:{clubId,content:data},select:{id:true}});
    if(!profile.published)await tx.clubPublicProfile.update({where:{clubId},data:{status:"PENDING"}});
    return {revisionId:revision.id};
  });
}
export async function hideOwnerProfile(db:PrismaClient,actorId:string,clubId:string){
  await owner(db,actorId,clubId);
  await db.$transaction(async tx=>{
    await tx.clubPublicProfile.updateMany({where:{clubId,status:{not:"SUSPENDED"}},data:{status:"HIDDEN"}});
    await tx.clubPublicRevision.updateMany({where:{clubId,status:"PENDING"},data:{status:"REJECTED",reviewedAt:new Date()}});
  });
}
export async function platformAdmin(db:PrismaClient,actorId:string){
  const admin=await db.user.findUnique({where:{id:actorId},select:{platformRole:true}});
  if(admin?.platformRole!=="PLATFORM_ADMIN")throw new AccessDeniedError();
}
export async function reviewProfile(db:PrismaClient,actorId:string,revisionId:string,approve:boolean){
  await platformAdmin(db,actorId);
  return db.$transaction(async tx=>{
    const revision=await tx.clubPublicRevision.findUnique({where:{id:revisionId},include:{club:{select:{id:true,status:true,setupStatus:true}}}});
    if(!revision||revision.status!=="PENDING")throw new OnboardingError(409,"Revision already reviewed");
    if(revision.club.status!=="ACTIVE"||revision.club.setupStatus==="IN_PROGRESS")throw new OnboardingError(409,"Club unavailable");
    const changed=await tx.clubPublicRevision.updateMany({where:{id:revisionId,status:"PENDING"},data:{status:approve?"APPROVED":"REJECTED",reviewerId:actorId,reviewedAt:new Date()}});
    if(changed.count!==1)throw new OnboardingError(409,"Revision already reviewed");
    const data=validatedPublic(revision.content);
    if(approve){
      if(!data)throw new OnboardingError(409,"Invalid profile content");
      await tx.clubPublicProfile.update({where:{clubId:revision.clubId},data:{published:data,city:data.city,status:data.listed?"LISTED":"UNLISTED",publishedAt:new Date()}});
    }else{
      const profile=await tx.clubPublicProfile.findUnique({where:{clubId:revision.clubId},select:{published:true}});
      if(!profile?.published)await tx.clubPublicProfile.update({where:{clubId:revision.clubId},data:{status:"HIDDEN"}});
    }
    return {ok:true};
  });
}
