import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock,ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { clubDuesPage } from "@/lib/finance-service";
import { formatMinorMoney } from "@/lib/money-format";
import { BusinessShell } from "@/components/clubs/business-shell";
import { idInput } from "@/lib/validations/onboarding";
export const metadata:Metadata={title:"Outstanding membership dues · ClubKeep",robots:{index:false}};
type Props={params:Promise<{clubId:string}>;searchParams:Promise<{cursor?:string}>};
export default function Dues(props:Props){
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-9 text-white">Loading dues…</main>}><DuesContent {...props}/></Suspense>;
}
async function DuesContent({params,searchParams}:Props){
  const {clubId}=await params,{cursor}=await searchParams,session=await requireSession();
  await requireClubActive(prisma,session.user.id,clubId,["OWNER","MANAGER"]);
  const club=await prisma.club.findUniqueOrThrow({where:{id:clubId},select:{name:true}});
  const safeCursor=cursor&&idInput.safeParse(cursor).success?cursor:undefined;
  const records=await clubDuesPage(prisma,clubId,safeCursor),page=records.slice(0,50);
  return <BusinessShell clubId={clubId} clubName={club.name} active="finance" eyebrow="Follow up with care"
    title="Outstanding membership dues." description="Expected fees minus nonvoided recorded collections, one membership term at a time. Cancelled terms are excluded.">
    <div className="mt-7 overflow-hidden rounded-3xl border border-[#f5c88d]/15 bg-[#1d140e]">
      {page.length===0?<div className="p-10 text-center"><CalendarClock className="mx-auto size-9 text-[#f3be7e]"/><p className="mt-4 font-semibold">No outstanding dues on this page</p><p className="mt-2 text-sm text-[#bfa58e]">You are all caught up, or there are no memberships assigned.</p></div>:
        <div className="divide-y divide-[#f6dc9b]/10">{page.map(r=><Link key={r.id} href={"/clubs/"+clubId+"/members/"+r.memberRecordId} className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-[#2b1c11]">
          <div><p className="font-semibold">{r.memberName} <span className="text-xs text-[#a98e7a]">#{r.memberNumber}</span></p><p className="mt-2 text-xs text-[#bda48b]">{r.planName} · Expires {r.endAt.toISOString().slice(0,10)}</p></div>
          <div className="flex items-center gap-3"><span className="text-right"><span className="block font-semibold text-[#f6c58c]">{formatMinorMoney(r.dueMinor,r.currency)}</span><span className="block text-xs text-[#ac957f]">Remaining</span></span><ArrowRight className="size-4 text-[#bd9974]"/></div>
        </Link>)}</div>}
    </div>
    {records.length>50&&page.at(-1)&&<Link className="mt-5 inline-flex rounded-xl border border-[#f6dc9b]/20 px-5 py-3 text-sm text-[#f7c48c]" href={"/clubs/"+clubId+"/finance/dues?cursor="+encodeURIComponent(page.at(-1)!.id)}>Next page <ArrowRight className="ml-2 size-4"/></Link>}
    <p className="mt-6 text-xs text-[#a9917b]">Open a member to record an externally received payment. Financial figures are not bank-verified.</p>
  </BusinessShell>;
}
