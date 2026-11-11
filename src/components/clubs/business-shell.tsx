import Link from "next/link";
import {
  House,
  ScanLine,
  UsersRound,
  Layers3,
  CalendarClock,
  Settings2,
  Globe2,
  ArrowLeft,
  Building2,
  Menu,
  Fingerprint,
  WalletCards,
} from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { requireActiveClubMembership } from "@/lib/club-access";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";

type Active = "members" | "plans" | "renewals" | "overview" | "attendance" | "finance";
export async function BusinessShell({
  clubId,
  clubName,
  active,
  eyebrow,
  title,
  description,
  children,
}: {
  clubId: string;
  clubName: string;
  active: Active;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const context = await requireActiveClubMembership(prisma, session.user.id, clubId);
  const isOwner = context.role === "OWNER";
  const nav = [
    { key: "overview", label: "Overview", href: "", icon: House },
    { key: "attendance", label: "Check-in", href: "/attendance", icon: ScanLine },
    { key: "members", label: "Members", href: "/members", icon: UsersRound },
    { key: "plans", label: "Membership Plans", href: "/plans", icon: Layers3 },
    { key: "renewals", label: "Renewals", href: "/renewals", icon: CalendarClock },
    ...(context.role==="OWNER"||context.role==="MANAGER" ? [{key:"finance",label:"Finance & dues",href:"/finance",icon:WalletCards}] : []),
    ...(isOwner
      ? [
          {
            key: "profile",
            label: "Public Profile",
            href: "/settings/public-profile",
            icon: Globe2,
          },
          { key: "settings", label: "Club Settings", href: "/settings", icon: Settings2 },
        ]
      : []),
  ];
  const base = "/clubs/" + encodeURIComponent(clubId);
  return (
    <div className="min-h-screen bg-[#0b0705] text-[#fbf1e6]">
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-[#f6dc9b]/15 bg-[#110d09] px-4 py-7 lg:flex">
          <Link href="/home" className="flex items-center gap-3 px-3 text-xl font-bold">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#f6ce7e] to-[#f26b00] text-[#2a1608]">
              CK
            </span>
            ClubKeep
          </Link>
          <div className="mt-9 rounded-2xl border border-[#f6dc9b]/15 bg-[#24170e] p-4">
            <p className="text-[10px] font-semibold tracking-widest text-[#e5b46c] uppercase">
              Current club
            </p>
            <p className="mt-2 truncate font-semibold">{clubName}</p>
            <p className="mt-1 text-xs text-[#b79d85] capitalize">{context.role.toLowerCase()}</p>
            <Link
              href="/home"
              className="mt-3 block text-xs text-[#f0b96e] underline underline-offset-4"
            >
              Switch club
            </Link>
          </div>
          <nav
            aria-label="Club navigation"
            className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto"
          >
            {nav.map(({ key, label, href, icon: Icon }) => (
              <Link
                key={key}
                href={base + href}
                aria-current={active === key ? "page" : undefined}
                className={
                  "flex min-h-11 items-center gap-3 rounded-xl px-4 text-sm transition " +
                  (active === key
                    ? "bg-[#42230f] font-semibold text-[#ffcd87]"
                    : "text-[#c4ab93] hover:bg-[#261a11] hover:text-white")
                }
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>
          <Link
            href="/account/security"
            className="flex items-center gap-2 rounded-lg px-4 py-3 text-xs text-[#bc9c7f] hover:text-white"
          >
            <Fingerprint className="size-4" /> Account security
          </Link>
        </aside>
        <div className="min-w-0 flex-1 pb-24 lg:pb-8">
          <header className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-3 border-b border-[#f6dc9b]/12 bg-[#0b0705]/95 px-5 backdrop-blur-xl sm:px-9">
            <div className="min-w-0">
              <Link
                href="/home"
                className="flex items-center gap-2 text-xs text-[#d9aa79] lg:hidden"
              >
                <Building2 className="size-4" /> Your clubs
              </Link>
              <p className="truncate text-sm font-semibold">{clubName}</p>
            </div>
            <div className="flex items-center gap-2">
              <ClubThemeToggle />
              <Link
                href="/home"
                aria-label="Switch club"
                className="rounded-xl border border-[#f6dc9b]/20 p-3 text-[#f3c28a]"
              >
                <Menu className="size-4" />
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 pt-7 sm:px-9">
            <Link
              href={base}
              className="inline-flex items-center gap-2 text-xs text-[#aa927e] hover:text-[#ffd29e]"
            >
              <ArrowLeft className="size-3.5" /> Club overview
            </Link>
            <div className="mt-7">
              <p className="text-xs font-semibold tracking-[.2em] text-[#e9b870] uppercase">
                {eyebrow}
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[#b8a08c]">{description}</p>
            </div>
            {children}
          </main>
        </div>
      </div>
      <nav
        aria-label="Mobile club navigation"
        className="fixed inset-x-3 bottom-3 z-40 flex items-stretch justify-around rounded-2xl border border-[#d9ac73]/25 bg-[#18110b]/95 px-1 py-2 shadow-2xl backdrop-blur-xl lg:hidden"
      >
        {nav
          .filter((x) => ["overview", "attendance", "members", "finance"].includes(x.key)|| (context.role==="STAFF"&&x.key==="renewals"))
          .map(({ key, label, href, icon: Icon }) => (
            <Link
              key={key}
              href={base + href}
              aria-current={key === active ? "page" : undefined}
              className={
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] " +
                (active === key ? "bg-[#4b2812] text-[#ffd19a]" : "text-[#b7a08c]")
              }
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        <Link
          href={isOwner ? base + "/settings" : base + "/renewals"}
          className="flex flex-1 flex-col items-center gap-1 px-1 py-2 text-[10px] text-[#b7a08c]"
        >
          <Settings2 className="size-5" />
          More
        </Link>
      </nav>
    </div>
  );
}
