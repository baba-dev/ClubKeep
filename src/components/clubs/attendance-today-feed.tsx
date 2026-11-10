import Link from "next/link";
import { ArrowRight, Clock4, ShieldAlert, UserRoundCheck } from "lucide-react";

export type TodayEntry = {
  id: string; checkedInAt: string; method: "QR"|"MANUAL";
  member: { id:string; displayName:string; memberNumber:number };
  overrideReason: string | null;
};

export function AttendanceTodayFeed({clubId,entries,timeZone}:{clubId:string;entries:TodayEntry[];timeZone:string}) {
  return <section className="rounded-[1.8rem] border border-[#f6dc9b]/18 bg-[#17100b] p-5 sm:p-7">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e6b77b]">Today's activity</p><h2 className="mt-2 text-xl font-semibold">Recent arrivals</h2></div>
      <Link href={`/clubs/${clubId}/attendance/history`} className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#ffbd73] hover:underline">All attendance <ArrowRight className="size-4"/></Link>
    </div>
    {entries.length === 0 ? <div className="mt-7 rounded-2xl border border-dashed border-[#f6dc9b]/15 p-9 text-center">
      <UserRoundCheck className="mx-auto size-8 text-[#c69d68]"/><p className="mt-3 font-semibold">A fresh day, a fresh start.</p>
      <p className="mt-2 text-sm leading-6 text-[#af957c]">Your first check-in will appear here.</p>
    </div> : <ol className="mt-5 divide-y divide-[#f6dc9b]/10">
      {entries.map(entry=><li key={entry.id} className="flex items-center justify-between gap-3 py-4 first:pt-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f26b00]/12 text-base font-bold text-[#ffca88]">{entry.member.displayName.charAt(0).toUpperCase()}</span>
          <div className="min-w-0"><Link href={`/clubs/${clubId}/members/${entry.member.id}`} className="block truncate font-semibold hover:text-[#ffc685] hover:underline">{entry.member.displayName}</Link>
            <p className="mt-1 text-xs text-[#b69c86]">#{String(entry.member.memberNumber).padStart(4,"0")} · {entry.method==="QR"?"QR scan":"Manual entry"}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#f4ce9b]"><Clock4 className="size-3.5"/>{new Intl.DateTimeFormat("en",{timeZone,hour:"2-digit",minute:"2-digit"}).format(new Date(entry.checkedInAt))}</p>
          {entry.overrideReason && <p title={entry.overrideReason} className="mt-2 flex items-center justify-end gap-1 text-[11px] text-amber-200"><ShieldAlert className="size-3"/>Manager exception</p>}
        </div>
      </li>)}
    </ol>}
  </section>;
}
