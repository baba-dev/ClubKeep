import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { requireLinkedMember } from "@/lib/member-self-service";
import {
  METRICS,
  seasonName,
  supportsMetric,
  threeMonthEnd,
  type CompetitionMetricKey,
} from "@/lib/competition-catalog";

export async function createCompetitionSeason(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: { startDate: string; metrics: CompetitionMetricKey[] }
) {
  const endAt = threeMonthEnd(input.startDate);
  const startAt = new Date(input.startDate + "T00:00:00.000Z");
  if (
    startAt.getTime() < Date.now() - 366 * 86400000 ||
    startAt.getTime() > Date.now() + 366 * 86400000
  )
    throw new OnboardingError(400, "Choose a season within one year of today");
  return db.$transaction(async (tx) => {
    await requireClubActive(tx as PrismaClient, actorId, clubId, ["OWNER", "MANAGER"]);
    // Lock club row before checking overlaps, preventing concurrent season creation races.
    const club = await tx.club.update({
      where: { id: clubId },
      data: { updatedAt: new Date() },
      select: { vertical: true },
    });
    if (input.metrics.some((metric) => !supportsMetric(club.vertical, metric)))
      throw new OnboardingError(400, "Choose metrics for your club's activity type");
    const conflict = await tx.clubSeason.findFirst({
      where: { clubId, startAt: { lt: endAt }, endAt: { gt: startAt } },
      select: { id: true },
    });
    if (conflict) throw new OnboardingError(409, "Another season already uses these dates");
    const season = await tx.clubSeason.create({
      data: { clubId, name: seasonName(startAt), startAt, endAt, createdByUserId: actorId },
      select: { id: true, name: true, startAt: true, endAt: true },
    });
    await tx.clubSeasonMetric.createMany({
      data: input.metrics.map((metric) => ({ clubId, seasonId: season.id, metric })),
    });
    await tx.securityEvent.create({
      data: {
        clubId,
        actorUserId: actorId,
        eventType: "COMPETITION_SEASON_CREATED",
        referenceId: season.id,
      },
    });
    return season;
  });
}

export async function setMyRankingConsent(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  enabled: boolean
) {
  return db.$transaction(async (tx) => {
    const { member } = await requireLinkedMember(tx as PrismaClient, actorId, clubId);
    // Resolve identity on server. A club owner cannot opt another user into leaderboards.
    const where = { clubId_memberRecordId: { clubId, memberRecordId: member.id } };
    const previous = await tx.clubRankingConsent.findUnique({ where, select: { enabled: true } });
    if (previous?.enabled === enabled) return { enabled };
    await tx.clubRankingConsent.upsert({
      where,
      create: {
        clubId,
        memberRecordId: member.id,
        enabled,
        consentedAt: enabled ? new Date() : null,
        changedByUserId: actorId,
      },
      update: { enabled, consentedAt: enabled ? new Date() : null, changedByUserId: actorId },
    });
    await tx.securityEvent.create({
      data: {
        clubId,
        actorUserId: actorId,
        eventType: "COMPETITION_CONSENT_CHANGED",
        referenceId: member.id,
      },
    });
    return { enabled };
  });
}

export async function requireSeasonMetric(
  db: PrismaClient,
  clubId: string,
  metricId: string,
  now = new Date()
) {
  const record = await db.clubSeasonMetric.findFirst({
    where: { id: metricId, clubId, season: { startAt: { lte: now }, endAt: { gt: now } } },
    select: {
      id: true,
      metric: true,
      seasonId: true,
      season: { select: { name: true, startAt: true, endAt: true } },
    },
  });
  if (!record) throw new OnboardingError(409, "No active club competition metric found");
  if (!Object.hasOwn(METRICS, record.metric)) throw new AccessDeniedError();
  return record;
}
