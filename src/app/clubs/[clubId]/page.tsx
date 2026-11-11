import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ScanLine, IdCard, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { requireActiveClubMembership } from "@/lib/club-access";
import { ClubManager } from "@/components/clubs/club-manager";
import { BusinessShell } from "@/components/clubs/business-shell";
export const metadata: Metadata = { title: "Your club · ClubKeep", robots: { index: false } };
export default function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fff0dd]">Opening your club…</main>
      }
    >
      <ClubContent params={params} />
    </Suspense>
  );
}
async function ClubContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  let context;
  try {
    context = await requireActiveClubMembership(prisma, session.user.id, clubId);
  } catch {
    notFound();
  }
  const club = await prisma.club.findFirst({
    where: { id: clubId, status: "ACTIVE" },
    select: { id: true, name: true, setupStatus: true, vertical: true },
  });
  if (!club) notFound();
  if (club.setupStatus === "IN_PROGRESS") {
    if (context.role === "OWNER") redirect("/clubs/" + encodeURIComponent(clubId) + "/setup/type");
    notFound();
  }
  if (context.role === "MEMBER")
    return (
      <main className="min-h-screen bg-[#0b0705] px-5 py-10 text-[#fff0df]">
        <div className="mx-auto max-w-3xl">
          <Link href="/home" className="text-sm text-[#ecc18b]">
            ← My clubs
          </Link>
          <div className="mt-12 rounded-3xl border border-[#f6dc9b]/20 bg-[#1c130c] p-8">
            <IdCard className="size-10 text-[#f0ba73]" />
            <p className="mt-6 text-xs font-semibold tracking-widest text-[#e3ad70] uppercase">
              ClubKeep / Member
            </p>
            <h1 className="mt-3 text-4xl font-semibold">{club.name}</h1>
            <p className="mt-4 leading-7 text-[#c5aa92]">
              Your private club space. Your personal fitness and health records remain yours.
            </p>
            <Link
              href={"/clubs/" + clubId + "/my-attendance"}
              className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f1c57c] to-[#f26b00] px-6 font-bold text-[#2a1608]"
            >
              <ScanLine className="size-4" />
              Open my QR pass
            </Link>
          </div>
        </div>
      </main>
    );
  const canInvite = context.role === "OWNER" || context.role === "MANAGER";
  const [members, invites] = canInvite
    ? await Promise.all([
        prisma.clubMembership.findMany({
          where: { clubId, status: "ACTIVE" },
          select: { id: true, role: true, joinedAt: true, user: { select: { name: true } } },
          take: 100,
          orderBy: { joinedAt: "desc" },
        }),
        prisma.clubInvite.findMany({
          where: { clubId },
          select: {
            id: true,
            expiresAt: true,
            claimedAt: true,
            revokedAt: true,
            claimedBy: { select: { name: true } },
          },
          take: 50,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="overview"
      eyebrow={"ClubKeep Business · " + context.role.toLowerCase()}
      title={club.name}
      description="Your club operations and members, all in one secure space."
    >
      {club.setupStatus === "LEGACY_ACTIVE" && context.role === "OWNER" && (
        <p className="mt-7 rounded-2xl border border-[#e4b56e]/30 bg-[#332116] p-4 text-sm text-[#e9c194]">
          <ShieldCheck className="mr-2 inline size-4" />
          This club predates guided setup. Existing operations remain available; review its settings
          before public publication.
        </p>
      )}
      {context.role === "STAFF" ? (
        <section className="mt-8 rounded-3xl border border-[#f6dc9b]/20 bg-[#1d130d] p-8">
          <ScanLine className="size-9 text-[#f4bc80]" />
          <h2 className="mt-4 text-2xl font-semibold">Your reception desk is ready</h2>
          <p className="mt-3 text-sm leading-7 text-[#bda38d]">
            Welcome members and keep attendance accurate. Owner settings remain protected.
          </p>
          <Link
            href={"/clubs/" + clubId + "/attendance"}
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-gradient-to-r from-[#f3c479] to-[#ed741d] px-6 font-bold text-[#281607]"
          >
            Open check-in
          </Link>
        </section>
      ) : (
        <ClubManager
          clubId={clubId}
          owner={context.role === "OWNER"}
          initialInvites={invites.map((x) => ({
            id: x.id,
            expiresAt: x.expiresAt.toISOString(),
            claimedAt: x.claimedAt?.toISOString() ?? null,
            revokedAt: x.revokedAt?.toISOString() ?? null,
            claimedBy: x.claimedBy?.name ?? null,
          }))}
          initialMembers={members.map((x) => ({
            id: x.id,
            name: x.user.name,
            role: x.role,
            joinedAt: x.joinedAt.toISOString(),
          }))}
        />
      )}
    </BusinessShell>
  );
}
