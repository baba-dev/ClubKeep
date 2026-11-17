import type { PrismaClient } from "@/generated/prisma/client";
import { clubLocalDate } from "@/lib/attendance-calendar";
import {
  ATTENDANCE_TREND_DAYS,
  GROWTH_MONTHS,
  LAPSED_WINDOW_DAYS,
  RENEWAL_WINDOW_DAYS,
  WEEKDAY_WINDOW_WEEKS,
  classifyMember,
  fillSeries,
  lastDays,
  lastMonths,
  renewalRatePercent,
  weekdayTotals,
} from "@/lib/insights-policy";

const DAY_MS = 86_400_000;
// Roster is bounded by plan limits; this is a safety valve, not a product limit.
const ROSTER_SCAN_LIMIT = 5000;
const LIST_LIMIT = 20;

export type MembershipHealth = Awaited<ReturnType<typeof membershipHealth>>;
export type OwnerInsights = Awaited<ReturnType<typeof ownerInsights>>;

export function clubLocalMonth(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("Cannot resolve club-local month");
  return year + "-" + month;
}

/**
 * Active vs lapsing vs lapsed members, derived only from non-cancelled
 * MemberSubscription terms of ACTIVE roster members. Tenant-scoped by clubId.
 * Callers must already have verified the caller's role in this club.
 */
export async function membershipHealth(db: PrismaClient, clubId: string, now = new Date()) {
  const rows = await db.$queryRaw<
    Array<{ id: string; displayName: string; lastEnd: Date | null; activeNow: boolean | null }>
  >`
    SELECT m."id", m."displayName",
      MAX(t."endAt") FILTER (WHERE t."cancelledAt" IS NULL) AS "lastEnd",
      BOOL_OR(t."cancelledAt" IS NULL AND t."startAt" <= ${now} AND t."endAt" > ${now}) AS "activeNow"
    FROM "ClubMemberRecord" m
    LEFT JOIN "MemberSubscription" t ON t."clubId" = m."clubId" AND t."memberRecordId" = m."id"
    WHERE m."clubId" = ${clubId} AND m."status" = 'ACTIVE'
    GROUP BY m."id", m."displayName"
    LIMIT ${ROSTER_SCAN_LIMIT}
  `;
  const counts = { ACTIVE: 0, LAPSING: 0, LAPSED: 0, UPCOMING: 0, INACTIVE: 0 };
  const lapsing: Array<{ id: string; name: string; endsAt: Date }> = [];
  const lapsed: Array<{ id: string; name: string; endedAt: Date }> = [];
  for (const row of rows) {
    const status = classifyMember({ activeNow: row.activeNow === true, lastEnd: row.lastEnd }, now);
    counts[status] += 1;
    if (status === "LAPSING" && row.lastEnd)
      lapsing.push({ id: row.id, name: row.displayName, endsAt: row.lastEnd });
    if (status === "LAPSED" && row.lastEnd)
      lapsed.push({ id: row.id, name: row.displayName, endedAt: row.lastEnd });
  }
  lapsing.sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());
  lapsed.sort((a, b) => b.endedAt.getTime() - a.endedAt.getTime());
  return {
    total: rows.length,
    truncated: rows.length >= ROSTER_SCAN_LIMIT,
    counts,
    lapsing: lapsing.slice(0, LIST_LIMIT),
    lapsed: lapsed.slice(0, LIST_LIMIT),
  };
}

