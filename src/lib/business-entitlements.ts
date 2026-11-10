import type { BusinessTier, PrismaClient } from "@/generated/prisma/client";

/** Approved member caps. Pro uses capacity/fair-use limits outside this numeric gate. */
export const MEMBER_LIMITS: Record<BusinessTier, number | null> = {
  FREE: 25,
  STARTER: 75,
  GROWTH: 300,
  PRO: null,
};

export class MemberLimitError extends Error {
  readonly status = 409;
  constructor(public readonly limit: number) {
    super("Your club has reached its active member limit. Archive an eligible inactive member or upgrade the plan.");
    this.name = "MemberLimitError";
  }
}

type Client = Pick<PrismaClient, "club" | "$queryRaw">;

/**
 * Caller MUST already hold a write lock on the Club row in this transaction.
 * Counts: active roster records + active member identities without a currently
 * active linked roster. Never uses optional unverified phone as an identity.
 */
export async function assertMemberSeatAvailable(tx: Client, clubId: string) {
  const club = await tx.club.findUnique({
    where: { id: clubId },
    select: { businessTier: true, status: true },
  });
  if (!club || club.status !== "ACTIVE") throw new MemberLimitError(0);
  const limit = MEMBER_LIMITS[club.businessTier];
  if (limit === null) return;
  const counts = await tx.$queryRaw<{used:number}[]>`
    SELECT (
      (SELECT COUNT(*) FROM "ClubMemberRecord" WHERE "clubId" = ${clubId} AND "status" = 'ACTIVE') +
      (SELECT COUNT(*) FROM "ClubMembership" AS m
       WHERE m."clubId" = ${clubId} AND m."role" = 'MEMBER' AND m."status" = 'ACTIVE'
       AND NOT EXISTS (
         SELECT 1 FROM "ClubMemberRecord" AS r
         WHERE r."clubId" = m."clubId" AND r."membershipId" = m."id" AND r."status" = 'ACTIVE'
       ))
    )::int AS "used"
  `;
  if ((counts[0]?.used ?? limit) >= limit) throw new MemberLimitError(limit);
}
