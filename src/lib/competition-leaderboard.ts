import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";

/** Explicitly opted-in, active, linked club members only. No public/city access. */
const visibleMember = {
  is: {
    status: "ACTIVE" as const,
    membership: { is: { role: "MEMBER" as const, status: "ACTIVE" as const } },
    rankingConsent: { is: { enabled: true } },
  },
};

export async function clubLeaderboardPage(
  db: PrismaClient, clubId: string, seasonMetricId: string, viewerMemberId: string,
  cursor?: string
) {
  const consent = await db.clubRankingConsent.findUnique({
    where: { clubId_memberRecordId: { clubId, memberRecordId: viewerMemberId } },
    select: { enabled: true },
  });
  if (!consent?.enabled) throw new AccessDeniedError();
  const where = { clubId, seasonMetricId, member: visibleMember };
  if (cursor) {
    const marker = await db.clubLeaderboardBest.findFirst({
      where: { ...where, memberRecordId: cursor }, select: { scoreId: true },
    });
    if (!marker) throw new AccessDeniedError();
  }
  const results = await db.clubLeaderboardBest.findMany({
    where,
    orderBy: [{ value: "desc" }, { approvedAt: "asc" }, { memberRecordId: "asc" }],
    take: 26,
    ...(cursor ? { cursor: { clubId_seasonMetricId_memberRecordId: {
      clubId, seasonMetricId, memberRecordId: cursor,
    }}, skip: 1 } : {}),
    select: {
      memberRecordId: true, value: true, approvedAt: true,
      member: { select: { displayName: true, memberNumber: true } },
    },
  });
  const page = results.slice(0, 25);
  return { entries: page, nextCursor: results.length > 25 ? page.at(-1)?.memberRecordId ?? null : null };
}

export function leaderboardPlace(index: number, isFirstPage: boolean) {
  return isFirstPage ? "#" + String(index + 1) : "•";
}
