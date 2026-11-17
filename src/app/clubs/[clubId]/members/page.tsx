import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Clock4, Plus, Search, UserRoundCheck, UsersRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { statusForTerm } from "@/lib/membership-dates";
import { MEMBER_LIMITS } from "@/lib/business-entitlements";
import { BusinessShell } from "@/components/clubs/business-shell";
import {
  OperationsBanner,
  OperationsStat,
  OperationsEmpty,
} from "@/components/human-motion/operations-ui";

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
  const quota = MEMBER_LIMITS[access.businessTier];
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="members"
      eyebrow="People first"
      title="Your members, beautifully organized."
      description="Register, search and look after everyone in your club. Member contact details are private to authorized staff."
    >
      <OperationsBanner
        eyebrow="The people behind your club"
        title="Every name belongs to a story."
        description="An organized member roster, thoughtful follow-ups, and space to welcome new people."
        art="community"
        action={{
          href: `/clubs/${encodeURIComponent(clubId)}/members/new`,
          label: "Register member",
        }}
        compact
      />
      <div className="hm-ops-stats">
        <OperationsStat icon={UsersRound} tone="sage" label="Active roster records" value={total} />
        <OperationsStat
          icon={UserRoundCheck}
          tone="cocoa"
          label="Plan capacity"
          value={quota ?? "Unlimited"}
          detail={access.businessTier + " tier"}
        >
          {access.role === "OWNER" && (
            <Link
              href={`/clubs/${encodeURIComponent(clubId)}/settings/billing`}
              className="mt-2 inline-block text-sm underline underline-offset-4"
            >
              Manage plan
            </Link>
          )}
        </OperationsStat>
        <div className="hm-ops-stat flex flex-col justify-center gap-2">
          <p className="hm-kicker hm-page-eyebrow">Quick action</p>
          <Link
            className="hm-button hm-button-primary"
            href={`/clubs/${encodeURIComponent(clubId)}/members/new`}
          >
            <Plus className="size-4" aria-hidden="true" /> Register member
          </Link>
        </div>
      </div>
      <section className="hm-ops-section" aria-label="Member directory">
        <form method="get" className="hm-ops-form flex flex-col gap-3 sm:flex-row">
          <input type="hidden" name="view" value={view} />
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
          <button type="submit" className="hm-button hm-button-secondary">
            Search
          </button>
        </form>
        <nav className="hm-ops-filter mt-5" aria-label="Member filters">
          {filters.map(([key, label]) => (
            <Link
              key={key}
              href={`?view=${key}&q=${encodeURIComponent(q)}`}
              aria-current={view === key ? "page" : undefined}
              className="hm-ops-filter-link"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 space-y-3">
          {rows.length === 0 ? (
            <OperationsEmpty
              icon={UsersRound}
              title="No members in this view"
              detail="Try a different search or filter, or welcome your first member."
            >
              <Link
                href={`/clubs/${encodeURIComponent(clubId)}/members/new`}
                className="hm-button hm-button-secondary"
              >
                Register a member <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </OperationsEmpty>
          ) : (
            rows.map((member) => (
              <Link
                key={member.id}
                href={`/clubs/${clubId}/members/${member.id}`}
                className="hm-ops-row group"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <span className="hm-ops-avatar">
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
                      className={`hm-ops-pill ${member.status === "ARCHIVED" ? "" : member.statusLabel === "EXPIRING" ? "hm-ops-pill--urgent" : member.statusLabel === "EXPIRED" || member.statusLabel === "NONE" ? "hm-ops-pill--expired" : "hm-ops-pill--active"}`}
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
