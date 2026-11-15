import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarClock, Clock4, UsersRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { statusForTerm } from "@/lib/membership-dates";
import { BusinessShell } from "@/components/clubs/business-shell";
import {
  OperationsBanner,
  OperationsStat,
  OperationsEmpty,
} from "@/components/human-motion/operations-ui";

export const metadata: Metadata = {
  title: "Membership renewals · ClubKeep",
  robots: { index: false },
};
type Props = { params: Promise<{ clubId: string }> };
export default function RenewalsPage({ params }: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Finding renewals…</main>
      }
    >
      <RenewalsContent params={params} />
    </Suspense>
  );
}
async function RenewalsContent({ params }: Props) {
  const { clubId } = await params,
    session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const [club, records] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.clubMemberRecord.findMany({
      where: { clubId, status: "ACTIVE" },
      select: {
        id: true,
        displayName: true,
        memberNumber: true,
        subscriptions: {
          where: { cancelledAt: null },
          orderBy: { endAt: "desc" },
          take: 1,
          select: { planName: true, startAt: true, endAt: true },
        },
      },
      take: 300,
      orderBy: { displayName: "asc" },
    }),
  ]);
  const expiring = records
    .map((member) => ({
      ...member,
      term: member.subscriptions[0] ?? null,
      status: statusForTerm(member.subscriptions[0] ?? null),
    }))
    .filter((member) => ["EXPIRING", "EXPIRED", "NONE"].includes(member.status));
  const countExpiring = expiring.filter((member) => member.status === "EXPIRING").length;
  const expired = expiring.filter((member) => member.status !== "EXPIRING").length;
  const attention = [...expiring].sort((a, b) => {
    const weight = (status: string) => (status === "EXPIRING" ? 0 : status === "EXPIRED" ? 1 : 2);
    return (
      weight(a.status) - weight(b.status) ||
      (a.term?.endAt.getTime() ?? 0) - (b.term?.endAt.getTime() ?? 0)
    );
  });
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="renewals"
      eyebrow="Keep your community close"
      title="Every renewal matters."
      description="See who is approaching expiry, follow up with care and renew membership terms in a few taps. No payment is processed here."
    >
      <OperationsBanner
        eyebrow="Stay connected"
        title="Renewals should feel like a welcome back."
        description="A clear, gentle way to spot upcoming expiries and care for the members who make your club."
        art="botanical"
        compact
      />
      {access.role !== "STAFF" && (
        <Link
          href={"/clubs/" + encodeURIComponent(clubId) + "/renewal-requests"}
          className="hm-button hm-button-secondary mt-5"
        >
          Open member renewal request inbox <ArrowRight className="size-4" />
        </Link>
      )}
      <div className="hm-ops-stats">
        <OperationsStat
          icon={CalendarClock}
          tone="amber"
          label="Expiring within seven days"
          value={countExpiring}
          detail="Prioritize upcoming renewals"
        />
        <OperationsStat
          icon={Clock4}
          tone="terracotta"
          label="Expired or unassigned"
          value={expired}
          detail="Members who may need attention"
        />
        <OperationsStat
          icon={UsersRound}
          tone="sage"
          label="Roster checked"
          value={records.length}
          detail="Up to 300 member records"
        />
      </div>
      <section className="hm-ops-section" aria-label="Renewals requiring attention">
        <h2 className="hm-section-title">Renewals timeline</h2>
        <p className="mt-2 text-sm text-[#b8a08c]">
          Upcoming expiries appear first, followed by expired and unassigned members. Open a profile
          to take action.
        </p>
        {expiring.length === 0 ? (
          <OperationsEmpty
            icon={CalendarClock}
            title="All caught up"
            detail="No renewals need attention in the current roster."
          />
        ) : (
          <div className="hm-ops-timeline mt-6 space-y-3">
            {attention.map((member) => (
              <Link
                key={member.id}
                href={`/clubs/${clubId}/members/${member.id}`}
                className="hm-ops-row"
              >
                <div className="min-w-0">
                  <p className="font-semibold">{member.displayName}</p>
                  <p className="mt-1 text-xs text-[#a9907a]">
                    #{String(member.memberNumber).padStart(4, "0")} ·{" "}
                    {member.term?.planName ?? "No plan"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p
                    className={`hm-ops-pill ${member.status === "EXPIRING" ? "hm-ops-pill--urgent" : "hm-ops-pill--expired"}`}
                  >
                    {member.status === "EXPIRING"
                      ? "Expiring soon"
                      : member.status === "NONE"
                        ? "Not assigned"
                        : "Expired"}
                    <span className="hm-muted mt-1 block">
                      {member.term?.endAt.toISOString().slice(0, 10) ?? "—"}
                    </span>
                  </p>
                  <ArrowRight className="size-4 text-[var(--hm-terracotta)]" />
                </div>
              </Link>
            ))}
          </div>
        )}
        {records.length === 300 && (
          <p className="mt-4 text-xs text-[#ad927d]">
            The first 300 members are checked. Extend this view with cursor pagination before larger
            clubs onboard.
          </p>
        )}
      </section>
    </BusinessShell>
  );
}
