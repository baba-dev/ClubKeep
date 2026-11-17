import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, UserRoundCheck, UserRoundX, Repeat2, UsersRound } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { ownerInsights } from "@/lib/owner-insights";
import { financeMonthlyTrend } from "@/lib/finance-service";
import { BusinessShell } from "@/components/clubs/business-shell";
import { CollectionsTrend } from "@/components/human-motion/collections-trend";
import { BarRows, DailyColumns } from "@/components/human-motion/insights-charts";

export const metadata: Metadata = { title: "Insights · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }> };

export default function ClubInsights(props: Props) {
  return (
    <Suspense fallback={<main className="min-h-screen p-9">Loading insights…</main>}>
      <InsightsContent {...props} />
    </Suspense>
  );
}

function formatDay(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-IN", { timeZone, day: "numeric", month: "short" }).format(
    date
  );
}

async function InsightsContent({ params }: Props) {
  const { clubId } = await params;
  const session = await requireSession();
  // Same gate as finance: insights include revenue, so owners and managers only.
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  const club = await prisma.club.findUniqueOrThrow({
    where: { id: clubId },
    select: { name: true, timeZone: true },
  });
  const [insights, revenue] = await Promise.all([
    ownerInsights(prisma, clubId, club.timeZone),
    financeMonthlyTrend(prisma, clubId, club.timeZone),
  ]);
  const { health, attendance, growth, plans, renewals } = insights;
  const base = "/clubs/" + encodeURIComponent(clubId);
  const stats = [
    {
      icon: UserRoundCheck,
      label: "Active members",
      value: health.counts.ACTIVE + health.counts.LAPSING,
    },
    { icon: CalendarClock, label: "Lapsing in 7 days", value: health.counts.LAPSING },
    { icon: UserRoundX, label: "Lapsed in last 30 days", value: health.counts.LAPSED },
    {
      icon: Repeat2,
      label: `Renewed (${renewals.windowDays}-day terms)`,
      value: renewals.ratePercent === null ? "—" : renewals.ratePercent + "%",
    },
  ];
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="insights"
      eyebrow="Owner insights"
      title="See how your club is really doing."
      description="Membership health, attendance and growth from your own records. Times use your club's local calendar."
    >
      <div className="hm-ops-stats hm-ops-stats--four mt-5">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="hm-ops-stat">
            <Icon className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" />
            <p className="hm-ops-stat-value">{value}</p>
            <p className="hm-ops-stat-label">{label}</p>
          </div>
        ))}
      </div>
      {health.truncated && (
        <p className="hm-small mt-3">Showing the first 5,000 members; counts may be incomplete.</p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section className="hm-ops-section" aria-labelledby="lapsing-h">
          <h2 id="lapsing-h" className="text-xl font-semibold">
            Renewals to chase
          </h2>
          <p className="hm-small mt-2">Terms ending within 7 days, soonest first.</p>
          <MemberList
            base={base}
            rows={health.lapsing.map((m) => ({
              id: m.id,
              name: m.name,
              note: "Ends " + formatDay(m.endsAt, club.timeZone),
            }))}
            empty="Nobody is about to lapse. Nice."
          />
          <h3 className="mt-6 text-base font-semibold">Recently lapsed</h3>
          <p className="hm-small mt-1">Term ended in the last 30 days and not renewed.</p>
          <MemberList
            base={base}
            rows={health.lapsed.map((m) => ({
              id: m.id,
              name: m.name,
              note: "Ended " + formatDay(m.endedAt, club.timeZone),
            }))}
            empty="No recent lapses."
          />
        </section>

        <section className="hm-ops-section" aria-labelledby="attendance-h">
          <h2 id="attendance-h" className="text-xl font-semibold">
            Attendance, last 28 days
          </h2>
          <p className="hm-small mt-2">
            {attendance.totalVisits.toLocaleString("en-IN")} visits · {attendance.averagePerDay} a
            day · {attendance.uniqueMembersWeek} members this week · {attendance.uniqueMembersMonth}{" "}
            this month
          </p>
          <div className="mt-5">
            <DailyColumns days={attendance.daily} label="Daily visits" />
          </div>
          <h3 className="mt-6 text-base font-semibold">Busiest days (last 8 weeks)</h3>
          <BarRows
            rows={attendance.weekdays.map((d) => ({ label: d.label, value: d.value }))}
            emptyText="Weekday patterns appear after the first check-ins."
          />
        </section>

        <section className="hm-ops-section" aria-labelledby="growth-h">
          <h2 id="growth-h" className="text-xl font-semibold">
            New members per month
          </h2>
          <BarRows
            rows={growth.map((g) => ({ label: g.key, value: g.value }))}
            emptyText="Add your first members to see growth."
          />
        </section>

        <section className="hm-ops-section" aria-labelledby="plans-h">
          <h2 id="plans-h" className="text-xl font-semibold">
            Members by plan
          </h2>
          <BarRows
            rows={plans.map((p) => ({ label: p.plan, value: p.members }))}
            emptyText="Assign a plan to a member to see your plan mix."
          />
        </section>
      </div>

      <section className="hm-ops-section mt-6" aria-labelledby="revenue-h">
        <h2 id="revenue-h" className="text-xl font-semibold">
          Collections over time
        </h2>
        <p className="hm-small mt-2">
          Externally recorded fees, net of reversals. ClubKeep does not process club payments.
        </p>
        {revenue.length === 0 ? (
          <p className="hm-small mt-4">Recorded fees will appear here by month and currency.</p>
        ) : (
          <CollectionsTrend entries={revenue} />
        )}
      </section>
    </BusinessShell>
  );
}

function MemberList({
  base,
  rows,
  empty,
}: {
  base: string;
  rows: ReadonlyArray<{ id: string; name: string; note: string }>;
  empty: string;
}) {
  if (rows.length === 0) return <p className="hm-small mt-4">{empty}</p>;
  return (
    <ul className="mt-4 space-y-2">
      {rows.map((row) => (
        <li key={row.id}>
          <Link href={base + "/members/" + encodeURIComponent(row.id)} className="hm-ops-row">
            <span className="flex min-w-0 items-center gap-3">
              <UsersRound className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate font-medium">{row.name}</span>
            </span>
            <span className="hm-small shrink-0">{row.note}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
