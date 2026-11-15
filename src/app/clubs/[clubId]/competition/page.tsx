import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  Activity,
  CalendarDays,
  Crown,
  Flag,
  Medal,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { BusinessShell } from "@/components/clubs/business-shell";
import { OperationsBanner, OperationsStat, OperationsSafetyNote } from "@/components/human-motion/operations-ui";
import { ThemeArtwork } from "@/components/human-motion/media-components";
import { HM_MEDIA } from "@/components/human-motion/media";
import { AchievementArt } from "@/components/human-motion/AchievementArt";
import { SeasonCreateForm } from "@/components/clubs/season-create-form";
import { ChallengeCreateForm } from "@/components/clubs/challenge-create-form";
import { METRIC_KEYS, METRICS, supportsMetric } from "@/lib/competition-catalog";

export const metadata: Metadata = {
  title: "Club Performance Studio · ClubKeep",
  robots: { index: false },
};
type Props = { params: Promise<{ clubId: string }> };
export default function ClubPerformancePage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#ffce94]">
          Opening the performance studio…
        </main>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
async function Content({ params }: Props) {
  const { clubId } = await params;
  const session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const canManage = access.role === "OWNER" || access.role === "MANAGER";
  const now = new Date();
  const [club, seasons, pending, verified, participants, challengeCount] = await Promise.all([
    prisma.club.findUniqueOrThrow({
      where: { id: clubId },
      select: { name: true, vertical: true },
    }),
    prisma.clubSeason.findMany({
      where: { clubId, endAt: { gt: new Date(now.getTime() - 366 * 86400000) } },
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      take: 12,
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        metrics: { select: { metric: true } },
      },
    }),
    prisma.clubScore.count({ where: { clubId, status: "PENDING" } }),
    prisma.clubScore.count({ where: { clubId, status: "APPROVED" } }),
    prisma.clubRankingConsent.count({
      where: {
        clubId,
        enabled: true,
        member: { status: "ACTIVE", membership: { is: { role: "MEMBER", status: "ACTIVE" } } },
      },
    }),
    prisma.clubChallenge.count({ where: { clubId, endAt: { gt: now } } }),
  ]);
  const available = METRIC_KEYS.filter((metric) => supportsMetric(club.vertical, metric));
  const active = seasons.find((s) => s.startAt <= now && s.endAt > now);
  const clubBase = "/clubs/" + encodeURIComponent(clubId);
  const summary = [
    { label: "Pending verification", value: pending, Icon: Activity },
    { label: "Approved performances", value: verified, Icon: Medal },
    { label: "Members opted in", value: participants, Icon: UsersRound },
    { label: "Active challenges", value: challengeCount, Icon: Flag },
  ];
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="competition"
      eyebrow="ClubKeep sports operations"
      title="Build your club's winning culture."
      description="Configure nonclinical disciplines, review score evidence and motivate members. Only approved results appear in private club rankings."
    >
      <OperationsBanner eyebrow="A little spark goes a long way" title="Make progress worth celebrating." description="Private leagues, thoughtful challenges, and recognition grounded in staff-approved results." art="challenge" compact />
      <div className="hm-ops-stats hm-ops-stats--four">
        {summary.map(({ label, value, Icon }, i) => (
          <OperationsStat key={label} icon={Icon} label={label} value={value} tone={(["sage", "terracotta", "cocoa", "amber"] as const)[i]} />
        ))}
      </div>
      <section className="hm-ops-competition-banner mt-6" aria-label="Current club league">
        <ThemeArtwork pair={HM_MEDIA.illustrations.challengeLandscape} className="hm-gallery-art" />
        <div className="absolute right-5 top-5 hidden sm:block" aria-hidden="true">
          <AchievementArt name="challenge-trophy" size={100} />
        </div>
        <p className="hm-kicker hm-page-eyebrow relative flex items-center gap-2">
          <Trophy className="size-5" /> Current club league
        </p>
        <h2 className="hm-display relative mt-4 text-3xl">
          {active?.name ?? "No active season yet"}
        </h2>
        <p className="hm-small relative mt-3 max-w-xl">
          {active
            ? active.metrics.map((m) => METRICS[m.metric].label).join(" · ")
            : "Start with a three-month season. Your club chooses the calendar, sports and approved metrics."}
        </p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          {canManage ? (
            <Link
              href={clubBase + "/competition/review"}
              className="hm-button hm-button-primary"
            >
              Review score submissions <ArrowUpRight className="size-4" />
            </Link>
          ) : (
            <Link
              href={clubBase + "/members"}
              className="hm-button hm-button-primary"
            >
              Record a member&apos;s result
            </Link>
          )}
        </div>
      </section>
      {canManage && (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <section className="hm-ops-section mt-0">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <CalendarDays className="size-6 text-[var(--hm-sage-deep)]" /> New season
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#bfa48b]">
              A performance season lasts three months and cannot overlap another.
            </p>
            <SeasonCreateForm clubId={clubId} available={available} />
          </section>
          <section className="rounded-3xl border border-[#f6dc9b]/15 bg-[#1d140e] p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-xl font-black">
              <Crown className="size-6 text-[#ffc47e]" /> New challenge
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#bfa48b]">
              Help your community show up. Achievements are driven by club check-ins or approved
              scores.
            </p>
            <ChallengeCreateForm
              clubId={clubId}
              seasons={seasons
                .filter((s) => s.endAt > now)
                .map((s) => ({ id: s.id, name: s.name }))}
            />
          </section>
        </div>
      )}
      <section className="hm-ops-section mt-6">
        <h2 className="text-xl font-black">Season history</h2>
        {seasons.length === 0 ? (
          <p className="mt-4 text-sm text-[#bda188]">No club seasons configured yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--hm-line)]">
            {seasons.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span className="font-bold">
                  {s.name}
                  <small className="hm-small mt-1 block font-normal">
                    {s.startAt.toISOString().slice(0, 10)} – {s.endAt.toISOString().slice(0, 10)}
                  </small>
                </span>
                <span className="hm-ops-pill">
                  {s.metrics.length} disciplines
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="hm-ops-safety">
        <ShieldCheck className="mt-1 size-4 shrink-0" /> ClubKeep does not gather personal medical
        data, create public standings or verify results automatically. Every ranking is private to
        eligible club members.
      </p>
    </BusinessShell>
  );
}
