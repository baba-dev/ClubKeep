import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubRole } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
export const metadata:Metadata={title:"Club settings · ClubKeep",robots:{index:false}};
export default async function ClubSettings({params}:{params:Promise<{clubId:string}>}){
  const {clubId}=await params;const session=await requireSession();
  try{await requireClubRole(prisma,session.user.id,clubId,["OWNER"]);}catch{notFound();}
  const club=await prisma.club.findFirst({where:{id:clubId,status:"ACTIVE",setupStatus:{in:["READY","LEGACY_ACTIVE"]}},select:{id:true,name:true,slug:true,vertical:true,timeZone:true,setupProgress:true}});
  if(!club)notFound();
  return <BusinessShell clubId={clubId} clubName={club.name} active="overview" eyebrow="Club settings" title="Everything in its place." description="Review your club identity and take control of what appears publicly.">
    <div className="mt-8 grid gap-4 md:grid-cols-2">
      <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#1c130d] p-7"><h2 className="text-xl font-semibold">Club identity</h2>
        <dl className="mt-6 space-y-4 text-sm"><div><dt className="text-[#ba9e86]">Name</dt><dd className="mt-1 font-semibold">{club.name}</dd></div>
        <div><dt className="text-[#ba9e86]">Club type</dt><dd className="mt-1 capitalize">{club.vertical.toLowerCase()}</dd></div>
        <div><dt className="text-[#ba9e86]">Timezone</dt><dd className="mt-1">{club.timeZone}</dd></div>
        <div><dt className="text-[#ba9e86]">Country / Currency</dt><dd className="mt-1">{club.setupProgress?.countryCode??"Not configured"} / {club.setupProgress?.currencyCode??"Not configured"}</dd></div></dl>
      </section>
      <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#1c130d] p-7"><h2 className="text-xl font-semibold">Public presence</h2><p className="mt-3 text-sm leading-7 text-[#bca28b]">Your listing is private unless you submit it and the platform approves it.</p>
        <Link href={"/clubs/"+clubId+"/settings/public-profile"} className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-gradient-to-r from-[#efc279] to-[#ee781e] px-5 font-semibold text-[#291507]">Manage public profile</Link>
      </section>
    </div>
    <p className="mt-5 text-xs text-[#a58c77]">Membership pricing, existing attendance timezone data and historical subscriptions are never silently rewritten by a club identity change.</p>
  </BusinessShell>;
}
