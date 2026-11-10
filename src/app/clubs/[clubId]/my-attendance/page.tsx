import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck2, Clock4, ScanLine, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { MemberAttendancePass } from "@/components/clubs/member-attendance-pass";

export const metadata: Metadata={title:"My member pass · ClubKeep",robots:{index:false}};
export default function MyAttendancePage({params}:{params:Promise<{clubId:string}>}) {
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Preparing your pass…</main>}><MyAttendanceContent params={params}/></Suspense>;
}
async function MyAttendanceContent({params}:{params:Promise<{clubId:string}>}){
  const {clubId}=await params;
  const session=await requireSession();
  const access=await requireClubActive(prisma,session.user.id,clubId,["MEMBER"]);
  const club=await prisma.club.findFirst({where:{id:clubId,status:"ACTIVE"},select:{name:true,timeZone:true}});
  if(!club)notFound();
  const member=await prisma.clubMemberRecord.findFirst({
    where:{clubId,membershipId:access.membershipId,status:"ACTIVE"},
    select:{id:true,memberNumber:true,displayName:true},
  });
  const visits=member?await prisma.clubAttendance.findMany({
    where:{clubId,memberRecordId:member.id},orderBy:[{checkedInAt:"desc"},{id:"desc"}],take:15,
    select:{id:true,localDate:true,method:true,checkedInAt:true},
  }):[];
  return <main className="min-h-screen bg-[#0b0705] px-4 py-8 text-[#fbf1e6] sm:px-7">
    <div className="mx-auto max-w-3xl">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f6dc9b]/15 pb-5">
        <Link href={`/clubs/${clubId}`} className="inline-flex min-h-10 items-center gap-2 text-sm text-[#f4bd80] hover:underline"><ArrowLeft className="size-4"/>Back to {club.name}</Link>
        <span className="rounded-full border border-[#e0ae69]/20 px-3 py-2 text-xs text-[#f5cd95]">ClubKeep / Member</span>
      </header>
      <p className="mt-9 text-xs font-semibold uppercase tracking-[.22em] text-[#d4ac72]">My check-in card</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Your gym. Your moment.</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-[#bba189]">One quick scan at reception and you're in. Only your own club attendance is shown here.</p>
      {member?<MemberAttendancePass clubId={clubId}/>:<div className="mt-8 rounded-3xl border border-[#f6dc9b]/20 bg-[#23170f] p-8">
        <ShieldCheck className="size-7 text-[#f4be75]"/><h2 className="mt-5 text-xl font-semibold">Your account isn&apos;t linked to a member record yet</h2>
        <p className="mt-3 text-sm leading-7 text-[#c8ac93]">Ask reception to link your verified ClubKeep account with your gym registration. You can still check in manually meanwhile.</p>
      </div>}
      <section className="mt-9 rounded-3xl border border-[#f6dc9b]/15 bg-[#19110c] p-6 sm:p-8">
        <div className="flex items-center gap-3"><CalendarCheck2 className="size-6 text-[#f2bd78]"/><div><h2 className="text-xl font-semibold">Your recent visits</h2><p className="mt-1 text-xs text-[#ac947e]">Only arrivals in this club</p></div></div>
        {visits.length===0?<p className="mt-6 rounded-xl border border-dashed border-[#f6dc9b]/15 p-7 text-center text-sm text-[#b39a84]">Your attendance appears here after your first check-in.</p>:
          <ul className="mt-6 divide-y divide-[#f6dc9b]/10">{visits.map(visit=><li key={visit.id} className="flex items-center justify-between gap-3 py-4">
            <span className="flex items-center gap-2 text-sm font-semibold text-[#f1ddc5]"><ScanLine className="size-4 text-[#e2ad67]"/>{visit.localDate}</span>
            <span className="flex items-center gap-2 text-xs text-[#bba189]"><Clock4 className="size-3.5"/>{new Intl.DateTimeFormat("en",{timeZone:club.timeZone,hour:"2-digit",minute:"2-digit"}).format(visit.checkedInAt)} · {visit.method==="QR"?"QR":"Staff"}</span>
          </li>)}</ul>}
      </section>
      <p className="mt-6 flex items-start gap-2 text-xs leading-6 text-[#a98d76]"><ShieldCheck className="mt-1 size-4 shrink-0 text-[#f4c083]"/>This pass is authenticated and changes automatically. Club staff cannot access your private Personal health records through it.</p>
    </div>
  </main>;
}
