import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { requireClubActive } from "@/lib/member-service";

/** A linked member is resolved from their verified session, never a supplied roster ID. */
export async function memberSelfContext(
  db: PrismaClient,
  sessionUserId: string,
  clubId: string
) {
  const membership = await requireClubActive(db, sessionUserId, clubId, ["MEMBER"]);
  const club = await db.club.findFirst({
    where: { id: clubId, status: "ACTIVE" },
    select: { id: true, name: true, vertical: true, timeZone: true },
  });
  if (!club) throw new AccessDeniedError();
  const member = await db.clubMemberRecord.findFirst({
    where: { clubId, membershipId: membership.membershipId, status: "ACTIVE" },
    select: { id: true, displayName: true, memberNumber: true, joinedAt: true },
  });
  return { club, member, membership };
}

export async function requireLinkedMember(
  db: PrismaClient,
  sessionUserId: string,
  clubId: string
) {
  const context = await memberSelfContext(db, sessionUserId, clubId);
  if (!context.member) throw new AccessDeniedError();
  return { ...context, member: context.member };
}
