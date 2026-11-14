import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { leaderboardWhere, leaderboardOrder } from "@/lib/competition-policy";

export async function clubLeaderboardPage(
  db: PrismaClient,
  clubId: string,
  seasonMetricId: string,
  viewerMemberId: string,
  cursor?: string
) {
  const consent = await db.clubRankingConsent.findUnique({
    where: { clubId_memberRecordId: { clubId, memberRecordId: viewerMemberId } },
    select: { enabled: true },
  });
  if (!consent?.enabled) throw new AccessDeniedError();
  const where = leaderboardWhere(clubId, seasonMetricId);
  if (cursor) {
    const marker = await db.clubLeaderboardBest.findFirst({
      where: { ...where, memberRecordId: cursor },
      select: { scoreId: true },
    });
    if (!marker) throw new AccessDeniedError();
  }
  const results = await db.clubLeaderboardBest.findMany({
    where,
    orderBy: leaderboardOrder,
    take: 26,
    ...(cursor
      ? {
          cursor: {
            clubId_seasonMetricId_memberRecordId: {
              clubId,
              seasonMetricId,
              memberRecordId: cursor,
            },
          },
          skip: 1,
        }
      : {}),
    select: {
      memberRecordId: true,
      value: true,
      approvedAt: true,
      member: { select: { displayName: true, memberNumber: true } },
    },
  });
  const page = results.slice(0, 25);
  return {
    entries: page,
    nextCursor: results.length > 25 ? (page.at(-1)?.memberRecordId ?? null) : null,
  };
}

export function leaderboardPlace(index: number, isFirstPage: boolean) {
  return isFirstPage ? "#" + String(index + 1) : "•";
}
