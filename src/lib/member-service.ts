import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubRole, AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { assertMemberSeatAvailable } from "@/lib/business-entitlements";

type MemberInput = { displayName: string; phoneE164?: string };

export async function requireClubActive(
  tx: Pick<PrismaClient, "club" | "clubMembership">,
  actorId: string,
  clubId: string,
  roles: ("OWNER" | "MANAGER" | "STAFF" | "MEMBER")[]
) {
  const context = await requireClubRole(tx, actorId, clubId, roles);
  const club = await tx.club.findFirst({ where: { id: clubId, status: "ACTIVE" }, select: { id: true, businessTier: true } });
  if (!club) throw new AccessDeniedError();
  return { ...context, businessTier: club.businessTier };
}

export async function registerMember(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: MemberInput
) {
  return db.$transaction(async tx => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
    // An atomic tenant-local sequence prevents duplicate member numbers.
    const club = await tx.club.update({
      where: { id: clubId },
      data: { memberSequence: { increment: 1 } },
      select: { memberSequence: true },
    });
    await assertMemberSeatAvailable(tx, clubId);
    const member = await tx.clubMemberRecord.create({
      data: {
        clubId,
        memberNumber: club.memberSequence,
        displayName: input.displayName,
      },
      select: { id: true, memberNumber: true, displayName: true },
    });
    if (input.phoneE164) {
      await tx.clubContact.create({
        data: { clubId, memberRecordId: member.id, phoneE164: input.phoneE164 },
      });
    }
    await tx.memberEvent.create({
      data: { clubId, memberRecordId: member.id, actorUserId: actorId, eventType: "REGISTERED" },
    });
    return member;
  });
}

export async function updateMember(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  memberId: string,
  input: MemberInput
) {
  return db.$transaction(async tx => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
    const result = await tx.clubMemberRecord.updateMany({
      where: { id: memberId, clubId, status: "ACTIVE" },
      data: { displayName: input.displayName },
    });
    if (result.count !== 1) throw new OnboardingError(404, "Member not found");
    const contact = await tx.clubContact.findFirst({
      where: { clubId, memberRecordId: memberId, source: "OWNER_ENTERED" },
      select: { id: true },
    });
    if (contact) {
      await tx.clubContact.update({
        where: { id: contact.id },
        data: { phoneE164: input.phoneE164 || null },
      });
    } else if (input.phoneE164) {
      await tx.clubContact.create({
        data: { clubId, memberRecordId: memberId, phoneE164: input.phoneE164 },
      });
    }
  });
}

export async function linkMemberAccount(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  memberId: string,
  membershipId: string
) {
  return db.$transaction(async tx => {
    // Explicit owner/manager confirmation. Never match by unverified phone/email.
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const membership = await tx.clubMembership.findFirst({
      where: { id: membershipId, clubId, status: "ACTIVE", role: "MEMBER" },
      select: { id: true, user: { select: { name: true } } },
    });
    if (!membership) throw new OnboardingError(404, "Linked account not found");
    const changed = await tx.clubMemberRecord.updateMany({
      where: { id: memberId, clubId, membershipId: null, status: "ACTIVE" },
      data: { membershipId },
    });
    if (changed.count !== 1) throw new OnboardingError(409, "Member is already linked or unavailable");
    await tx.memberEvent.create({
      data: { clubId, memberRecordId: memberId, actorUserId: actorId, eventType: "LINKED", referenceId: membershipId },
    });
    return { name: membership.user.name };
  });
}

export async function archiveMember(db: PrismaClient, actorId: string, clubId: string, memberId: string) {
  return db.$transaction(async tx => {
    await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const now = new Date();
    const activeTerm = await tx.memberSubscription.findFirst({
      where: { clubId, memberRecordId: memberId, cancelledAt: null, endAt: { gt: now } },
      select: { id: true },
    });
    if (activeTerm) throw new OnboardingError(409, "Cancel future membership terms before archiving");
    const changed = await tx.clubMemberRecord.updateMany({
      where: { id: memberId, clubId, status: "ACTIVE" }, data: { status: "ARCHIVED" },
    });
    if (changed.count !== 1) throw new OnboardingError(404, "Member not found");
    await tx.memberEvent.create({
      data: { clubId, memberRecordId: memberId, actorUserId: actorId, eventType: "ARCHIVED" },
    });
  });
}
