import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock4, Plus, Search, UserRoundCheck, UsersRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { statusForTerm } from "@/lib/membership-dates";
import { BusinessShell } from "@/components/clubs/business-shell";

export const metadata: Metadata = { title: "Members · ClubKeep", robots: { index: false } };
type Filter = "all" | "active" | "expiring" | "expired" | "archived";
type Props = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ q?: string; view?: string }>;
};
export default function MembersPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">
          Loading member registry…
        </main>
      }
    >
      <MembersContent {...props} />
    </Suspense>
  );
}
async function MembersContent({ params, searchParams }: Props) {
  const { clubId } = await params;
  const { q: rawQuery = "", view: rawView = "all" } = await searchParams;
  const q = rawQuery.trim().slice(0, 100);
  const view: Filter = ["all", "active", "expiring", "expired", "archived"].includes(rawView)
    ? (rawView as Filter)
    : "all";
  const session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const [club, total, records] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.clubMemberRecord.count({ where: { clubId, status: "ACTIVE" } }),
    prisma.clubMemberRecord.findMany({
      where: {
        clubId,
        ...(view !== "archived" ? { status: "ACTIVE" as const } : { status: "ARCHIVED" as const }),
        ...(q
          ? {
              OR: [
                { displayName: { contains: q, mode: "insensitive" as const } },
                { contacts: { some: { phoneE164: { contains: q } } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        memberNumber: true,
        status: true,
        joinedAt: true,
        contacts: { where: { source: "OWNER_ENTERED" }, take: 1, select: { phoneE164: true } },
        subscriptions: {
          where: { cancelledAt: null },
          take: 1,
          orderBy: { endAt: "desc" },
          select: { startAt: true, endAt: true, planName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);
  const rows = records
    .map((record) => ({
      ...record,
      current: record.subscriptions[0] ?? null,
      statusLabel: statusForTerm(record.subscriptions[0] ?? null),
    }))
    .filter(
      (record) =>
        view === "all" ||
        view === "archived" ||
        (view === "active" && ["ACTIVE", "SCHEDULED"].includes(record.statusLabel)) ||
        (view === "expiring" && record.statusLabel === "EXPIRING") ||
        (view === "expired" && ["EXPIRED", "NONE"].includes(record.statusLabel))
    );
  const filters: [Filter, string][] = [
    ["all", "All"],
    ["active", "Active"],
    ["expiring", "Expiring"],
    ["expired", "Expired"],
    ["archived", "Archived"],
  ];
  const quota =
    access.businessTier === "FREE"
      ? 25
      : access.businessTier === "STARTER"
        ? 75
        : access.businessTier === "GROWTH"
          ? 300
          : null;
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="members"
      eyebrow="People first"
      title="Your members, beautifully organized."
      description="Register, search and look after everyone in your club. Member contact details are private to authorized staff."
    >
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#f5d4a1]/20 bg-[#21160e] p-5">
          <UsersRound className="size-5 text-[#ffb067]" />
          <p className="mt-3 text-3xl font-semibold">{total}</p>
          <p className="mt-1 text-xs text-[#b9a18b]">Active roster records</p>
        </div>
        <div className="rounded-2xl border border-[#f5d4a1]/15 bg-[#19110d] p-5">
          <UserRoundCheck className="size-5 text-[#d8b36d]" />
          <p className="mt-3 text-3xl font-semibold">{quota ?? "∞"}</p>
          <p className="mt-1 text-xs text-[#b9a18b]">Member limit · {access.businessTier}</p>
        </div>
        <div className="flex items-center justify-center rounded-2xl border border-[#f5d4a1]/15 bg-[#19110d] p-5">
          <Link
            href={`/clubs/${clubId}/members/new`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f1bb5c] to-[#f26b00] px-4 py-3 font-semibold text-[#281607] hover:brightness-110"
          >
            <Plus className="size-4" />
            Register member
          </Link>
        </div>
      </div>
      <section className="mt-6 rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-4 sm:p-6">
        <form method="get" className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="member-search" className="relative flex-1">
            <span className="sr-only">Search members</span>
            <Search className="pointer-events-none absolute top-3.5 left-4 size-4 text-[#aa8c70]" />
            <input
              id="member-search"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name or phone…"
              maxLength={100}
              className="min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0907] pr-4 pl-11 text-sm text-[#fbf1e6] outline-none focus:border-[#f0ad56]"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-xl border border-[#d6a253]/40 px-5 text-sm font-semibold text-[#f1d58b] hover:bg-[#2b1e13]"
          >
            Search
          </button>
        </form>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label="Member filters">
          {filters.map(([key, label]) => (
            <Link
              key={key}
              href={`?view=${key}&q=${encodeURIComponent(q)}`}
              aria-current={view === key ? "page" : undefined}
              className={`rounded-full px-3 py-2 text-xs font-semibold ${view === key ? "bg-[#f5c56d] text-[#261505]" : "border border-[#f6dc9b]/15 bg-[#251910] text-[#cbb29b] hover:text-white"}`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#f6dc9b]/20 p-10 text-center">
              <UsersRound className="mx-auto size-9 text-[#ad885f]" />
              <h2 className="mt-4 text-xl font-semibold">No members in this view</h2>
              <p className="mt-2 text-sm text-[#a9927a]">
                Try another filter or add your first member.
              </p>
              <Link
                href={`/clubs/${clubId}/members/new`}
                className="mt-5 inline-flex items-center gap-2 text-sm text-[#f4b56a] underline"
              >
                Register a member <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            rows.map((member) => (
              <Link
                key={member.id}
                href={`/clubs/${clubId}/members/${member.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f6dc9b]/10 bg-[#21160f] p-4 transition-colors hover:border-[#f6dc9b]/40 hover:bg-[#291c12] sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#f26b00]/15 text-lg font-semibold text-[#ffc27d]">
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{member.displayName}</p>
                    <p className="mt-1 text-xs text-[#a9907c]">
                      Member #{String(member.memberNumber).padStart(4, "0")} ·{" "}
                      {member.contacts[0]?.phoneE164 ?? "No phone on file"}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="text-right">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${member.status === "ARCHIVED" ? "bg-[#aaa]/15 text-[#ddd]" : member.statusLabel === "EXPIRING" ? "bg-amber-500/15 text-amber-300" : member.statusLabel === "EXPIRED" || member.statusLabel === "NONE" ? "bg-orange-500/10 text-orange-300" : "bg-emerald-500/10 text-emerald-300"}`}
                    >
                      {member.status === "ARCHIVED"
                        ? "Archived"
                        : member.statusLabel === "NONE"
                          ? "Unassigned"
                          : member.statusLabel.toLowerCase()}
                    </span>
                    <p className="mt-2 flex items-center justify-end gap-1 text-xs text-[#ad947d]">
                      <Clock4 className="size-3" />
                      {member.current?.planName ?? "No membership plan"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-[#d8a25b] transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))
          )}
        </div>
        {records.length === 200 && (
          <p className="mt-5 text-xs text-[#b8a08c]">
            Showing the latest 200 records. Use search to narrow your results.
          </p>
        )}
      </section>
    </BusinessShell>
  );
}
