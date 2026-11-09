import type { ClubRole, PrismaClient } from "@/generated/prisma/client";

/**
 * Default-deny data access. Call only after the server verified a Better Auth
 * session; never accept a client-provided userId as the actor.
 *
 * This helper does not grant a capability by itself: each private DB query
 * must *also* be constrained by the returned clubId/userId where appropriate.
 */
type ClubReader = Pick<PrismaClient, "clubMembership">;

export class AccessDeniedError extends Error {
  readonly status = 403;
  constructor() {
    super("Access denied");
    this.name = "AccessDeniedError";
  }
}

export type ClubContext = Readonly<{
  clubId: string;
  userId: string;
  membershipId: string;
  role: ClubRole;
}>;

export async function requireActiveClubMembership(
  db: ClubReader,
  sessionUserId: string | undefined | null,
  clubId: string | undefined | null
): Promise<ClubContext> {
  if (!sessionUserId?.trim() || !clubId?.trim()) {
    throw new AccessDeniedError();
  }

  const member = await db.clubMembership.findUnique({
    where: {
      clubId_userId: { clubId, userId: sessionUserId },
    },
    select: { id: true, status: true, role: true },
  });

  if (!member || member.status !== "ACTIVE") {
    throw new AccessDeniedError();
  }

  return {
    clubId,
    userId: sessionUserId,
    membershipId: member.id,
    role: member.role,
  };
}

export async function requireClubRole(
  db: ClubReader,
  sessionUserId: string | undefined | null,
  clubId: string | undefined | null,
  allowedRoles: readonly ClubRole[]
): Promise<ClubContext> {
  if (allowedRoles.length === 0) {
    throw new AccessDeniedError();
  }
  const ctx = await requireActiveClubMembership(db, sessionUserId, clubId);
  if (!allowedRoles.includes(ctx.role)) {
    throw new AccessDeniedError();
  }
  return ctx;
}

/**
 * A club owner, staff member, or sponsor never gains Personal record access.
 * Personal ownership is checked independently of memberships and global roles.
 */
export function requirePersonalOwner(
  sessionUserId: string | undefined | null,
  ownerUserId: string | undefined | null
): string {
  if (!sessionUserId?.trim() || !ownerUserId?.trim() || sessionUserId !== ownerUserId) {
    throw new AccessDeniedError();
  }
  return sessionUserId;
}
