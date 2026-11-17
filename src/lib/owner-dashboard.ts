import type { PrismaClient } from "@/generated/prisma/client";
import { clubLocalDate } from "@/lib/attendance-calendar";

export type OwnerOverviewSnapshot = Awaited<ReturnType<typeof ownerOverviewSnapshot>>;

/** Read-only, tenant-scoped owner overview. No fake numbers or cross-currency sums. */
export async function ownerOverviewSnapshot(
  db: PrismaClient,
  clubId: string,
  timeZone: string,
  canSeeFinance: boolean,
  now = new Date()
) {
  const monthParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = monthParts.find((part) => part.type === "year")?.value;
  const monthPart = monthParts.find((part) => part.type === "month")?.value;
  if (!year || !monthPart) throw new Error("Cannot resolve club-local month");
  const month = year + "-" + monthPart;
  // The club/date index bounds the candidate set before club-local timezone filtering.
  const revenueIndexCutoff = new Date(now.getTime() - 35 * 86_400_000);
  const [memberCount, attendanceToday, activeTerms, revenue, recentMembers, challenges] =
    await Promise.all([
      db.clubMemberRecord.count({ where: { clubId, status: "ACTIVE" } }),
      db.clubAttendance.count({ where: { clubId, localDate: clubLocalDate(now, timeZone) } }),
      db.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(DISTINCT "memberRecordId")::bigint AS "total"
        FROM "MemberSubscription" t
        INNER JOIN "ClubMemberRecord" m ON m."id" = t."memberRecordId" AND m."clubId" = t."clubId"
        WHERE t."clubId" = ${clubId} AND m."status" = 'ACTIVE'
          AND t."cancelledAt" IS NULL AND t."startAt" <= ${now} AND t."endAt" > ${now}
      `,
      canSeeFinance
        ? db.$queryRaw<Array<{ currency: string; amount: bigint }>>`
            SELECT p."currency", SUM(p."amountMinor")::bigint AS "amount"
            FROM "ClubPayment" p
            WHERE p."clubId" = ${clubId}
              AND p."receivedAt" >= ${revenueIndexCutoff} AND p."receivedAt" <= ${now}
              -- receivedAt is zone-less UTC: tag it as UTC first, then convert to club-local time.
              AND to_char((p."receivedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM') = ${month}
              AND NOT EXISTS (
                SELECT 1 FROM "ClubPaymentReversal" r
                WHERE r."clubId" = p."clubId" AND r."paymentId" = p."id"
              )
            GROUP BY p."currency"
            ORDER BY p."currency" ASC
          `
        : Promise.resolve([] as Array<{ currency: string; amount: bigint }>),
      db.clubMemberRecord.findMany({
        where: { clubId },
        select: { id: true, displayName: true, joinedAt: true, status: true },
        orderBy: { joinedAt: "desc" },
        take: 5,
      }),
      db.clubChallenge.findMany({
        where: { clubId, startAt: { lte: now }, endAt: { gt: now } },
        select: { id: true, title: true, endAt: true, target: true, kind: true },
        orderBy: { endAt: "asc" },
        take: 2,
      }),
    ]);
  return {
    members: memberCount,
    attendanceToday,
    activeMemberships: Number(activeTerms[0]?.total ?? BigInt(0)),
    revenue: revenue.map((row) => ({
      currency: row.currency,
      // Avoid number-precision loss on unusually large payment ledgers.
      amountMinor: row.amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(row.amount) : null,
    })),
    month,
    recentMembers,
    challenges,
  };
}
