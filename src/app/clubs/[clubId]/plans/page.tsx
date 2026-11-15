import { Suspense } from "react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubActive } from "@/lib/member-service";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { PlanStudio } from "@/components/clubs/plan-studio";
import { Layers3, Archive, BadgeCheck } from "lucide-react";
import { OperationsBanner, OperationsStat } from "@/components/human-motion/operations-ui";

export const metadata: Metadata = {
  title: "Membership plans · ClubKeep",
  robots: { index: false },
};
export default function PlansPage({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Opening plan studio…</main>
      }
    >
      <PlansContent params={params} />
    </Suspense>
  );
}
async function PlansContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params,
    session = await requireSession();
  const access = await requireClubActive(prisma, session.user.id, clubId, [
    "OWNER",
    "MANAGER",
    "STAFF",
  ]);
  const [club, plans] = await Promise.all([
    prisma.club.findUniqueOrThrow({ where: { id: clubId }, select: { name: true } }),
    prisma.clubPlan.findMany({ where: { clubId }, orderBy: { createdAt: "desc" }, take: 150 }),
  ]);
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="plans"
      eyebrow="Plan studio"
      title="Membership, made flexible."
      description="Craft a plan for every kind of member. Change future prices freely while keeping past membership records accurate."
    >
      <OperationsBanner eyebrow="A plan for every path" title="Thoughtful memberships, beautifully managed." description="Offer choices that make sense for your community, without changing anyone\u0027s historical terms." art="lifestyle" compact />
      <div className="hm-ops-stats">
        <OperationsStat icon={Layers3} label="All plans" value={plans.length} />
        <OperationsStat icon={BadgeCheck} tone="terracotta" label="Available" value={plans.filter((p) => !p.archivedAt).length} />
        <OperationsStat icon={Archive} tone="cocoa" label="Archived" value={plans.filter((p) => p.archivedAt).length} />
      </div>
      <PlanStudio
        clubId={clubId}
        canManage={access.role === "OWNER" || access.role === "MANAGER"}
        plans={plans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          description: plan.description,
          durationUnit: plan.durationUnit,
          durationCount: plan.durationCount,
          priceMinor: plan.priceMinor,
          currency: plan.currency,
          archivedAt: plan.archivedAt?.toISOString() ?? null,
        }))}
      />
    </BusinessShell>
  );
}
