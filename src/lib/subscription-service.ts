import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { termEnd, utcDate, utcToday } from "@/lib/membership-dates";

export type SubscriptionInput = { planId: string; operationKey: string; startDate?: string };

export async function assignMembership(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  memberId: string,
  input: SubscriptionInput,
  mode: "ASSIGN" | "RENEW"
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
    // Serialize *all* subscription writes on the roster record. A Prisma
    // findFirst alone does not guard overlapping concurrent terms.
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ClubMemberRecord"
      WHERE "id" = ${memberId} AND "clubId" = ${clubId} AND "status" = 'ACTIVE'
      FOR UPDATE
    `;
    if (locked.length !== 1) throw new OnboardingError(404, "Member not available");

    const repeat = await tx.memberSubscription.findUnique({
      where: { operationKey: input.operationKey },
    });
    if (repeat) {
      if (
        repeat.clubId !== clubId ||
        repeat.memberRecordId !== memberId ||
        repeat.planId !== input.planId
      )
        throw new OnboardingError(409, "Idempotency key already used");
      return { id: repeat.id, endAt: repeat.endAt, repeated: true };
    }

    const plan = await tx.clubPlan.findFirst({
      where: { id: input.planId, clubId, archivedAt: null },
    });
    if (!plan) throw new OnboardingError(404, "Plan not available");

    const current = await tx.memberSubscription.findFirst({
      where: { clubId, memberRecordId: memberId, cancelledAt: null },
      orderBy: { endAt: "desc" },
      select: { id: true, endAt: true },
    });
    const today = utcToday();
    if (mode === "ASSIGN" && current && current.endAt > today)
      throw new OnboardingError(
        409,
        "This member already has a current or scheduled term; use Renew"
      );
    let start = mode === "ASSIGN" && input.startDate ? utcDate(input.startDate) : today;
    if (mode === "RENEW" && current && current.endAt > start) start = current.endAt;
    // Stop a mistakenly submitted year-long future date or backdating abuse.
    if (mode === "ASSIGN" && Math.abs(start.getTime() - today.getTime()) > 366 * 86400000)
      throw new OnboardingError(400, "Start date must be within one year");
    const end = termEnd(start, plan.durationUnit, plan.durationCount);
    const term = await tx.memberSubscription.create({
      data: {
        clubId,
        memberRecordId: memberId,
        planId: plan.id,
        planName: plan.name,
        priceMinor: plan.priceMinor,
        currency: plan.currency,
        startAt: start,
        endAt: end,
        operationKey: input.operationKey,
        createdByUserId: actorId,
      },
      select: { id: true, endAt: true },
    });
    await tx.memberEvent.create({
      data: {
        clubId,
        memberRecordId: memberId,
        actorUserId: actorId,
        eventType: mode === "RENEW" ? "RENEWED" : "PLAN_ASSIGNED",
        referenceId: term.id,
      },
    });
    return { ...term, repeated: false };
  });
}

export async function cancelMembershipTerm(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  memberId: string,
  subscriptionId: string
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ClubMemberRecord" WHERE "id" = ${memberId} AND "clubId" = ${clubId} FOR UPDATE
    `;
    if (locked.length !== 1) throw new OnboardingError(404, "Member not found");
    const changed = await tx.memberSubscription.updateMany({
      where: { id: subscriptionId, clubId, memberRecordId: memberId, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });
    if (changed.count !== 1)
      throw new OnboardingError(404, "Membership term not found or already cancelled");
    await tx.memberEvent.create({
      data: {
        clubId,
        memberRecordId: memberId,
        actorUserId: actorId,
        eventType: "CANCELLED",
        referenceId: subscriptionId,
      },
    });
  });
}
