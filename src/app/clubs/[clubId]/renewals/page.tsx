import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, Clock4, UsersRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { statusForTerm } from "@/lib/membership-dates";
import { BusinessShell } from "@/components/clubs/business-shell";

export const metadata:Metadata={title:"Membership renewals · ClubKeep",robots:{index:false}};
type Props={params:Promise<{clubId:string}>};
export default function RenewalsPage({params}:Props){
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Finding renewals…</main>}><RenewalsContent params={params}/></Suspense>;
}
async function RenewalsContent({params}:Props){
  const {clubId}=await params,session=await requireSession();
  await requireClubActive(prisma,session.user.id,clubId,["OWNER","MANAGER","STAFF"]);
  const [club,records]=await Promise.all([
    prisma.club.findUniqueOrThrow({where:{id:clubId},select:{name:true}}),
    prisma.clubMemberRecord.findMany({where:{clubId,status:"ACTIVE"},select:{id:true,displayName:true,memberNumber:true,subscriptions:{where:{cancelledAt:null},orderBy:{endAt:"desc"},take:1,select:{planName:true,startAt:true,endAt:true}}},take:300,orderBy:{displayName:"asc"}}),
  ]);
  const expiring=records.map(member=>({...member,term:member.subscriptions[0]??null,status:statusForTerm(member.subscriptions[0]??null)})).filter(member=>["EXPIRING","EXPIRED","NONE"].includes(member.status));
  const countExpiring=expiring.filter(member=>member.status==="EXPIRING").length;
  const expired=expiring.filter(member=>member.status!=="EXPIRING").length;
  return <BusinessShell clubId={clubId} clubName={club.name} active="renewals" eyebrow="Keep your community close" title="Every renewal matters." description="See who is approaching expiry, follow up with care and renew membership terms in a few taps. No payment is processed here.">
    <div className="mt-8 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#f6dc9b]/20 bg-[#21160e] p-6"><CalendarClock className="size-6 text-amber-300"/><p className="mt-4 text-3xl font-semibold">{countExpiring}</p><p className="mt-2 text-sm text-[#b8a08c]">Expiring within seven days</p></div>
      <div className="rounded-2xl border border-[#f6dc9b]/20 bg-[#21160e] p-6"><Clock4 className="size-6 text-orange-300"/><p className="mt-4 text-3xl font-semibold">{expired}</p><p className="mt-2 text-sm text-[#b8a08c]">Expired or unassigned</p></div>
      <div className="rounded-2xl border border-[#f6dc9b]/20 bg-[#21160e] p-6"><UsersRound className="size-6 text-[#f2c486]"/><p className="mt-4 text-3xl font-semibold">{records.length}</p><p className="mt-2 text-sm text-[#b8a08c]">Members checked (max 300)</p></div>
    </div>
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-5 sm:p-7"><h2 className="text-xl font-semibold">Needs attention</h2><p className="mt-2 text-sm text-[#b8a08c]">Sorted by earliest expiry. Open a member profile to renew safely.</p>
      {expiring.length===0?<div className="mt-6 rounded-2xl border border-dashed border-[#f6dc9b]/20 p-9 text-center"><CalendarClock className="mx-auto size-9 text-[#e1b26b]"/><p className="mt-4 font-semibold">All caught up</p><p className="mt-2 text-sm text-[#b8a08c]">No renewals need attention in the current roster.</p></div>:
      <div className="mt-6 space-y-3">{expiring.sort((a,b)=>(a.term?.endAt.getTime()??0)-(b.term?.endAt.getTime()??0)).map(member=><Link key={member.id} href={`/clubs/${clubId}/members/${member.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f6dc9b]/10 bg-[#251911] px-5 py-4 hover:border-[#f3b869]/50">
        <div><p className="font-semibold">{member.displayName}</p><p className="mt-1 text-xs text-[#a9907a]">#{String(member.memberNumber).padStart(4,"0")} · {member.term?.planName??"No plan"}</p></div>
        <div className="flex items-center gap-3"><p className="text-right text-xs text-[#f2c18b]">{member.status==="EXPIRING"?"Expiring soon":member.status==="NONE"?"Not assigned":"Expired"}<span className="mt-1 block text-[#ae9984]">{member.term?.endAt.toISOString().slice(0,10)??"—"}</span></p><ArrowRight className="size-4 text-[#ffc27d]"/></div>
      </Link>)}</div>}
      {records.length===300&&<p className="mt-4 text-xs text-[#ad927d]">The first 300 members are checked. Extend this view with cursor pagination before larger clubs onboard.</p>}
    </section>
  </BusinessShell>;
}
