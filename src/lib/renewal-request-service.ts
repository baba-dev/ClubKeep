import type { PrismaClient, MemberRenewalStatus } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { requireLinkedMember } from "@/lib/member-self-service";

export async function createRenewalRequest(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  operationKey: string,
  message: string
) {
  return db.$transaction(async (tx) => {
    const { member } = await requireLinkedMember(tx as PrismaClient, actorId, clubId);
    // The B1 roster update lock serializes concurrent requests with archive/renewal.
    const locked = await tx.clubMemberRecord.updateMany({
      where: { id: member.id, clubId, status: "ACTIVE" },
      data: { updatedAt: new Date() },
    });
    if (locked.count !== 1) throw new AccessDeniedError();
    const retry = await tx.memberRenewalRequest.findUnique({ where: { operationKey } });
    if (retry) {
      if (retry.clubId !== clubId || retry.memberRecordId !== member.id ||
          retry.requestedByUserId !== actorId || (retry.message ?? "") !== message)
        throw new OnboardingError(409, "Request identifier already in use");
      return { id: retry.id, repeated: true };
    }
    const pending = await tx.memberRenewalRequest.findFirst({
      where: { clubId, memberRecordId: member.id, status: "PENDING" },
      select: { id: true },
    });
    if (pending) return { id: pending.id, repeated: true };
    const created = await tx.memberRenewalRequest.create({
      data: { clubId, memberRecordId: member.id, requestedByUserId: actorId, operationKey, message: message || null },
      select: { id: true },
    });
    await tx.securityEvent.create({
      data: { clubId, actorUserId: actorId, eventType: "RENEWAL_REQUESTED", referenceId: created.id },
    });
    return { id: created.id, repeated: false };
  });
}

export async function decideRenewalRequest(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  requestId: string,
  decision: "RESOLVED" | "DECLINED"
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx as PrismaClient, actorId, clubId, ["OWNER", "MANAGER"]);
    const changed = await tx.memberRenewalRequest.updateMany({
      where: { id: requestId, clubId, status: "PENDING" },
      data: { status: decision, decidedAt: new Date(), decidedByUserId: actorId },
    });
    if (changed.count !== 1) throw new OnboardingError(409, "Request is no longer pending");
    await tx.securityEvent.create({
      data: { clubId, actorUserId: actorId, eventType: "RENEWAL_REVIEWED", referenceId: requestId },
    });
    return { id: requestId, status: decision };
  });
}

export function renewalStatusLabel(status: MemberRenewalStatus) {
  if (status === "PENDING") return "Waiting for reception";
  if (status === "RESOLVED") return "Reviewed by your club";
  return "Declined by your club";
}
