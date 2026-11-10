import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ShieldCheck, Users } from "lucide-react";
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
        ) : (
          <section className="mt-8 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-8">
            <Users className="size-8 text-[#ffa451]" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">You're a member</h2>
            <p className="mt-3 leading-7 text-[#b8a08c]">
              Your membership is active. Attendance, renewals and digital ID cards are coming in the
              next business phase.
            </p>
            <p className="mt-5 flex items-center gap-2 text-sm text-[#f1d58b]">
              <ShieldCheck className="size-4" /> Your Personal records stay private.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
