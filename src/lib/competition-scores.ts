import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { requireLinkedMember } from "@/lib/member-self-service";
import { requireSeasonMetric } from "@/lib/competition-service";
import { validScore } from "@/lib/competition-catalog";
import type { z } from "zod";
import type { submitScoreInput } from "@/lib/validations/competition";

type ScoreInput = z.infer<typeof submitScoreInput>;
function uniqueError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function submitClubScore(db: PrismaClient, actorId: string, clubId: string, input: ScoreInput) {
  try {
    return await db.$transaction(async (tx) => {
      let memberRecordId: string;
      if (input.memberRecordId) {
        await requireClubActive(tx as PrismaClient, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
        memberRecordId = input.memberRecordId;
      } else {
        const ctx = await requireLinkedMember(tx as PrismaClient, actorId, clubId);
        memberRecordId = ctx.member.id;
      }
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "ClubMemberRecord" WHERE "clubId"=${clubId}
          AND "id"=${memberRecordId} AND "status"='ACTIVE' FOR UPDATE
      `;
      if (locked.length !== 1) throw new AccessDeniedError();
      const metric = await requireSeasonMetric(tx as PrismaClient, clubId, input.seasonMetricId);
      if (!validScore(metric.metric, input.value))
        throw new OnboardingError(400, "Score is outside the permitted range for this activity");
      const previous = await tx.clubScore.findUnique({ where: { operationKey: input.operationKey } });
      if (previous) {
        if (previous.clubId !== clubId || previous.memberRecordId !== memberRecordId ||
            previous.seasonMetricId !== metric.id || previous.submittedByUserId !== actorId ||
            previous.value !== input.value || (previous.note ?? "") !== input.note)
          throw new OnboardingError(409, "Submission key already used for a different score");
        return { id: previous.id, status: previous.status, repeated: true };
      }
      const pending = await tx.clubScore.findFirst({
        where: { clubId, memberRecordId, seasonMetricId: metric.id, status: "PENDING" },
        select: { id: true },
      });
      if (pending) throw new OnboardingError(409, "A score is already awaiting verification");
      const record = await tx.clubScore.create({
        data: {
          clubId, seasonMetricId: metric.id, memberRecordId, value: input.value,
          note: input.note || null, operationKey: input.operationKey, submittedByUserId: actorId,
        },
        select: { id: true, status: true },
      });
      await tx.securityEvent.create({
        data: { clubId, actorUserId: actorId, eventType: "COMPETITION_SCORE_SUBMITTED", referenceId: record.id },
      });
      return { ...record, repeated: false };
    });
  } catch (e) {
    if (uniqueError(e)) throw new OnboardingError(409, "A score is already pending or the operation key was reused");
    throw e;
  }
}

/** Club-only review, one-way decisions, verified best-score materialization. */
export async function reviewClubScore(
  db: PrismaClient, actorId: string, clubId: string,
  scoreId: string, decision: "APPROVED" | "REJECTED"
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx as PrismaClient, actorId, clubId, ["OWNER", "MANAGER"]);
    const locked = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "ClubScore" WHERE "clubId"=${clubId}
        AND "id"=${scoreId} AND "status"='PENDING' FOR UPDATE
    `;
    if (locked.length !== 1) throw new OnboardingError(409, "Score already reviewed or unavailable");
    const score = await tx.clubScore.findFirst({
      where: { clubId, id: scoreId, status: "PENDING" },
      select: {
        id: true, seasonMetricId: true, memberRecordId: true, value: true,
        submittedByUserId: true,
      },
    });
    if (!score) throw new OnboardingError(409, "Score already reviewed");
    if (decision === "APPROVED" && score.submittedByUserId === actorId)
      throw new AccessDeniedError(); // No self-approval, even for club owners.
    const active = await tx.clubMemberRecord.findFirst({
      where: { clubId, id: score.memberRecordId, status: "ACTIVE" },
      select: { id: true },
    });
    if (!active) throw new OnboardingError(409, "Archived members cannot receive new verified scores");
    const now = new Date();
    const update = await tx.clubScore.updateMany({
      where: { clubId, id: scoreId, status: "PENDING" },
      data: { status: decision, decidedByUserId: actorId, decidedAt: now },
    });
    if (update.count !== 1) throw new OnboardingError(409, "Score no longer pending");
    if (decision === "APPROVED") {
      // Serialize concurrent best-score updates per member, even across metrics.
      const lockMember = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "ClubMemberRecord" WHERE "clubId"=${clubId}
          AND "id"=${score.memberRecordId} FOR UPDATE
      `;
      if (lockMember.length !== 1) throw new AccessDeniedError();
      const where = { clubId_seasonMetricId_memberRecordId: {
        clubId, seasonMetricId: score.seasonMetricId, memberRecordId: score.memberRecordId,
      }};
      const best = await tx.clubLeaderboardBest.findUnique({ where, select: { value: true } });
      if (!best) {
        await tx.clubLeaderboardBest.create({ data: {
          clubId, seasonMetricId: score.seasonMetricId, memberRecordId: score.memberRecordId,
          scoreId, value: score.value, approvedAt: now,
        }});
      } else if (score.value > best.value) {
        await tx.clubLeaderboardBest.update({ where, data: {
          scoreId, value: score.value, approvedAt: now,
        }});
      }
    }
    await tx.securityEvent.create({
      data: { clubId, actorUserId: actorId, eventType: "COMPETITION_SCORE_REVIEWED", referenceId: scoreId },
    });
    return { id: scoreId, status: decision };
  });
}
