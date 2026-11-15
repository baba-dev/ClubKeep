import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ScanLine, ShieldCheck, ChevronDown } from "lucide-react";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { requireActiveClubMembership } from "@/lib/club-access";
import { ClubManager } from "@/components/clubs/club-manager";
import { BusinessShell } from "@/components/clubs/business-shell";
import { OwnerHero } from "@/components/human-motion/owner-hero";
import { OwnerMetrics } from "@/components/human-motion/owner-metrics";
import { OwnerEditorial } from "@/components/human-motion/owner-editorial";
import { ownerOverviewSnapshot } from "@/lib/owner-dashboard";

export const metadata: Metadata = { title: "Your club · ClubKeep", robots: { index: false } };
export default function ClubPage({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense fallback={<main className="min-h-screen p-8">Opening your club…</main>}>
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
    select: { id: true, name: true, setupStatus: true, vertical: true, timeZone: true },
  });
  if (!club) notFound();
  if (club.setupStatus === "IN_PROGRESS") {
    if (context.role === "OWNER") redirect("/clubs/" + encodeURIComponent(clubId) + "/setup/type");
    notFound();
  }
  if (context.role === "MEMBER") redirect("/clubs/" + encodeURIComponent(clubId) + "/my");
  const canInvite = context.role === "OWNER" || context.role === "MANAGER";
  const canSeeFinance = canInvite;
  const [snapshot, members, invites] = await Promise.all([
    ownerOverviewSnapshot(prisma, clubId, club.timeZone, canSeeFinance),
    canInvite ? prisma.clubMembership.findMany({
      where: { clubId, status: "ACTIVE" },
      select: { id: true, role: true, joinedAt: true, user: { select: { name: true } } },
      take: 100, orderBy: { joinedAt: "desc" },
    }) : Promise.resolve([]),
    canInvite ? prisma.clubInvite.findMany({
      where: { clubId },
      select: { id: true, expiresAt: true, claimedAt: true, revokedAt: true, claimedBy: { select: { name: true } } },
      take: 50, orderBy: { createdAt: "desc" },
    }) : Promise.resolve([]),
  ]);
  return (
    <BusinessShell clubId={clubId} clubName={club.name} active="overview"
      eyebrow={"ClubKeep Business · " + context.role.toLowerCase()}
      title={club.name} description="Your community and its everyday operations, together in one place.">
      <OwnerHero clubId={clubId} clubName={club.name} vertical={club.vertical} canInvite={canInvite} />
      <OwnerMetrics clubId={clubId} snapshot={snapshot} showFinance={canSeeFinance} />
      <OwnerEditorial clubId={clubId} snapshot={snapshot} canInvite={canInvite} />
      {club.setupStatus === "LEGACY_ACTIVE" && context.role === "OWNER" && (
        <p className="mt-5 flex items-center gap-2 rounded-2xl border p-4 text-sm" style={{borderColor: "var(--hm-terracotta)"}}>
          <ShieldCheck className="size-4" aria-hidden="true" />
          This club predates guided setup. Review its settings before public publication.
        </p>
      )}
      {context.role === "STAFF" ? (
        <section className="hm-surface hm-section p-7">
          <ScanLine className="size-8" style={{color: "var(--hm-sage-deep)"}} />
          <h2 className="hm-section-title mt-4">Your reception desk is ready</h2>
          <p className="hm-section-subtitle">Welcome members and keep attendance accurate. Owner settings remain protected.</p>
          <Link href={"/clubs/" + encodeURIComponent(clubId) + "/attendance"} className="hm-button hm-button-primary mt-5">
            Open check-in
          </Link>
        </section>
      ) : (
        <details id="hm-operations" className="hm-surface hm-operations">
          <summary>
            <span><span className="hm-section-title">Member invitations & club operations</span>
              <span className="hm-section-subtitle block">Manage invites and current memberships.</span>
            </span>
            <ChevronDown className="size-5 shrink-0" aria-hidden="true" />
          </summary>
          <div className="hm-operations-content">
            <ClubManager clubId={clubId} owner={context.role === "OWNER"}
              initialInvites={invites.map((x) => ({
                id: x.id, expiresAt: x.expiresAt.toISOString(),
                claimedAt: x.claimedAt?.toISOString() ?? null,
                revokedAt: x.revokedAt?.toISOString() ?? null,
                claimedBy: x.claimedBy?.name ?? null,
              }))}
              initialMembers={members.map((x) => ({
                id: x.id, name: x.user.name, role: x.role, joinedAt: x.joinedAt.toISOString(),
              }))} />
          </div>
        </details>
      )}
    </BusinessShell>
  );
}