/** Full insights bundle. Revenue is intentionally not here: reuse financeMonthlyTrend. */
export async function ownerInsights(
  db: PrismaClient,
  clubId: string,
  timeZone: string,
  now = new Date()
) {
  const today = clubLocalDate(now, timeZone);
  const windowStart = lastDays(today, WEEKDAY_WINDOW_WEEKS * 7)[0];
  const trendDays = lastDays(today, ATTENDANCE_TREND_DAYS);
  const trendStart = trendDays[0];
  const uniqueWeekStart = lastDays(today, 7)[0];
  const growthMonths = lastMonths(clubLocalMonth(now, timeZone), GROWTH_MONTHS);
  const growthCutoff = new Date(now.getTime() - (GROWTH_MONTHS * 31 + 5) * DAY_MS);
  const renewalStart = new Date(now.getTime() - RENEWAL_WINDOW_DAYS * DAY_MS);

  const [health, visitRows, uniqueRows, joinRows, planRows, renewalRows] = await Promise.all([
    membershipHealth(db, clubId, now),
    db.$queryRaw<Array<{ day: string; visits: bigint }>>`
      SELECT "localDate" AS "day", COUNT(*)::bigint AS "visits"
      FROM "ClubAttendance"
      WHERE "clubId" = ${clubId} AND "localDate" >= ${windowStart} AND "localDate" <= ${today}
      GROUP BY "localDate"
    `,
    db.$queryRaw<Array<{ week: bigint; month: bigint }>>`
      SELECT
        COUNT(DISTINCT "memberRecordId") FILTER (WHERE "localDate" >= ${uniqueWeekStart})::bigint AS "week",
        COUNT(DISTINCT "memberRecordId")::bigint AS "month"
      FROM "ClubAttendance"
      WHERE "clubId" = ${clubId} AND "localDate" >= ${trendStart} AND "localDate" <= ${today}
    `,
    // "joinedAt" is TIMESTAMP(3) without zone holding UTC: tag it as UTC first, then convert
    // to club-local time. A single AT TIME ZONE would shift the instant the wrong way.
    db.$queryRaw<Array<{ month: string; joined: bigint }>>`
      SELECT to_char(("joinedAt" AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}, 'YYYY-MM') AS "month", COUNT(*)::bigint AS "joined"
      FROM "ClubMemberRecord"
      WHERE "clubId" = ${clubId} AND "joinedAt" >= ${growthCutoff}
      GROUP BY 1
    `,
    db.$queryRaw<Array<{ plan: string; members: bigint }>>`
      SELECT t."planName" AS "plan", COUNT(DISTINCT t."memberRecordId")::bigint AS "members"
      FROM "MemberSubscription" t
      INNER JOIN "ClubMemberRecord" m ON m."id" = t."memberRecordId" AND m."clubId" = t."clubId"
      WHERE t."clubId" = ${clubId} AND m."status" = 'ACTIVE'
        AND t."cancelledAt" IS NULL AND t."startAt" <= ${now} AND t."endAt" > ${now}
      GROUP BY t."planName"
      ORDER BY "members" DESC, t."planName" ASC
      LIMIT 8
    `,
    db.$queryRaw<Array<{ ended: bigint; renewed: bigint }>>`
      SELECT COUNT(*)::bigint AS "ended",
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM "MemberSubscription" n
          WHERE n."clubId" = t."clubId" AND n."memberRecordId" = t."memberRecordId"
            AND n."cancelledAt" IS NULL AND n."endAt" > t."endAt"
        ))::bigint AS "renewed"
      FROM "MemberSubscription" t
      INNER JOIN "ClubMemberRecord" m ON m."id" = t."memberRecordId" AND m."clubId" = t."clubId"
      WHERE t."clubId" = ${clubId} AND m."status" = 'ACTIVE' AND t."cancelledAt" IS NULL
        AND t."endAt" > ${renewalStart} AND t."endAt" <= ${now}
    `,
  ]);

  const visitsByDay = visitRows.map((row) => ({ key: row.day, value: Number(row.visits) }));
  const eightWeeks = fillSeries(lastDays(today, WEEKDAY_WINDOW_WEEKS * 7), visitsByDay);
  const dailyVisits = fillSeries(trendDays, visitsByDay);
  const totalVisits = dailyVisits.reduce((sum, day) => sum + day.value, 0);
  const ended = Number(renewalRows[0]?.ended ?? BigInt(0));
  const renewed = Number(renewalRows[0]?.renewed ?? BigInt(0));

  return {
    today,
    health,
    attendance: {
      daily: dailyVisits,
      totalVisits,
      averagePerDay: Math.round((totalVisits / ATTENDANCE_TREND_DAYS) * 10) / 10,
      uniqueMembersWeek: Number(uniqueRows[0]?.week ?? BigInt(0)),
      uniqueMembersMonth: Number(uniqueRows[0]?.month ?? BigInt(0)),
      weekdays: weekdayTotals(eightWeeks),
    },
    growth: fillSeries(
      growthMonths,
      joinRows.map((row) => ({ key: row.month, value: Number(row.joined) }))
    ),
    plans: planRows.map((row) => ({ plan: row.plan, members: Number(row.members) })),
    renewals: {
      windowDays: RENEWAL_WINDOW_DAYS,
      ended,
      renewed,
      ratePercent: renewalRatePercent(renewed, ended),
    },
    windows: { lapsedDays: LAPSED_WINDOW_DAYS },
  };
}
