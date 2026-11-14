import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CheckCircle2, Clock4, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { BusinessShell } from "@/components/clubs/business-shell";
import { ScoreReviewButtons } from "@/components/clubs/score-review-buttons";
import { METRICS } from "@/lib/competition-catalog";
import { idInput } from "@/lib/validations/onboarding";

export const metadata: Metadata = { title: "Score verification · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ cursor?: string }> };
export default function ScoresReviewPage(props: Props) {
  return <Suspense fallback={<main className="bg-[#0b0705] p-8 text-[#f9d7b3]">Loading verification queue…</main>}><Content {...props} /></Suspense>;
}
async function Content({ params, searchParams }: Props) {
  const { clubId } = await params;
  const { cursor } = await searchParams;
  if (cursor && !idInput.safeParse(cursor).success) notFound();
  const session = await requireSession();
  await requireClubActive(prisma, session.user.id, clubId, ["OWNER", "MANAGER"]);
  if (cursor) {
    const valid = await prisma.clubScore.findFirst({
      where: { clubId, id: cursor, status: "PENDING" }, select: { id: true },
    });
    if (!valid) notFound();
  }
  const [club, scores] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.clubScore.findMany({
      where: { clubId, status: "PENDING" },
      orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
      take: 31, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true, value: true, note: true, submittedAt: true, submittedByUserId: true,
        member: { select: { displayName: true, memberNumber: true } },
        seasonMetric: { select: { metric: true, season: { select: { name: true } } } },
      },
    }),
  ]);
  const page = scores.slice(0, 30), next = scores.length > 30 ? page.at(-1)?.id : null;
  return <BusinessShell clubId={clubId} clubName={club.name} active="overview" eyebrow="Verified sports · Fair play"
    title="The verification bench" description="Only independently checked results can reach a club leaderboard. Every decision is one-way and audited.">
    <div className="mt-8 flex gap-3 rounded-2xl border border-[#f3b96d]/25 bg-[#2b1d12] p-5 text-sm leading-6 text-[#efd0aa]"><ShieldCheck className="mt-0.5 size-5 shrink-0" /> Approve only evidence you have verified. You cannot verify your own submission.</div>
    <section className="mt-6 overflow-hidden rounded-3xl border border-[#f6d9a1]/15 bg-[#1b1410]">
      <header className="flex items-center gap-2 border-b border-white/10 p-6"><Clock4 className="size-6 text-[#ffc17d]" /><h2 className="text-xl font-black">Awaiting club review</h2><span className="ml-auto text-xs text-[#c9b29a]">30 per page</span></header>
      {page.length === 0 ? <p className="p-9 text-sm text-[#baa28b]">No unverified results right now.</p> :
      <ul className="divide-y divide-white/10">{page.map((score) => <li key={score.id} className="grid gap-4 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0"><p className="text-lg font-bold text-[#fff0d6]">{score.member.displayName} <span className="text-xs text-[#bea389]">#{score.member.memberNumber}</span></p>
          <p className="mt-2 text-sm text-[#f3bc7d]">{METRICS[score.seasonMetric.metric].label} · {score.value} {METRICS[score.seasonMetric.metric].unit}</p>
          <p className="mt-1 text-xs text-[#ac9581]">{score.seasonMetric.season.name} · {score.submittedAt.toISOString().slice(0, 10)}</p>
          {score.note && <p className="mt-3 max-w-xl text-sm leading-6 text-[#e0bf9d]">{score.note}</p>}
        </div>
        <ScoreReviewButtons clubId={clubId} scoreId={score.id} selfSubmitted={score.submittedByUserId === session.user.id} />
      </li>)}</ul>}
    </section>
    {next && <Link href={"?cursor=" + encodeURIComponent(next)} className="mt-5 inline-flex min-h-12 items-center rounded-xl border border-[#ffc07e]/30 px-5 text-sm font-bold text-[#ffc17b]">Next pending scores →</Link>}
    <p className="mt-6 flex items-center gap-2 text-xs text-[#b59c83]"><CheckCircle2 className="size-4" /> Verified results contribute to personal bests and season-specific rankings.</p>
  </BusinessShell>;
}
