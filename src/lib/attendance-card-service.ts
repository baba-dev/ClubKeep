import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { newAttendanceQr } from "@/lib/attendance-token";

export async function issueMemberAttendanceQr(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  secret: string,
  now = new Date()
) {
  const ctx = await requireClubActive(db, actorId, clubId, ["MEMBER"]);
  const member = await db.clubMemberRecord.findFirst({
    where: { clubId, membershipId: ctx.membershipId, status: "ACTIVE" },
    select: { id: true, displayName: true, memberNumber: true },
  });
  if (!member)
    throw new OnboardingError(409, "Ask reception to link your club member record first");
  const active = await db.memberSubscription.findFirst({
    where: {
      clubId,
      memberRecordId: member.id,
      cancelledAt: null,
      startAt: { lte: now },
      endAt: { gt: now },
    },
    select: { id: true },
  });
  if (!active)
    throw new OnboardingError(
      409,
      "Your membership is not currently active; please contact reception"
    );
  return {
    ...newAttendanceQr(clubId, member.id, secret, now.getTime()),
    memberName: member.displayName,
    memberNumber: member.memberNumber,
  };
}
