import Link from "next/link";
import { ArrowUpRight, CalendarClock, CheckCircle2, CircleDollarSign, Flame, IdCard, ScanLine, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberArenaSnapshot } from "@/lib/member-projections";
import { formatMinorMoney } from "@/lib/money-format";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";

export const metadata: Metadata = { title: "Member Arena · ClubKeep", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function MyClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const base = "/clubs/" + encodeURIComponent(clubId);
  const snapshot = member ? await memberArenaSnapshot(prisma, clubId, member.id) : null;
  const current = snapshot?.terms.find((term) => !term.cancelledAt && term.endAt > new Date()) ??
    snapshot?.terms.find((term) => !term.cancelledAt) ?? snapshot?.terms[0];
  const due = snapshot?.terms.filter((term) => !term.cancelledAt && term.dueMinor > 0).slice(0, 3) ?? [];
  return (
    <MemberArenaShell clubId={clubId} clubName={club.name} active="arena" eyebrow="Your club. Your momentum."
      title={member ? "The next move is yours." : "Welcome to your arena."}
      summary={member ? "Your membership, sessions and progress through your club—all in one focused space." : "Your club access is ready. Reception will link your verified account with your member record."}>
      {!member ? (
        <section className="rounded-3xl border border-[#e7ad63]/30 bg-[#211710] p-7 sm:p-10">
          <ShieldCheck className="size-9 text-[#ffc278]" />
          <h2 className="mt-5 text-2xl font-bold">One quick step before you begin</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#d2b8a0]">Ask the front desk to link your verified ClubKeep account to your existing club member record. We never match accounts using unverified contact details.</p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
            <section className="relative overflow-hidden rounded-[2rem] border border-[#e6a759]/40 bg-gradient-to-br from-[#543013] via-[#2c1b15] to-[#161319] p-6 shadow-[0_20px_80px_-35px_#e87325aa] sm:p-9">
              <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-14 size-72 rounded-full border-[42px] border-[#f2a441]/10" />
              <div aria-hidden="true" className="pointer-events-none absolute bottom-[-100px] right-16 size-64 rotate-45 border-[36px] border-white/5" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f9c48a]/35 bg-black/20 px-3 py-1.5 text-[10px] font-bold tracking-[.16em] text-[#ffd098] uppercase"><Flame className="size-3.5" /> Athlete access</span>
                <p className="mt-7 text-sm text-[#f3cfb1]">Welcome back,</p>
                <h2 className="mt-1 max-w-lg text-3xl font-black tracking-tight sm:text-5xl">{member.displayName}</h2>
                <p className="mt-4 text-sm text-[#d8b798]">Member #{String(member.memberNumber).padStart(4, "0")} · {club.name}</p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#f4bd6d] px-4 py-2 text-xs font-extrabold text-[#2c180c]">{current?.status ?? "NOT ASSIGNED"}</span>
                  <span className="rounded-full border border-white/25 px-4 py-2 text-xs font-semibold text-white">{current?.planName ?? "No plan yet"}</span>
                </div>
                <Link href={base + "/my/card"} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 text-sm font-extrabold text-[#211712] transition hover:bg-[#ffdbac]"><IdCard className="size-4" /> View membership ID <ArrowUpRight className="size-4" /></Link>
              </div>
            </section>
            <section className="flex flex-col justify-between rounded-[2rem] border border-white/10 bg-[#19191e] p-6 sm:p-8">
              <div>
                <span className="flex size-12 items-center justify-center rounded-2xl bg-[#f2ab54]/15"><Trophy className="size-6 text-[#ffc17a]" /></span>
                <p className="mt-6 text-xs font-bold tracking-[.18em] text-[#b6a599] uppercase">Your session count</p>
                <p className="mt-2 text-6xl font-black tracking-tighter text-white tabular-nums">{snapshot?.visitCount ?? 0}</p>
                <p className="mt-2 text-sm text-[#b9a79b]">Recorded arrivals with this club</p>
              </div>
              <Link href={base + "/my/attendance"} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#ffbc75] hover:underline">Explore session history <ArrowUpRight className="size-4" /></Link>
            </section>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Link href={base + "/my-attendance"} className="group rounded-3xl border border-[#f5ac61]/30 bg-[#271d17] p-6 transition hover:-translate-y-0.5 hover:border-[#ffc27e] motion-reduce:transform-none">
              <ScanLine className="size-8 text-[#ffb666]" />
              <h2 className="mt-5 text-xl font-bold">Ready to check in?</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">Bring up your rotating, secure entry QR at reception.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]">Open live pass <ArrowUpRight className="size-4" /></span>
            </Link>
            <Link href={base + "/my/renewal"} className="group rounded-3xl border border-white/10 bg-[#19191e] p-6 transition hover:-translate-y-0.5 hover:border-[#ffd098]/50 motion-reduce:transform-none">
              <CalendarClock className="size-8 text-[#ffb666]" />
              <h2 className="mt-5 text-xl font-bold">Stay in the game</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">{current ? "Your plan ends " + current.endAt.toISOString().slice(0, 10) + " (exclusive)." : "Ask reception to assign your first plan."}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]">Renewal options <ArrowUpRight className="size-4" /></span>
            </Link>
            <Link href={base + "/my/payments"} className="group rounded-3xl border border-white/10 bg-[#19191e] p-6 transition hover:-translate-y-0.5 hover:border-[#ffd098]/50 motion-reduce:transform-none">
              <CircleDollarSign className="size-8 text-[#ffb666]" />
              <h2 className="mt-5 text-xl font-bold">Know your balance</h2>
              <p className="mt-2 text-sm leading-6 text-[#bcaa9a]">{due.length ? due.map((term) => formatMinorMoney(term.dueMinor, term.currency)).join(" · ") + " outstanding across shown terms." : "No outstanding dues among your latest membership terms."}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#ffc17b]">Fee history <ArrowUpRight className="size-4" /></span>
            </Link>
          </div>
          <section className="mt-6 rounded-3xl border border-white/10 bg-[#15151a] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-[#ffb575] uppercase"><Sparkles className="size-4" /> Your activity</p><h2 className="mt-2 text-2xl font-bold">Recent sessions</h2></div>
              <Link href={base + "/my/attendance"} className="text-sm font-semibold text-[#ffc17b] hover:underline">All sessions →</Link>
            </div>
            {snapshot?.recentVisits.length ? <ul className="mt-6 divide-y divide-white/10">{snapshot.recentVisits.map((visit) => <li key={visit.id} className="flex items-center justify-between gap-3 py-4"><span className="flex items-center gap-2 font-semibold"><CheckCircle2 className="size-5 text-[#f5b56d]" /> {visit.localDate}</span><span className="text-xs text-[#b3a59c]">{visit.method === "QR" ? "QR check-in" : "Reception check-in"}</span></li>)}</ul> : <p className="mt-5 text-sm text-[#bba99d]">Your first check-in will show here. See you at reception!</p>}
          </section>
          <p className="mt-5 flex items-center gap-2 text-xs text-[#9c8f84]"><ShieldCheck className="size-4" /> Your personal health information is never shared through club membership.</p>
        </>
      )}
    </MemberArenaShell>
  );
}
