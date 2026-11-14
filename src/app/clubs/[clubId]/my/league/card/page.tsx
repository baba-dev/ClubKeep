import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Medal, ShieldCheck, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { requireLinkedMember } from "@/lib/member-self-service";
import { METRICS } from "@/lib/competition-catalog";
import { idInput } from "@/lib/validations/onboarding";
import { PrintClubReceiptButton } from "@/components/clubs/print-club-receipt-button";
export const metadata: Metadata = { title: "My achievement · ClubKeep", robots: { index: false } };
type Props = { params: Promise<{ clubId: string }>; searchParams: Promise<{ metric?: string }> };
export default function AchievementCardPage(props: Props) {
  return <Suspense fallback={<main className="min-h-screen bg-[#100e0d] p-8 text-[#f7c081]">Opening achievement…</main>}><Card {...props} /></Suspense>;
}
async function Card({ params, searchParams }: Props) {
  const { clubId } = await params; const { metric } = await searchParams;
  if (!metric || !idInput.safeParse(metric).success) notFound();
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await requireLinkedMember(prisma, session.user.id, clubId);
  const best = await prisma.clubLeaderboardBest.findFirst({
    where: { clubId, seasonMetricId: metric, memberRecordId: member.id },
    select: { value: true, approvedAt: true, metric: { select: { metric: true, season: { select: { name: true } } } } },
  });
  if (!best) notFound();
  return <main className="min-h-screen bg-[#0c0c0e] p-5 text-white print:bg-white print:p-0 sm:p-9">
    <div className="mx-auto max-w-[760px]"><nav className="mb-7 flex items-center justify-between gap-3 print:hidden">
      <Link href={"/clubs/" + encodeURIComponent(clubId) + "/my/league"} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#ffcd8c]"><ArrowLeft className="size-4" /> Club league</Link><PrintClubReceiptButton />
    </nav>
    <section aria-label="Printable private club achievement" className="relative isolate min-h-[440px] overflow-hidden rounded-[2rem] border border-[#d7a05f]/30 bg-gradient-to-br from-[#51290c] via-[#251a14] to-[#100e15] p-8 print:rounded-none print:border-0 print:p-12 sm:p-12">
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 -top-44 size-[580px] rounded-full border-[65px] border-[#ffbd6b]/10" />
      <div className="relative"><p className="flex items-center gap-2 text-xs font-black tracking-[.24em] text-[#ffdb9f] uppercase"><Medal className="size-6" /> ClubKeep · Verified achievement</p>
      <h1 className="mt-12 text-3xl font-black tracking-tight sm:text-5xl">{member.displayName}</h1>
      <p className="mt-3 text-sm text-[#e4b790]">{club.name} · {best.metric.season.name}</p>
      <p className="mt-10 text-xs font-bold tracking-widest text-[#e3ad73] uppercase">{METRICS[best.metric.metric].label}</p>
      <p className="mt-2 text-6xl font-black tracking-tighter text-[#ffd89a] tabular-nums sm:text-8xl">{best.value}<small className="ml-3 text-xl font-bold">{METRICS[best.metric.metric].unit}</small></p>
      <p className="mt-5 text-sm text-[#d5bda6]">Verified {best.approvedAt.toISOString().slice(0,10)} by your club</p>
      <p className="mt-12 flex gap-2 border-t border-white/20 pt-5 text-xs leading-6 text-[#c7ae98]"><ShieldCheck className="mt-0.5 size-4 shrink-0" /> This private record is not a medical assessment or public endorsement. Sharing is your choice.</p>
      </div>
    </section></div>
  </main>;
}
