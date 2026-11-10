import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CalendarDays, Download, Filter, History, ScanLine, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { utcDate } from "@/lib/membership-dates";

export const metadata:Metadata={title:"Attendance history · ClubKeep",robots:{index:false}};
type Search={from?:string;to?:string;after?:string;memberId?:string;method?:string};
type Props={params:Promise<{clubId:string}>;searchParams:Promise<Search>};
export default function AttendanceHistoryPage(props:Props) {
  return <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Opening attendance history…</main>}><HistoryContent {...props}/></Suspense>;
}

async function HistoryContent({params,searchParams}:Props) {
  const {clubId}=await params;
  const query=await searchParams;
  const session=await requireSession();
  const access=await requireClubActive(prisma,session.user.id,clubId,["OWNER","MANAGER","STAFF"]);
  const club=await prisma.club.findFirstOrThrow({where:{id:clubId,status:"ACTIVE"},select:{name:true,timeZone:true}});
  const from=query.from||"";
  const to=query.to||"";
  try {
    if(from)utcDate(from);
    if(to)utcDate(to);
    if(from&&to&&from>to)notFound();
  }catch{notFound();}
  const method=query.method==="QR"||query.method==="MANUAL"?query.method:undefined;
  const memberId=query.memberId && /^[a-zA-Z0-9_-]{10,128}$/.test(query.memberId)?query.memberId:undefined;
  const cursor=query.after && /^[a-zA-Z0-9_-]{10,128}$/.test(query.after)?query.after:undefined;
  const where={
    clubId,
    ...(from||to?{localDate:{...(from?{gte:from}:{}),...(to?{lte:to}:{})}}:{}),
    ...(method?{method}:{}),
    ...(memberId?{memberRecordId:memberId}:{}),
  };
  if(cursor){
    const valid=await prisma.clubAttendance.findFirst({where:{id:cursor,clubId},select:{id:true}});
    if(!valid)notFound();
  }
  const entries=await prisma.clubAttendance.findMany({
    where,
    ...(cursor?{cursor:{id:cursor},skip:1}:{}),
    orderBy:[{checkedInAt:"desc"},{id:"desc"}],
    take:26,
    select:{
      id:true,localDate:true,checkedInAt:true,method:true,overrideReason:true,
      checkedInBy:{select:{name:true}},
      memberRecord:{select:{id:true,displayName:true,memberNumber:true}},
    },
  });
  const hasNext=entries.length>25;
  const page=entries.slice(0,25);
  const nextQuery=new URLSearchParams();
  if(from)nextQuery.set("from",from);
  if(to)nextQuery.set("to",to);
  if(method)nextQuery.set("method",method);
  if(memberId)nextQuery.set("memberId",memberId);
  if(hasNext&&page.length)nextQuery.set("after",page[page.length-1].id);
  const exportAllowed=access.role==="OWNER"||access.role==="MANAGER";
  const canExport=from&&to&&(utcDate(to).getTime()-utcDate(from).getTime()<31*86400000);
  return <BusinessShell clubId={clubId} clubName={club.name} active="attendance" eyebrow="Attendance records" title="Every visit has a story." description="A trustworthy, searchable history of your club’s visits, with the source and staff member recorded for each arrival.">
    <Link href={`/clubs/${clubId}/attendance`} className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm text-[#f3bd79] hover:underline"><ArrowLeft className="size-4"/>Back to check-in</Link>
    <form method="get" className="mt-6 grid gap-3 rounded-3xl border border-[#f6dc9b]/15 bg-[#1c130d] p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end sm:p-7">
      {memberId&&<input type="hidden" name="memberId" value={memberId}/>}
      <label className="text-xs font-semibold text-[#e9cba6]">From date
        <input name="from" type="date" defaultValue={from} className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0806] px-3 text-sm text-[#f6e6d5] focus:border-[#ffc787]"/>
      </label>
      <label className="text-xs font-semibold text-[#e9cba6]">To date
        <input name="to" type="date" defaultValue={to} className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0806] px-3 text-sm text-[#f6e6d5] focus:border-[#ffc787]"/>
      </label>
      <label className="text-xs font-semibold text-[#e9cba6]">Method
        <select name="method" defaultValue={method??""} className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0806] px-3 text-sm text-[#f6e6d5] focus:border-[#ffc787]">
          <option value="">All arrivals</option><option value="QR">QR scan</option><option value="MANUAL">Staff entry</option>
        </select>
      </label>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f3bd70] px-5 text-sm font-bold text-[#241408] hover:brightness-110"><Filter className="size-4"/>Apply</button>
    </form>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-xs text-[#bda58b]"><CalendarDays className="size-4"/>Times shown in {club.timeZone}. {page.length} entries on this page.</p>
      {exportAllowed&&<div className="text-right">{canExport?<Link href={`/api/clubs/${clubId}/attendance/export?from=${from}&to=${to}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f6dc9b]/25 px-4 text-sm font-semibold text-[#f4ca91] hover:bg-[#302016]"><Download className="size-4"/>Export CSV</Link>:<p className="text-xs text-[#b69a80]">Select up to 31 days to enable CSV export</p>}</div>}
    </div>
    <section className="mt-4 overflow-hidden rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b]">
      {page.length===0?<div className="p-12 text-center"><History className="mx-auto size-9 text-[#c9a06b]"/><h2 className="mt-4 text-xl font-semibold">No visits match these filters</h2><p className="mt-2 text-sm text-[#a9907a]">Try a different date or method.</p></div>:<div className="divide-y divide-[#f6dc9b]/10">
        {page.map(entry=><article key={entry.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 hover:bg-[#25180f] sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f26b00]/10 text-[#ffbf7a]">{entry.method==="QR"?<ScanLine className="size-5"/>:<History className="size-5"/>}</span>
            <div className="min-w-0">
              <Link href={`/clubs/${clubId}/members/${entry.memberRecord.id}`} className="block truncate font-semibold hover:text-[#ffbe79] hover:underline">{entry.memberRecord.displayName}</Link>
              <p className="mt-1 text-xs text-[#ad927d]">#{String(entry.memberRecord.memberNumber).padStart(4,"0")} · {entry.method==="QR"?"QR code":"Manual"} · Recorded by {entry.checkedInBy.name}</p>
            </div>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-sm font-semibold text-[#edc08c]">{entry.localDate}</p>
            <p className="mt-1 text-xs text-[#ad957e]">{new Intl.DateTimeFormat("en",{timeZone:club.timeZone,hour:"2-digit",minute:"2-digit"}).format(entry.checkedInAt)}</p>
            {entry.overrideReason&&<span className="mt-2 inline-flex rounded-full border border-amber-500/15 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200">Manager override</span>}
          </div>
        </article>)}
      </div>}
    </section>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="flex items-center gap-2 text-xs text-[#b99b82]"><ShieldCheck className="size-4"/>Attendance records are club-private and do not include Personal health data.</p>
      {hasNext&&<Link href={`? ${nextQuery.toString()}`.replace("? ","?")} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8a35e]/30 px-5 text-sm font-semibold text-[#ffcb91] hover:bg-[#2c1c13]">Older visits <ArrowRight className="size-4"/></Link>}
    </div>
  </BusinessShell>;
}
