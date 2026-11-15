import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Flame,
  IdCard,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberArenaSnapshot } from "@/lib/member-projections";
import { formatMinorMoney } from "@/lib/money-format";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { HM_MEDIA } from "@/components/human-motion/media";
import { ThemeArtwork } from "@/components/human-motion/media-components";
import { AchievementArt } from "@/components/human-motion/AchievementArt";

export const metadata: Metadata = { title: "Member Arena · ClubKeep", robots: { index: false } };

export default function MyClubPageRoute(props: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[var(--hm-surface)] p-8 text-[var(--hm-text)]">
          Loading your club…
        </main>
      }
    >
      <MyClubPage {...props} />
    </Suspense>
  );
}

async function MyClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const base = "/clubs/" + encodeURIComponent(clubId);
  const snapshot = member ? await memberArenaSnapshot(prisma, clubId, member.id) : null;
  const current =
    snapshot?.terms.find((term) => !term.cancelledAt && term.endAt > new Date()) ??
    snapshot?.terms.find((term) => !term.cancelledAt) ??
    snapshot?.terms[0];
  const due =
    snapshot?.terms.filter((term) => !term.cancelledAt && term.dueMinor > 0).slice(0, 3) ?? [];
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="arena"
      eyebrow="Your club. Your momentum."
      title={member ? "The next move is yours." : "Welcome to your arena."}
      summary={
        member
          ? "Your membership, sessions and progress through your club—all in one focused space."
          : "Your club access is ready. Reception will link your verified account with your member record."
      }
    >
      {!member ? (
        <section className="hm-member-panel">
          <ShieldCheck className="size-9 text-[var(--hm-sage-deep)]" />
          <h2 className="hm-display mt-5 text-2xl">One quick step before you begin</h2>
          <p className="hm-small mt-3 max-w-xl">
            Ask the front desk to link your verified ClubKeep account to your existing club member
            record. We never match accounts using unverified contact details.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_.8fr]">
            <section className="hm-member-photo-banner">
              <ThemeArtwork pair={HM_MEDIA.photography.community} className="hm-gallery-photo" />
              <div className="relative z-10 max-w-lg">
                <p className="hm-kicker text-[#fce0c6]">
                  <Flame className="mr-2 inline size-4" aria-hidden="true" /> Your personal ClubKeep
                  space
                </p>
                <p className="mt-6 text-sm text-[#f4ded0]">Welcome back,</p>
                <h2 className="mt-1">{member.displayName}</h2>
                <p className="mt-4">
                  Member #{String(member.memberNumber).padStart(4, "0")} · {club.name}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#e1eadc] px-4 py-2 text-xs font-bold text-[#34523a]">
                    {current?.status ?? "NOT ASSIGNED"}
                  </span>
                  <span className="rounded-full border border-white/40 px-4 py-2 text-xs font-semibold text-white">
                    {current?.planName ?? "No plan yet"}
                  </span>
                </div>
                <Link
                  href={base + "/my/card"}
                  className="hm-button mt-6 bg-[#fff6ea] text-[#453024]"
                >
                  <IdCard className="size-4" aria-hidden="true" /> View membership ID{" "}
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
                <p className="mt-4 text-[11px] text-[#f5e3d4]">
                  Promotional imagery · Your membership details come from your club records.
                </p>
              </div>
            </section>
            <section className="hm-member-panel flex flex-col justify-between">
              <div>
                {snapshot && snapshot.visitCount >= 100 ? (
                  <AchievementArt
                    name="milestone-badge"
                    size={88}
                    title="100 verified club sessions"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--hm-raised)]">
                    <Trophy className="size-6 text-[var(--hm-terracotta)]" aria-hidden="true" />
                  </span>
                )}
                <p className="hm-kicker hm-muted mt-6">Verified sessions</p>
                <p className="mt-2 text-6xl font-bold tracking-tight tabular-nums">
                  {snapshot?.visitCount ?? 0}
                </p>
                <p className="hm-small mt-2">Recorded arrivals with this club</p>
                {snapshot && snapshot.visitCount >= 100 && (
                  <span className="hm-ops-pill hm-ops-pill--active mt-3">
                    100-session milestone reached
                  </span>
                )}
              </div>
              <Link
                href={base + "/my/attendance"}
                className="hm-button hm-button-secondary mt-7 self-start"
              >
                Session history <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </section>
          </div>
          <Link
            href={base + "/my/play"}
            className="hm-member-photo-banner group mt-5 min-h-[220px] justify-between gap-5 sm:flex-row"
          >
            <ThemeArtwork pair={HM_MEDIA.photography.challenge} className="hm-gallery-photo" />
            <ThemeArtwork
              pair={HM_MEDIA.illustrations.challengeLandscape}
              className="hm-gallery-art"
            />
            <div className="relative z-10 max-w-lg">
              <p className="hm-kicker text-[#ffdec7]">
                <Trophy className="mr-2 inline size-4" aria-hidden="true" /> Performance League &
                Challenges
              </p>
              <h2 className="mt-3">Your next personal best starts here.</h2>
              <p className="mt-3">
                Submit verified results, explore opt-in rankings, and discover club challenges.
              </p>
            </div>
            <span className="hm-button relative z-10 shrink-0 bg-[#fff0dc] text-[#533528]">
              Enter the Arena <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link
              href={base + "/my-attendance"}
              className="group rounded-3xl border border-[#f5ac61]/30 bg-[#271d17] p-6 transition hover:-translate-y-0.5 hover:border-[#ffc27e] motion-reduce:transform-none"
            >
              <ScanLine className="size-8 text-[var(--hm-terracotta)]" />
              <h2 className="mt-5 text-xl font-bold">Ready to check in?</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">
                Bring up your rotating, secure entry QR at reception.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--hm-terracotta)]">
                Open live pass <ArrowUpRight className="size-4" />
              </span>
            </Link>
            <Link
              href={base + "/my/renewal"}
              className="group rounded-3xl border border-[var(--hm-line)] bg-[var(--hm-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[#ffd098]/50 motion-reduce:transform-none"
            >
              <CalendarClock className="size-8 text-[var(--hm-terracotta)]" />
              <h2 className="mt-5 text-xl font-bold">Stay in the game</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">
                {current
                  ? "Your plan ends " + current.endAt.toISOString().slice(0, 10) + " (exclusive)."
                  : "Ask reception to assign your first plan."}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--hm-terracotta)]">
                Renewal options <ArrowUpRight className="size-4" />
              </span>
            </Link>
            <Link
              href={base + "/my/payments"}
              className="group rounded-3xl border border-[var(--hm-line)] bg-[var(--hm-surface)] p-6 transition hover:-translate-y-0.5 hover:border-[#ffd098]/50 motion-reduce:transform-none"
            >
              <CircleDollarSign className="size-8 text-[var(--hm-terracotta)]" />
              <h2 className="mt-5 text-xl font-bold">Know your balance</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">
                {due.length
                  ? due.map((term) => formatMinorMoney(term.dueMinor, term.currency)).join(" · ") +
                    " outstanding across shown terms."
                  : "No outstanding dues among your latest membership terms."}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--hm-terracotta)]">
                Fee history <ArrowUpRight className="size-4" />
              </span>
            </Link>
          </div>
          <section className="mt-6 rounded-3xl border border-[var(--hm-line)] bg-[var(--hm-surface)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#ffb575] uppercase">
                  <Sparkles className="size-4" /> Your activity
                </p>
                <h2 className="mt-2 text-2xl font-bold">Recent sessions</h2>
              </div>
              <Link
                href={base + "/my/attendance"}
                className="text-sm font-semibold text-[var(--hm-terracotta)] hover:underline"
              >
                All sessions →
              </Link>
            </div>
            {snapshot?.recentVisits.length ? (
              <ul className="mt-6 divide-y divide-[var(--hm-line)]">
                {snapshot.recentVisits.map((visit) => (
                  <li key={visit.id} className="flex items-center justify-between gap-3 py-4">
                    <span className="flex items-center gap-2 font-semibold">
                      <CheckCircle2 className="size-5 text-[#f5b56d]" /> {visit.localDate}
                    </span>
                    <span className="text-xs text-[#b3a59c]">
                      {visit.method === "QR" ? "QR check-in" : "Reception check-in"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm text-[#bba99d]">
                Your first check-in will show here. See you at reception!
              </p>
            )}
          </section>
          <p className="mt-5 flex items-center gap-2 text-xs text-[#9c8f84]">
            <ShieldCheck className="size-4" /> Your personal health information is never shared
            through club membership.
          </p>
        </>
      )}
    </MemberArenaShell>
  );
}
