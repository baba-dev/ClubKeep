import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Award, CalendarClock, Flame, ShieldCheck, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { myChallengeProgress } from "@/lib/competition-challenges";
import { ChallengeJoinButton } from "@/components/clubs/challenge-join-button";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { HM_MEDIA } from "@/components/human-motion/media";
import { ThemeArtwork } from "@/components/human-motion/media-components";
import { VerifiedAchievement, awardState } from "@/components/human-motion/verified-achievement";

export const metadata: Metadata = { title: "Club Challenges · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> };
export default function ClubChallengesPage(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0c0d10] p-8 text-[#f9c58e]">
          Loading your club challenges…
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
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const now = new Date();
  const challenges = await prisma.clubChallenge.findMany({
    where: { clubId, endAt: { gt: new Date(now.getTime() - 90 * 86400000) } },
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: 12,
    select: {
      id: true,
      title: true,
      kind: true,
      target: true,
      seasonId: true,
      startAt: true,
      endAt: true,
    },
  });
  const memberEntries = member
    ? await prisma.clubChallengeEntry.findMany({
        where: {
          clubId,
          memberRecordId: member.id,
          challengeId: { in: challenges.map((c) => c.id) },
        },
        select: { challengeId: true, active: true, joinedAt: true },
      })
    : [];
  const entries = new Map(memberEntries.map((x) => [x.challengeId, x]));
  const progress = member
    ? await Promise.all(
        challenges.map(async (challenge) => {
          const entry = entries.get(challenge.id);
          return entry?.active
            ? await myChallengeProgress(prisma, clubId, member.id, challenge, entry.joinedAt)
            : { progress: 0, completed: false };
        })
      )
    : [];
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="play"
      eyebrow="Challenges · Built for consistency"
      title="Find your next victory."
      summary="Join club-only challenges at your pace. Every milestone is backed by real check-ins or approved performances—not hype."
    >
      <section className="hm-member-photo-banner">
        <ThemeArtwork pair={HM_MEDIA.photography.challenge} className="hm-gallery-photo" />
        <ThemeArtwork pair={HM_MEDIA.illustrations.challengeLandscape} className="hm-gallery-art" />
        <div className="relative z-10 max-w-xl">
          <p className="hm-kicker flex items-center gap-2 text-[#ffdec7]"><Flame className="size-4" aria-hidden="true" /> Club challenge circuit</p>
          <h2 className="mt-4">Earned, never given.</h2>
          <p className="mt-4">Achievements reflect verified club attendance or approved scores. Images are promotional artwork, never member portraits.</p>
        </div>
      </section>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {!challenges.length ? (
          <div className="hm-member-panel">
            <CalendarClock className="size-8 text-[var(--hm-sage-deep)]" />
            <h3 className="hm-display mt-4 text-xl">A new season of challenges is coming.</h3>
            <p className="hm-small mt-3">
              Ask your club organiser to announce the first challenge.
            </p>
          </div>
        ) : (
          challenges.map((challenge, index) => {
            const entry = entries.get(challenge.id),
              joined = Boolean(entry?.active);
            const p = progress[index] ?? { progress: 0, completed: false };
            const percentage = joined && challenge.target > 0 ? Math.min(100, Math.round((100 * p.progress) / challenge.target)) : 0;
            const ended = challenge.endAt <= now;
            return (
              <section key={challenge.id} className="hm-member-panel min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="hm-kicker hm-page-eyebrow flex items-center gap-2">
                    <Trophy className="size-4" aria-hidden="true" /> {ended ? "Completed season" : "Your challenge"}
                  </p>
                  <span className={`hm-ops-pill ${p.completed && joined ? "hm-ops-pill--active" : "hm-ops-pill--urgent"}`}>
                    {p.completed && joined ? "Verified target met" : ended ? "Season ended" : joined ? "Participating" : "Not joined"}
                  </span>
                </div>
                <h3 className="hm-display mt-6 text-2xl">
                  {challenge.title}
                </h3>
                <p className="hm-small mt-3">
                  {challenge.kind === "ATTENDANCE"
                    ? "Verified club sessions"
                    : "Approved performance submissions"}{" "}
                  · Target {challenge.target}
                </p>
                <div className="mt-7 flex items-end justify-between gap-3">
                  <span className="text-3xl font-bold text-[var(--hm-terracotta)] tabular-nums">
                    {p.progress}
                    <small className="hm-muted ml-2 text-sm">/ {challenge.target}</small>
                  </span>
                  <span className="hm-small font-bold">{percentage}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={"Progress for " + challenge.title}
                  aria-valuenow={p.progress}
                  aria-valuemax={challenge.target}
                  aria-valuemin={0}
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--hm-line)]"
                >
                  <div
                    className="h-full rounded-full bg-[var(--hm-sage)] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: percentage + "%" }}
                  />
                </div>
                <p className="hm-small mt-3">
                  Ends {challenge.endAt.toISOString().slice(0, 10)} · Results are verified by your
                  club
                </p>
                <div className="mt-5">
                  <VerifiedAchievement
                    state={awardState({ joined, completed: p.completed, progress: p.progress, ended })}
                    progress={p.progress}
                    target={challenge.target}
                    kind={challenge.kind}
                  />
                </div>
                {member && (
                  <ChallengeJoinButton
                    clubId={clubId}
                    challengeId={challenge.id}
                    joined={joined}
                    ended={ended}
                  />
                )}
              </section>
            );
          })
        )}
      </div>
      <p className="hm-small mt-7 flex items-center gap-2">
        <ShieldCheck className="size-4 shrink-0" /> No health signals, body measures, public
        identities or external ad targeting are used by this feature.
      </p>
      <Link
        href={"/clubs/" + encodeURIComponent(clubId) + "/my/play"}
        className="hm-button hm-button-secondary mt-4"
      >
        <Award className="size-4" /> Back to performance arena
      </Link>
    </MemberArenaShell>
  );
}
