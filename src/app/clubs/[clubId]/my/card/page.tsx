import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight, IdCard, ShieldCheck, ScanLine } from "lucide-react";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { memberSelfContext } from "@/lib/member-self-service";
import { memberArenaSnapshot } from "@/lib/member-projections";
import { prisma } from "@/lib/prisma";
import { MemberArenaShell } from "@/components/clubs/member-arena-shell";
import { PrintClubReceiptButton } from "@/components/clubs/print-club-receipt-button";

export const metadata: Metadata = { title: "My Member ID · ClubKeep", robots: { index: false } };

export default function MyCardRoute(props: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0b0e] p-8 text-[#fce8d2]">Loading your club…</main>}>
      <MyCard {...props} />
    </Suspense>
  );
}

async function MyCard({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  if (!session.user.emailVerified) redirect("/home");
  const { club, member } = await memberSelfContext(prisma, session.user.id, clubId);
  const snapshot = member ? await memberArenaSnapshot(prisma, clubId, member.id) : null;
  const term =
    snapshot?.terms.find((t) => !t.cancelledAt && t.endAt > new Date()) ?? snapshot?.terms[0];
  return (
    <MemberArenaShell
      clubId={clubId}
      clubName={club.name}
      active="card"
      eyebrow="Official club identity"
      title="Carry your club with you."
      summary="A beautifully simple membership ID, ready to show or print. Entry requires your separate live rotating check-in pass."
    >
      {!member ? (
        <div className="rounded-3xl border border-white/15 bg-[#19191e] p-8">
          <ShieldCheck className="size-7 text-[#ffbf7d]" />
          <h2 className="mt-4 text-xl font-bold">Your member record needs linking</h2>
          <p className="mt-3 text-sm text-[#bbaca0]">
            Ask your club reception to link this signed-in account with your registered member
            number.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section
            aria-label="Your non-authenticating membership ID"
            className="relative isolate min-h-[290px] overflow-hidden rounded-[2rem] border border-[#fbd09c]/35 bg-gradient-to-br from-[#442610] via-[#271a15] to-[#13131a] p-7 shadow-[0_35px_100px_-50px_#ec8024a0] sm:p-10 print:fixed print:inset-auto print:top-0 print:left-0 print:m-0 print:h-[53.98mm] print:min-h-0 print:w-[85.6mm] print:rounded-none print:border-0 print:bg-[#271a15] print:p-[5mm] print:shadow-none"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-40 -right-16 size-[380px] rounded-full border-[60px] border-[#ef9f44]/15"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute right-10 -bottom-48 size-72 rotate-45 border-[48px] border-white/5"
            />
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-xs font-black tracking-[.22em] text-[#ffd49a] uppercase">
                  <IdCard className="size-5" /> CLUBKEEP
                </span>
                <span className="rounded-full border border-[#ffc27a]/35 px-3 py-1 text-[10px] font-bold tracking-widest text-[#ffd19c] uppercase">
                  Member ID
                </span>
              </div>
              <div className="mt-14 print:mt-7">
                <p className="text-xs font-bold tracking-[.12em] text-[#e8b68a] uppercase">
                  {club.name}
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl print:text-2xl">
                  {member.displayName}
                </h2>
              </div>
              <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-white/20 pt-5 print:mt-5 print:pt-3">
                <div>
                  <p className="text-[10px] text-[#ddaa82] uppercase">Member number</p>
                  <p className="mt-1 text-xl font-black tracking-widest text-white tabular-nums">
                    #{String(member.memberNumber).padStart(4, "0")}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-[#ddaa82] uppercase">Membership</p>
                  <p className="mt-1 text-sm font-bold text-[#ffce8a]">
                    {term?.planName ?? "Unassigned"}
                  </p>
                </div>
              </div>
            </div>
          </section>
          <aside className="rounded-3xl border border-white/10 bg-[#1a191d] p-6">
            <ShieldCheck className="size-8 text-[#f5b977]" />
            <h2 className="mt-4 text-lg font-bold">Secure by design</h2>
            <p className="mt-2 text-sm leading-7 text-[#bca99a]">
              This card identifies your club membership, but it cannot grant entry on its own and
              contains no reusable QR credential.
            </p>
            <Link
              href={"/clubs/" + encodeURIComponent(clubId) + "/my-attendance"}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f7d08e] to-[#eb8128] px-5 text-sm font-bold text-[#23150d]"
            >
              <ScanLine className="size-4" /> Open live check-in <ArrowUpRight className="size-4" />
            </Link>
            <div className="mt-4">
              <PrintClubReceiptButton />
            </div>
          </aside>
        </div>
      )}
    </MemberArenaShell>
  );
}
