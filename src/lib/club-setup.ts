import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubRole, AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";

export const VERTICALS = ["GYM", "YOGA", "DANCE", "SPORTS", "OTHER"] as const;
const detailsInput = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  operatingMode: z.enum(["PHYSICAL", "HYBRID", "ONLINE"]),
  timeZone: z.string().min(3).max(80),
  city: z.string().trim().max(100).optional().default(""),
  address: z.string().trim().max(240).optional().default(""),
  contactEmail: z.union([z.email().max(254), z.literal("")]).optional().default(""),
}).strict();
const identityInput = z.object({ logoUrl: z.union([z.url().max(512).refine(v => v.startsWith("https://"), "HTTPS required"), z.literal("")]).optional().default("") }).strict();
export const setupStepInput = z.discriminatedUnion("step", [
  z.object({step:z.literal("type"),vertical:z.enum(VERTICALS)}).strict(),
  z.object({step:z.literal("details"),data:detailsInput}).strict(),
  z.object({step:z.literal("identity"),data:identityInput}).strict(),
]);
export type SetupStepInput = z.infer<typeof setupStepInput>;

function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat("en", {timeZone:zone}); return true; } catch { return false; }
}
async function requireOwner(db: PrismaClient, actorId:string, clubId:string) {
  await requireClubRole(db, actorId, clubId, ["OWNER"]);
  const club = await db.club.findFirst({where:{id:clubId,status:"ACTIVE"},select:{id:true,setupStatus:true}});
  if(!club) throw new AccessDeniedError();
  return club;
}
export async function loadSetup(db: PrismaClient, actorId:string,clubId:string) {
  const club=await requireOwner(db,actorId,clubId);
  const [record,plans]=await Promise.all([
    db.club.findUniqueOrThrow({where:{id:clubId},select:{name:true,vertical:true,timeZone:true,setupStatus:true,setupProgress:true}}),
    db.clubPlan.findMany({where:{clubId,archivedAt:null},select:{id:true,name:true,currency:true},take:20})
  ]);
  return {club:{id:clubId,...record},plans,alreadyReady:club.setupStatus!=="IN_PROGRESS"};
}
export async function saveSetup(db:PrismaClient,actorId:string,clubId:string,input:SetupStepInput){
  await requireOwner(db,actorId,clubId);
  return db.$transaction(async tx=>{
    const club=await tx.club.findUniqueOrThrow({where:{id:clubId},select:{setupStatus:true}});
    if(club.setupStatus!=="IN_PROGRESS") throw new OnboardingError(409,"Club setup is already completed");
    if(input.step==="type") {
      await tx.club.update({where:{id:clubId},data:{vertical:input.vertical}});
    } else if(input.step==="details") {
      if(!validZone(input.data.timeZone)) throw new OnboardingError(400,"Choose a valid IANA timezone");
      await tx.club.update({where:{id:clubId},data:{timeZone:input.data.timeZone}});
    }
    const data=input.step==="details"?{
      countryCode:input.data.countryCode,currencyCode:input.data.currencyCode,
      operatingMode:input.data.operatingMode,city:input.data.city||null,
      address:input.data.address||null,contactEmail:input.data.contactEmail||null
    }:input.step==="identity"?{logoUrl:input.data.logoUrl||null}:{};
    const currentStep=input.step==="type"?1:input.step==="details"?2:3;
    return tx.clubSetupProgress.upsert({
      where:{clubId},create:{clubId,currentStep,...data},
      update:{...data,currentStep,version:{increment:1}}
    });
  });
}
export async function completeSetup(db:PrismaClient,actorId:string,clubId:string){
  await requireOwner(db,actorId,clubId);
  return db.$transaction(async tx=>{
    // Update acquires a PostgreSQL row lock, serializing simultaneous completion.
    await tx.club.update({where:{id:clubId},data:{updatedAt:new Date()}});
    const club=await tx.club.findUniqueOrThrow({
      where:{id:clubId},select:{status:true,setupStatus:true,vertical:true,timeZone:true,setupProgress:true}
    });
    if(club.status!=="ACTIVE") throw new AccessDeniedError();
    if(club.setupStatus==="READY") return {ready:true};
    if(club.setupStatus==="LEGACY_ACTIVE") throw new OnboardingError(409,"Existing club is already operational");
    const progress=club.setupProgress;
    if(!progress?.countryCode||!progress.currencyCode||!progress.operatingMode||!validZone(club.timeZone))
      throw new OnboardingError(409,"Complete club details before launching");
    const plan=await tx.clubPlan.findFirst({where:{clubId,archivedAt:null,currency:progress.currencyCode},select:{id:true}});
    if(!plan) throw new OnboardingError(409,"Create at least one membership plan in your chosen currency");
    await tx.club.update({where:{id:clubId},data:{setupStatus:"READY",setupCompletedAt:new Date()}});
    return {ready:true};
  });
}
export async function requireSetupPlanPermission(db:PrismaClient,actorId:string,clubId:string,currency:string){
  const club=await requireOwner(db,actorId,clubId);
  if(club.setupStatus!=="IN_PROGRESS") throw new OnboardingError(409,"Use the membership plan studio");
  const p=await db.clubSetupProgress.findUnique({where:{clubId}});
  if(!p?.currencyCode||currency!==p.currencyCode)throw new OnboardingError(409,"Choose club currency first; plan currency must match");
}
