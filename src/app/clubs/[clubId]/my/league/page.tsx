import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Crown, ShieldCheck, Trophy, Zap } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { METRICS } from "@/lib/competition-catalog";
import { clubLeaderboardPage, leaderboardPlace } from "@/lib/competition-leaderboard";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { ScoreSubmitForm } from "@/components/clubs/score-submit-form";
import { idInput } from "@/lib/validations/onboarding";

export const metadata: Metadata = { title: "Club League · ClubKeep", robots: { index: false } };
type Props = {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ metric?: string; cursor?: string }>;
};
export default function LeaguePage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#111115] p-8 text-[#fbd19a]">Loading the league…</main>
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
async function Content({ params, searchParams }: Props) {
  const { clubId } = await params;
  const { metric: metricArg, cursor } = await searchParams;
  if (
    (metricArg && !idInput.safeParse(metricArg).success) ||
    (cursor && !idInput.safeParse(cursor).success)
  )
    notFound();
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const now = new Date();
  const season = await prisma.clubSeason.findFirst({
    where: { clubId, startAt: { lte: now }, endAt: { gt: now } },
    select: {
      id: true,
      name: true,
      endAt: true,
      metrics: { select: { id: true, metric: true }, orderBy: { metric: "asc" } },
    },
  });
  const metric =
    season?.metrics.find((m) => m.id === metricArg) ?? (metricArg ? null : season?.metrics[0]);
  if (metricArg && !metric) notFound();
  const consent = member
    ? await prisma.clubRankingConsent.findUnique({
        where: { clubId_memberRecordId: { clubId, memberRecordId: member.id } },
        select: { enabled: true },
      })
    : null;
  const showScores = Boolean(member && consent?.enabled && metric);
  const board =
    showScores && member && metric
      ? await clubLeaderboardPage(prisma, clubId, metric.id, member.id, cursor)
      : null;
  const self =
    member && metric
      ? await prisma.clubLeaderboardBest.findFirst({
          where: { clubId, memberRecordId: member.id, seasonMetricId: metric.id },
          select: { value: true, approvedAt: true },
        })
      : null;
  const base = "/clubs/" + encodeURIComponent(clubId) + "/my";
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="play"
      eyebrow="The league · club verified"
      title="Earn the top spot."
      summary="Every score is reviewed by your club. Different disciplines have separate standings; your identity appears only after you opt in."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-3xl border border-[#f8ba70]/25 bg-[#17171b]">
          <div className="relative overflow-hidden border-b border-[#f9c289]/15 bg-gradient-to-r from-[#4a2815] via-[#302019] to-[#161318] p-6 sm:p-9">
            <div className="relative flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-[#ffc67d]/15">
                <Trophy className="size-7 text-[#ffcf94]" />
              </span>
              <div>
                <p className="text-[11px] font-black tracking-widest text-[#e6b586] uppercase">
                  Club standings
                </p>
                <h2 className="mt-1 text-2xl font-black">{season?.name ?? "No active season"}</h2>
              </div>
            </div>
            {metric && (
              <p className="mt-4 text-sm font-semibold text-[#ffd29a]">
                {METRICS[metric.metric].label} · {METRICS[metric.metric].unit}
              </p>
            )}
            {season && (
              <p className="mt-2 text-xs text-[#c4ab94]">
                This season ends {season.endAt.toISOString().slice(0, 10)} (exclusive).
              </p>
            )}
          </div>
          {season && season.metrics.length > 1 && (
            <nav
              aria-label="Competition disciplines"
              className="flex flex-wrap gap-2 border-b border-white/10 p-4"
            >
              {season.metrics.map((m) => (
                <Link
                  key={m.id}
                  href={"?metric=" + encodeURIComponent(m.id)}
                  aria-current={metric?.id === m.id ? "page" : undefined}
                  className={
                    "min-h-11 rounded-xl px-4 py-3 text-xs font-bold " +
                    (metric?.id === m.id
                      ? "bg-[#f3ba75] text-[#241309]"
                      : "border border-white/15 text-[#dec2a3]")
                  }
                >
                  {METRICS[m.metric].label}
                </Link>
              ))}
            </nav>
          )}
          {!member ? (
            <p className="p-9 text-sm leading-7 text-[#c4af9c]">
              Ask reception to link your verified account before joining the private club league.
            </p>
          ) : !season ? (
            <p className="p-9 text-sm text-[#c4af9c]">
              Your club has not opened a competition season yet.
            </p>
          ) : !consent?.enabled ? (
            <div className="p-8">
              <ShieldCheck className="size-8 text-[#ffbe7b]" />
              <h3 className="mt-4 text-xl font-black">Your privacy, your call.</h3>
              <p className="mt-3 text-sm leading-7 text-[#c5ad9c]">
                Join the club-only standings from your Performance Arena privacy controls. Scores
                remain hidden until you choose to participate.
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center gap-2 font-bold text-[#ffd09a]"
                href={base + "/play"}
              >
                Ranking privacy <ArrowUpRight className="size-4" />
              </Link>
            </div>
          ) : !board?.entries.length ? (
            <p className="p-9 text-sm text-[#c4af9c]">
              No verified entries yet. Be the first to set a club record!
            </p>
          ) : (
            <ol className="divide-y divide-white/10">
              {board.entries.map((entry, index) => (
                <li
                  key={entry.memberRecordId}
                  className={
                    "flex flex-wrap items-center justify-between gap-3 p-5 sm:px-8 " +
                    (entry.memberRecordId === member.id ? "bg-[#47301e]/45" : "")
                  }
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span
                      className={
                        "grid size-11 shrink-0 place-items-center rounded-xl font-black tabular-nums " +
                        (!cursor && index < 3
                          ? "bg-gradient-to-br from-[#fbd394] to-[#d98037] text-[#2c180d]"
                          : "bg-white/5 text-[#c6ae97]")
                      }
                    >
                      {!cursor && index === 0 ? (
                        <Crown className="size-6" />
                      ) : (
                        leaderboardPlace(index, !cursor)
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[#fff0dc]">
                        {entry.member.displayName}
                        {entry.memberRecordId === member.id ? " · You" : ""}
                      </p>
                      <p className="mt-1 text-xs text-[#af9786]">
                        Verified {entry.approvedAt.toISOString().slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <span className="text-right text-lg font-black text-[#ffc680] tabular-nums">
                    {entry.value}
                    <small className="ml-1 text-xs font-semibold text-[#bdac99]">
                      {metric && METRICS[metric.metric].unit}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {board?.nextCursor && metric && (
            <Link
              href={
                "?metric=" +
                encodeURIComponent(metric.id) +
                "&cursor=" +
                encodeURIComponent(board.nextCursor)
              }
              className="flex min-h-14 items-center justify-center border-t border-white/10 text-sm font-bold text-[#ffc17b] hover:bg-white/5"
            >
              More verified results →
            </Link>
          )}
        </section>
        <div className="space-y-5">
          <section className="rounded-3xl border border-[#f7b96a]/20 bg-gradient-to-br from-[#3b2517] to-[#1a191c] p-6">
            <Zap className="size-7 text-[#ffbe79]" />
            <h2 className="mt-4 text-xl font-black">Your personal best</h2>
            {self && metric ? (
              <p className="mt-4 text-5xl font-black tracking-tight text-[#ffd093] tabular-nums">
                {self.value}
                <small className="ml-2 text-sm font-semibold">{METRICS[metric.metric].unit}</small>
              </p>
            ) : (
              <p className="mt-4 text-sm leading-7 text-[#cbb09b]">
                Once a club manager verifies your result, your best performance lands here.
              </p>
            )}
            {self && metric && (
              <Link
                href={base + "/league/card?metric=" + encodeURIComponent(metric.id)}
                className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#ffcc8b]"
              >
                My achievement card <ArrowUpRight className="size-4" />
              </Link>
            )}
          </section>
          {member && season && (
            <section className="rounded-3xl border border-white/10 bg-[#1d1c21] p-6">
              <h2 className="mb-5 text-xl font-black">Submit your result</h2>
              <ScoreSubmitForm clubId={clubId} metrics={season.metrics} />
            </section>
          )}
          <p className="flex gap-2 text-xs leading-6 text-[#ab9786]">
            <ShieldCheck className="mt-1 size-4 shrink-0" /> Club-only visibility. Scores are
            nonclinical, verified and never used to predict your health.
          </p>
        </div>
      </div>
    </MemberArenaShell>
  );
}
