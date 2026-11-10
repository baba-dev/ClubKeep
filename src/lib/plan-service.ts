import type { PrismaClient, PlanDurationUnit } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";

export type PlanInput = {
  name: string;
  description: string;
  durationUnit: PlanDurationUnit;
  durationCount: number;
  priceMinor: number;
  currency: string;
};

export async function createPlan(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: PlanInput
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const plan = await tx.clubPlan.create({
      data: { clubId, ...input },
      select: { id: true, name: true },
    });
    return plan;
  });
}

export async function updatePlan(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  planId: string,
  input: PlanInput
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const updated = await tx.clubPlan.updateMany({
      where: { id: planId, clubId, archivedAt: null },
      data: input,
    });
    if (updated.count !== 1) throw new OnboardingError(404, "Plan not found or archived");
    // Historical member terms have immutable planName, priceMinor and currency snapshots.
  });
}

export async function archivePlan(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  planId: string
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const updated = await tx.clubPlan.updateMany({
      where: { id: planId, clubId, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    if (updated.count !== 1) throw new OnboardingError(404, "Plan not found or archived");
  });
}
