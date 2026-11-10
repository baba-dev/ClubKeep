import Link from "next/link";
import { ArrowLeft, CalendarDays, LayoutDashboard, Layers3, UsersRound } from "lucide-react";

export function BusinessShell({
  clubId, clubName, active, eyebrow, title, description, children,
}: {
  clubId:string; clubName:string; active:"members"|"plans"|"renewals"|"overview";
  eyebrow:string; title:string; description:string; children:React.ReactNode;
}) {
  const sections = [
    {key:"overview", label:"Overview", url:`/clubs/${clubId}`, icon:LayoutDashboard},
    {key:"members", label:"Members", url:`/clubs/${clubId}/members`, icon:UsersRound},
    {key:"plans", label:"Membership Plans", url:`/clubs/${clubId}/plans`, icon:Layers3},
    {key:"renewals", label:"Renewals", url:`/clubs/${clubId}/renewals`, icon:CalendarDays},
  ] as const;
  return (
    <main className="min-h-screen bg-[#0b0705] px-4 pb-20 pt-7 text-[#fbf1e6] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f6dc9b]/15 pb-5">
          <Link href="/home" className="inline-flex items-center gap-3 text-lg font-semibold">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ffd07b] to-[#ef6b09] font-bold text-[#291607]">CK</span>
            <span>ClubKeep <span className="font-normal text-[#c4a586]">/ Business</span></span>
          </Link>
          <span className="max-w-48 truncate rounded-full border border-[#f6dc9b]/20 bg-[#22150d] px-3 py-2 text-xs text-[#f1d58b] sm:max-w-xs">{clubName}</span>
        </header>
        <nav aria-label="Club navigation" className="-mx-2 mt-5 flex max-w-full gap-2 overflow-x-auto px-2 pb-3">
          {sections.map(({key,label,url,icon:Icon})=>(
            <Link key={key} href={url} aria-current={active===key?"page":undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-colors ${active===key?"border-[#e8a348]/60 bg-[#f26b00]/15 font-semibold text-[#ffd18b]":"border-[#f6dc9b]/10 bg-[#18100b] text-[#c7ac95] hover:border-[#f6dc9b]/30 hover:text-white"}`}>
              <Icon className="size-4" aria-hidden="true"/>{label}
            </Link>
          ))}
        </nav>
        <div className="mt-6">
          <Link href={`/clubs/${clubId}`} className="inline-flex items-center gap-2 text-xs text-[#bfa58b] hover:text-[#ffbd79]">
            <ArrowLeft className="size-4" aria-hidden="true"/> Club overview
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[.22em] text-[#f1d58b]">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#b8a08c] sm:text-base">{description}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
