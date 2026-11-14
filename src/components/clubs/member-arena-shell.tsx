import Link from "next/link";
import { Activity, ArrowLeft, CalendarDays, CreditCard, IdCard, ScanLine, Zap } from "lucide-react";

type Tab = "arena" | "card" | "visits" | "fees" | "renewal";
const items = [
  { key: "arena", label: "Arena", href: "", Icon: Zap },
  { key: "card", label: "My ID", href: "/card", Icon: IdCard },
  { key: "visits", label: "Sessions", href: "/attendance", Icon: Activity },
  { key: "fees", label: "Payments", href: "/payments", Icon: CreditCard },
  { key: "renewal", label: "Renewal", href: "/renewal", Icon: CalendarDays },
] as const;

export function MemberArenaShell({
  clubId,
  clubName,
  active,
  eyebrow,
  title,
  summary,
  children,
}: {
  clubId: string;
  clubName: string;
  active: Tab;
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  const base = "/clubs/" + encodeURIComponent(clubId) + "/my";
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b0b0e] pb-28 text-[#fff5e8] lg:pb-14">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[.18]" style={{ backgroundImage: "linear-gradient(#e4ac6315 1px,transparent 1px),linear-gradient(90deg,#e4ac6315 1px,transparent 1px)", backgroundSize: "52px 52px" }} />
      <div aria-hidden="true" className="pointer-events-none absolute -top-48 right-[-220px] size-[600px] rounded-full bg-[#ea6809]/10 blur-[100px]" />
      <header className="relative z-10 border-b border-white/10 bg-[#101015]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/home" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-[#f3d3b0] hover:text-white">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#ffd98c] to-[#e66b16] text-lg font-black italic text-[#171114]">CK</span>
            <span className="hidden sm:inline">ClubKeep</span>
            <span className="ml-1 hidden text-[#806e5e] sm:inline">/</span>
            <span className="max-w-44 truncate text-white">{clubName}</span>
          </Link>
          <Link href="/home" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-xs font-semibold text-[#ead1b6] transition hover:border-[#f4b55f]/60">
            <ArrowLeft className="size-4" /> Switch club
          </Link>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[.22em] text-[#ffb766] uppercase">
            <Zap className="size-4" /> {eyebrow}
          </p>
          <h1 className="mt-4 text-4xl leading-[1.06] font-black tracking-[-.055em] sm:text-6xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#bfb2a6] sm:text-base">{summary}</p>
        </div>
        <nav aria-label="Member arena sections" className="mt-9 hidden flex-wrap items-center gap-2 border-b border-white/10 pb-5 sm:flex">
          {items.map(({ key, label, href, Icon }) => (
            <Link key={key} href={base + href} aria-current={active === key ? "page" : undefined}
              className={"inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[#ffbe79] " + (active === key ? "bg-gradient-to-r from-[#f4c875] to-[#ef7126] text-[#26120b]" : "border border-white/10 text-[#c5b7a7] hover:bg-white/10")}>
              <Icon className="size-4" aria-hidden="true" />{label}
            </Link>
          ))}
        </nav>
        <div className="mt-7">{children}</div>
      </main>
      <nav aria-label="Mobile member navigation" className="fixed inset-x-2 bottom-2 z-40 grid grid-cols-5 gap-1 rounded-2xl border border-[#ffc783]/20 bg-[#161317]/95 p-2 shadow-2xl backdrop-blur-xl sm:hidden">
        {items.map(({ key, label, href, Icon }) => (
          <Link key={key} href={base + href} aria-current={active === key ? "page" : undefined}
            className={"flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold focus-visible:outline-2 focus-visible:outline-[#ffbe79] " + (active === key ? "bg-[#e98134] text-[#1a1010]" : "text-[#ceb9a8]")}>
            <Icon className="size-5" aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
