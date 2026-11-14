import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { ArrowUpRight, Award, Activity, Gauge, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { METRICS } from "@/lib/competition-catalog";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { RankingConsentControl } from "@/components/clubs/ranking-consent-control";

export const metadata: Metadata = { title: "Performance Arena · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }> };
export default function PerformancePage(props: Props) {
  return <Suspense fallback={<main className="min-h-screen bg-[#101012] p-8 text-[#f2c795]">Loading your arena…</main>}>
    <PerformanceContent {...props} />
  </Suspense>;
}
async function PerformanceContent({ params }: Props) {
  const { clubId } = await params;
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const now = new Date();
  const [seasons, consent, scores] = await Promise.all([
    prisma.clubSeason.findMany({
      where: { clubId, endAt: { gt: now } }, orderBy: { startAt: "asc" }, take: 4,
      select: { id: true, name: true, startAt: true, endAt: true, metrics: { select: { id: true, metric: true } } },
    }),
    member ? prisma.clubRankingConsent.findUnique({
      where: { clubId_memberRecordId: { clubId, memberRecordId: member.id } },
      select: { enabled: true },
    }) : Promise.resolve(null),
    member ? prisma.clubScore.findMany({
      where: { clubId, memberRecordId: member.id }, take: 12,
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      select: { id: true, value: true, status: true, submittedAt: true, seasonMetric: { select: { metric: true } } },
    }) : Promise.resolve([]),
  ]);
  const current = seasons.find((s) => s.startAt <= now && now < s.endAt);
  const base = "/clubs/" + encodeURIComponent(clubId) + "/my";
  return (
    <MemberArenaShell clubId={clubId} clubName={club.name} active="play" eyebrow="B6 · The performance league"
      title="Make every rep count." summary="Verified achievements. More momentum. Friendly competition—with your privacy always in your hands.">
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-[#ffa44f]/35 bg-gradient-to-br from-[#55290f] via-[#21191c] to-[#111217] p-7 sm:p-10">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full border-[50px] border-[#f5af5f]/10" />
          <p className="relative flex items-center gap-2 text-xs font-black tracking-[.2em] text-[#ffc47d] uppercase"><Trophy className="size-5" /> Season spotlight</p>
          <h2 className="relative mt-6 max-w-md text-3xl font-black tracking-tight text-white sm:text-5xl">{current?.name ?? "Your next season starts here."}</h2>
          <p className="relative mt-4 max-w-md text-sm leading-7 text-[#d7bca8]">{current ? current.metrics.length + " verified disciplines · Scores reviewed by your club." : "Your club hasn't started a competition season yet. Your attendance and membership remain unaffected."}</p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link href={base + "/league"} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#ffd59a] to-[#ef7a29] px-5 text-sm font-black text-[#251308]">Enter the league <ArrowUpRight className="size-4" /></Link>
            <Link href={base + "/challenges"} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#ffc68a]/35 px-5 text-sm font-bold text-[#ffe0bb]">Explore challenges</Link>
          </div>
        </section>
        {member ? <RankingConsentControl clubId={clubId} initial={consent?.enabled ?? false} /> :
          <section className="rounded-3xl border border-white/15 bg-[#19191e] p-7"><ShieldCheck className="size-8 text-[#f3bd7b]" /><h2 className="mt-4 text-xl font-bold">Link your account to compete</h2><p className="mt-3 text-sm leading-7 text-[#bdad9e]">Ask reception to link your verified member account. Names and scores are never matched by an unverified phone or email.</p></section>}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href={base + "/league"} className="group rounded-3xl border border-white/10 bg-[#1b1b20] p-6 hover:border-[#ffbf77]/50"><Gauge className="size-8 text-[#ffc47a]" /><h3 className="mt-5 text-xl font-black">Leaderboards</h3><p className="mt-2 text-sm leading-6 text-[#b6a599]">Rankings based on club-approved performance, never self-reported claims.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]">View standings <ArrowUpRight className="size-4" /></span></Link>
        <Link href={base + "/challenges"} className="group rounded-3xl border border-white/10 bg-[#1b1b20] p-6 hover:border-[#ffbf77]/50"><Award className="size-8 text-[#ffc47a]" /><h3 className="mt-5 text-xl font-black">Club challenges</h3><p className="mt-2 text-sm leading-6 text-[#b6a599]">Small consistent wins add up. Join privately and earn milestone badges.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]">Explore goals <ArrowUpRight className="size-4" /></span></Link>
        <section className="rounded-3xl border border-white/10 bg-[#1b1b20] p-6"><Sparkles className="size-8 text-[#ffc47a]" /><h3 className="mt-5 text-xl font-black">Your submissions</h3><p className="mt-3 text-5xl font-black text-white tabular-nums">{scores.length}{scores.length === 12 ? "+" : ""}</p><p className="mt-2 text-xs text-[#b5a396]">Recent activity records</p></section>
      </div>
      <section className="mt-6 rounded-3xl border border-white/10 bg-[#19191e] p-6 sm:p-8">
        <h2 className="flex items-center gap-2 text-xl font-black"><Activity className="size-6 text-[#ffc17b]" /> Performance log</h2>
        {!member ? <p className="mt-5 text-sm text-[#baab9e]">Your performance log will appear after your club account is linked.</p> : scores.length === 0 ? <p className="mt-5 text-sm text-[#baab9e]">No scores submitted yet. Join your club's first season to get started.</p> :
        <ul className="mt-5 divide-y divide-white/10">{scores.map((s) => <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <span><strong className="text-sm">{METRICS[s.seasonMetric.metric].label}</strong><small className="mt-1 block text-xs text-[#9f9088]">{s.submittedAt.toISOString().slice(0, 10)}</small></span>
          <span className="text-right"><strong className="font-black text-[#ffc17b] tabular-nums">{s.value} {METRICS[s.seasonMetric.metric].unit}</strong><small className="mt-1 block text-xs text-[#b7a799]">{s.status.toLowerCase()}</small></span>
        </li>)}</ul>}
      </section>
    </MemberArenaShell>
  );
}
