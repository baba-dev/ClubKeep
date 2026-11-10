import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck, Users, CalendarDays, Layers3, ArrowRight, ScanLine } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { requireActiveClubMembership } from "@/lib/club-access";
import { ClubManager } from "@/components/clubs/club-manager";

export const metadata: Metadata = { title: "Your club · ClubKeep", robots: { index: false } };

export default function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Opening your club…</main>
      }
    >
      <ClubContent params={params} />
    </Suspense>
  );
}
async function ClubContent({ params }: { params: Promise<{ clubId: string }> }) {
  const session = await requireSession();
  const { clubId } = await params;
  let role: "OWNER" | "MANAGER" | "STAFF" | "MEMBER";
  try {
    role = (await requireActiveClubMembership(prisma, session.user.id, clubId)).role;
  } catch {
    notFound();
  }
  const club = await prisma.club.findFirst({
    where: { id: clubId, status: "ACTIVE" },
    select: { id: true, name: true },
  });
  if (!club) notFound();
  const canInvite = role === "OWNER" || role === "MANAGER";
  const canOperate = role !== "MEMBER";
  const members = canInvite
    ? await prisma.clubMembership.findMany({
        where: { clubId, status: "ACTIVE" },
        select: { id: true, role: true, joinedAt: true, user: { select: { name: true } } },
        orderBy: { joinedAt: "desc" },
        take: 100,
      })
    : [];
  const invites = canInvite
    ? await prisma.clubInvite.findMany({
        where: { clubId },
        select: {
          id: true,
          expiresAt: true,
          claimedAt: true,
          revokedAt: true,
          claimedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];
  return (
    <main className="min-h-screen bg-[#0b0705] px-5 py-9 text-[#fbf1e6] sm:px-9">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#f6dc9b]/15 pb-6">
          <Link href="/home" className="text-xl font-bold">
            <span className="mr-3 inline-flex size-10 items-center justify-center rounded-xl bg-[#f26b00] text-[#2a1608]">
              CK
            </span>
            ClubKeep
          </Link>
          <Link href="/home" className="text-sm text-[#ffa451] underline underline-offset-4">
            Back to your space
          </Link>
        </header>
        <p className="mt-10 text-xs font-semibold tracking-[.2em] text-[#f1d58b] uppercase">
          ClubKeep Business · {role.toLowerCase()}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{club.name}</h1>
        <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
          Your private club space. Access is isolated from your Personal account and other clubs.
        </p>
        {canOperate && (
          <nav
            aria-label="Club administration"
            className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <Link
              href={`/clubs/${clubId}/attendance`}
              className="flex items-center justify-between rounded-2xl border border-[#f6dc9b]/20 bg-gradient-to-br from-[#382012] to-[#26190f] p-5 font-semibold text-[#f7d8a3] hover:border-[#ffa451]"
            >
              <span className="flex items-center gap-2">
                <ScanLine className="size-5" />
                Check-in
              </span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/clubs/${clubId}/members`}
              className="flex items-center justify-between rounded-2xl border border-[#f6dc9b]/20 bg-[#26190f] p-5 font-semibold text-[#f7d8a3] hover:border-[#ffa451]"
            >
              <span className="flex items-center gap-2">
                <Users className="size-5" />
                Members
              </span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/clubs/${clubId}/plans`}
              className="flex items-center justify-between rounded-2xl border border-[#f6dc9b]/20 bg-[#26190f] p-5 font-semibold text-[#f7d8a3] hover:border-[#ffa451]"
            >
              <span className="flex items-center gap-2">
                <Layers3 className="size-5" />
                Plans
              </span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href={`/clubs/${clubId}/renewals`}
              className="flex items-center justify-between rounded-2xl border border-[#f6dc9b]/20 bg-[#26190f] p-5 font-semibold text-[#f7d8a3] hover:border-[#ffa451]"
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="size-5" />
                Renewals
              </span>
              <ArrowRight className="size-4" />
            </Link>
          </nav>
        )}
        {canInvite ? (
          <ClubManager
            clubId={club.id}
            owner={role === "OWNER"}
            initialInvites={invites.map((invite) => ({
              id: invite.id,
              expiresAt: invite.expiresAt.toISOString(),
              claimedAt: invite.claimedAt?.toISOString() ?? null,
              revokedAt: invite.revokedAt?.toISOString() ?? null,
              claimedBy: invite.claimedBy?.name ?? null,
            }))}
            initialMembers={members.map((member) => ({
              id: member.id,
              name: member.user.name,
              role: member.role,
              joinedAt: member.joinedAt.toISOString(),
            }))}
          />
        ) : role === "STAFF" ? (
          <section className="mt-8 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-8">
            <ScanLine className="size-8 text-[#ffa451]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">Your reception desk is ready</h2>
            <p className="mt-3 leading-7 text-[#b8a08c]">
              Scan members into the club, welcome walk-ins, and look up members securely. Plan and
              owner settings remain protected.
            </p>
            <Link
              href={`/clubs/${clubId}/attendance`}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f4bc75] px-5 font-bold text-[#281607]"
            >
              Open check-in <ArrowRight className="size-4" />
            </Link>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-8">
            <ShieldCheck className="size-8 text-[#ffa451]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">Welcome to your club</h2>
            <p className="mt-3 leading-7 text-[#b8a08c]">
              Your private member pass refreshes automatically and works with the reception QR
              scanner when your plan is active. Your Personal records stay private.
            </p>
            <Link
              href={`/clubs/${clubId}/my-attendance`}
              className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f3bf73] to-[#ef711c] px-6 font-bold text-[#281607]"
            >
              Show my check-in pass <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
