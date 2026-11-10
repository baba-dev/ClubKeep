import { Suspense } from "react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { MemberCreateForm } from "@/components/clubs/member-create-form";

export const metadata: Metadata={title:"Register member · ClubKeep",robots:{index:false}};
export default function NewMemberPage({params}:{params:Promise<{clubId:string}>}){
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Preparing registration…</main>}><NewMemberContent params={params}/></Suspense>;
}
async function NewMemberContent({params}:{params:Promise<{clubId:string}>}){
  const {clubId}=await params;
  const session=await requireSession();
  await requireClubActive(prisma,session.user.id,clubId,["OWNER","MANAGER","STAFF"]);
  const club=await prisma.club.findUniqueOrThrow({where:{id:clubId},select:{name:true}});
  return <BusinessShell clubId={clubId} clubName={club.name} active="members" eyebrow="Member registry" title="Welcome someone new." description="A beautiful beginning for every membership, even before a person activates their ClubKeep account."><MemberCreateForm clubId={clubId}/></BusinessShell>;
}
