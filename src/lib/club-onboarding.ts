import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { requireClubRole, AccessDeniedError } from "@/lib/club-access";
import { assertMemberSeatAvailable } from "@/lib/business-entitlements";
import {
  INVITE_KEY_VERSION,
  INVITE_LIFETIME_MS,
  inviteTokenHash,
  newInviteToken,
} from "@/lib/invite-token";

export class OnboardingError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}

function invalidInvite(): never {
  throw new OnboardingError(400, "This invitation is invalid or no longer available");
}

function clubSlug(name: string): string {
  const base = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 44)
    .replace(/-$/g, "");
  return (base || "club") + "-" + randomBytes(6).toString("hex");
}

async function requireLiveClub(
  tx: Pick<PrismaClient, "club" | "clubMembership">,
  userId: string,
  clubId: string,
  roles: ("OWNER" | "MANAGER" | "STAFF")[]
) {
  await requireClubRole(tx, userId, clubId, roles);
  const club = await tx.club.findUnique({ where: { id: clubId }, select: { status: true, setupStatus: true } });
  if (club?.status !== "ACTIVE" || club.setupStatus === "IN_PROGRESS") throw new AccessDeniedError();
}

export async function createClub(db: PrismaClient, actorId: string, name: string) {
  return db.$transaction(async (tx) => {
    const club = await tx.club.create({
      data: { name, slug: clubSlug(name) },
      select: { id: true, name: true, slug: true },
    });
    await tx.clubMembership.create({
      data: { clubId: club.id, userId: actorId, role: "OWNER", status: "ACTIVE" },
    });
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId: club.id,
        eventType: "CLUB_CREATED",
        referenceId: club.id,
      },
    });
    return club;
  });
}

export async function issueClubInvite(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  secret: string
) {
  const token = newInviteToken();
  const tokenHash = inviteTokenHash(token, secret);
  const expiresAt = new Date(Date.now() + INVITE_LIFETIME_MS);
  const invite = await db.$transaction(async (tx) => {
    await requireLiveClub(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    // Phase 0D explicitly disallows role escalation through a bearer link.
    const created = await tx.clubInvite.create({
      data: {
        clubId,
        issuedByUserId: actorId,
        role: "MEMBER",
        tokenHash,
        tokenKeyVersion: INVITE_KEY_VERSION,
        expiresAt,
      },
      select: { id: true, expiresAt: true },
    });
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId,
        eventType: "INVITE_CREATED",
        referenceId: created.id,
      },
    });
    return created;
  });
  return { ...invite, token };
}

export async function revokeClubInvite(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  inviteId: string
) {
  return db.$transaction(async (tx) => {
    await requireLiveClub(tx, actorId, clubId, ["OWNER", "MANAGER"]);
    const result = await tx.clubInvite.updateMany({
      where: {
        id: inviteId,
        clubId,
        role: "MEMBER",
        claimedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    if (result.count !== 1) throw new OnboardingError(404, "Invitation not available");
    await tx.securityEvent.create({
      data: { actorUserId: actorId, clubId, eventType: "INVITE_REVOKED", referenceId: inviteId },
    });
  });
}

export async function previewClubInvite(db: PrismaClient, token: string, secret: string) {
  const invite = await db.clubInvite.findUnique({
    where: { tokenHash: inviteTokenHash(token, secret) },
    select: {
      role: true,
      tokenKeyVersion: true,
      expiresAt: true,
      claimedAt: true,
      revokedAt: true,
      club: { select: { id: true, name: true, status: true } },
    },
  });
  if (
    !invite ||
    invite.tokenKeyVersion !== INVITE_KEY_VERSION ||
    invite.role !== "MEMBER" ||
    invite.club.status !== "ACTIVE" ||
    invite.claimedAt ||
    invite.revokedAt ||
    invite.expiresAt.getTime() <= Date.now()
  )
    invalidInvite();
  return { name: invite.club.name, expiresAt: invite.expiresAt, role: "MEMBER" as const };
}

export async function claimClubInvite(
  db: PrismaClient,
  actorId: string,
  token: string,
  secret: string
) {
  const tokenHash = inviteTokenHash(token, secret);
  return db.$transaction(async (tx) => {
    const invite = await tx.clubInvite.findUnique({
      where: { tokenHash },
      select: { id: true, clubId: true, tokenKeyVersion: true, role: true },
    });
    if (!invite || invite.role !== "MEMBER" || invite.tokenKeyVersion !== INVITE_KEY_VERSION)
      invalidInvite();
    const now = new Date();
    // PostgreSQL conditional UPDATE holds the row lock. Exactly one claimant
    // can change a currently valid unclaimed token; all writes roll back together.
    const changed = await tx.clubInvite.updateMany({
      where: {
        id: invite.id,
        tokenHash,
        claimedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        club: { status: "ACTIVE" },
      },
      data: { claimedAt: now, claimedByUserId: actorId },
    });
    if (changed.count !== 1) invalidInvite();
    // Serialize onboarding against walk-in registration and other claims.
    await tx.$queryRaw`SELECT "id" FROM "Club" WHERE "id" = ${invite.clubId} FOR UPDATE`;
    const existing = await tx.clubMembership.findUnique({
      where: { clubId_userId: { clubId: invite.clubId, userId: actorId } },
      select: { status: true },
    });
    if (existing?.status !== undefined && existing.status !== "LEFT") {
      throw new OnboardingError(409, "You already have a membership in this club");
    }
    await assertMemberSeatAvailable(tx, invite.clubId);
    if (existing) {
      await tx.clubMembership.update({
        where: { clubId_userId: { clubId: invite.clubId, userId: actorId } },
        data: { status: "ACTIVE", role: "MEMBER", joinedAt: now, leftAt: null },
      });
    } else {
      await tx.clubMembership.create({
        data: { clubId: invite.clubId, userId: actorId, role: "MEMBER", status: "ACTIVE" },
      });
    }
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId: invite.clubId,
        eventType: "INVITE_CLAIMED",
        referenceId: invite.id,
      },
    });
    return { clubId: invite.clubId };
  });
}

/** Member revocation never deletes or modifies a global User or PersonalProfile. */
export async function revokeClubMember(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  membershipId: string
) {
  return db.$transaction(async (tx) => {
    await requireLiveClub(tx, actorId, clubId, ["OWNER"]);
    const result = await tx.clubMembership.updateMany({
      where: { id: membershipId, clubId, role: "MEMBER", status: "ACTIVE" },
      data: { status: "LEFT", leftAt: new Date() },
    });
    if (result.count !== 1) {
      throw new OnboardingError(404, "Active member not available");
    }
    await tx.securityEvent.create({
      data: {
        actorUserId: actorId,
        clubId,
        eventType: "MEMBERSHIP_CHANGED",
        referenceId: membershipId,
      },
    });
  });
}
