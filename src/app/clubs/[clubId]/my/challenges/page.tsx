import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Award, CalendarClock, Flame, Medal, ShieldCheck, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { myChallengeProgress } from "@/lib/competition-challenges";
import { ChallengeJoinButton } from "@/components/clubs/challenge-join-button";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";

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
      <section className="relative overflow-hidden rounded-[2rem] border border-[#f3b56a]/35 bg-gradient-to-r from-[#492715] via-[#302019] to-[#161418] p-7 sm:p-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[-50px] right-10 size-56 rotate-12 border-[34px] border-[#fac77b]/10"
        />
        <p className="relative flex items-center gap-2 text-xs font-black tracking-widest text-[#ffd29c] uppercase">
          <Flame className="size-5" /> Club challenge circuit
        </p>
        <h2 className="relative mt-4 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
          Earned, never given.
        </h2>
        <p className="relative mt-3 max-w-xl text-sm leading-7 text-[#ddbd9f]">
          Achievements are based on your own verified club records. Participation stays private;
          there are no public rankings or automatic payments.
        </p>
      </section>
      <div className="mt-7 grid gap-5 md:grid-cols-2">
        {!challenges.length ? (
          <div className="rounded-3xl border border-dashed border-[#f2b874]/25 bg-[#1d1b1d] p-8">
            <CalendarClock className="size-8 text-[#f2bd7c]" />
            <h3 className="mt-4 text-xl font-black">A new season of challenges is coming.</h3>
            <p className="mt-3 text-sm leading-7 text-[#baa797]">
              Ask your club organiser to announce the first challenge.
            </p>
          </div>
        ) : (
          challenges.map((challenge, index) => {
            const entry = entries.get(challenge.id),
              joined = Boolean(entry?.active);
            const p = progress[index] ?? { progress: 0, completed: false };
            const percentage = joined ? Math.round((100 * p.progress) / challenge.target) : 0;
            const ended = challenge.endAt <= now;
            return (
              <section
                key={challenge.id}
                className="min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-[#191a1e] p-6 sm:p-8"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[#ef9d49]/15">
                    <Trophy className="size-7 text-[#ffcd88]" />
                  </span>
                  {p.completed && joined ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[#f4c57a]/35 bg-[#f1bc69]/10 px-3 py-2 text-xs font-black text-[#ffcf91]">
                      <Medal className="size-4" /> Badge earned
                    </span>
                  ) : (
                    <span className="rounded-full border border-white/15 px-3 py-2 text-xs text-[#b9a89b]">
                      {ended ? "Season ended" : "Club-only"}
                    </span>
                  )}
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-white">
                  {challenge.title}
                </h3>
                <p className="mt-3 text-sm text-[#b8a59a]">
                  {challenge.kind === "ATTENDANCE"
                    ? "Verified club sessions"
                    : "Approved performance submissions"}{" "}
                  · Target {challenge.target}
                </p>
                <div className="mt-7 flex items-end justify-between gap-3">
                  <span className="text-3xl font-black text-[#ffca83] tabular-nums">
                    {p.progress}
                    <small className="ml-2 text-sm text-[#ab9889]">/ {challenge.target}</small>
                  </span>
                  <span className="text-xs font-bold text-[#d9b58f]">{percentage}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={"Progress for " + challenge.title}
                  aria-valuenow={p.progress}
                  aria-valuemax={challenge.target}
                  aria-valuemin={0}
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#473527]"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d56a22] to-[#ffd494] transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: percentage + "%" }}
                  />
                </div>
                <p className="mt-3 text-xs text-[#a99988]">
                  Ends {challenge.endAt.toISOString().slice(0, 10)} · Results are verified by your
                  club
                </p>
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
      <p className="mt-7 flex items-center gap-2 text-xs leading-6 text-[#a99d91]">
        <ShieldCheck className="size-4 shrink-0" /> No health signals, body measures, public
        identities or external ad targeting are used by this feature.
      </p>
      <Link
        href={"/clubs/" + encodeURIComponent(clubId) + "/my/play"}
        className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#ffc588]"
      >
        <Award className="size-4" /> Back to performance arena
      </Link>
    </MemberArenaShell>
  );
}
