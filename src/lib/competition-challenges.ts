import type { PrismaClient, ClubChallengeKind } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { requireLinkedMember } from "@/lib/member-self-service";
import { attendanceProgressWhere, approvedScoreProgressWhere } from "@/lib/competition-policy";

export async function createClubChallenge(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: { seasonId: string; title: string; kind: ClubChallengeKind; target: number }
) {
  return db.$transaction(async (tx) => {
    await requireClubActive(tx as PrismaClient, actorId, clubId, ["OWNER", "MANAGER"]);
    const now = new Date();
    const season = await tx.clubSeason.findFirst({
      where: { id: input.seasonId, clubId, endAt: { gt: now } },
      select: { id: true, startAt: true, endAt: true },
    });
    if (!season) throw new OnboardingError(409, "Select a current or upcoming club season");
    const challenge = await tx.clubChallenge.create({
      data: {
        clubId,
        seasonId: season.id,
        title: input.title,
        kind: input.kind,
        target: input.target,
        startAt: season.startAt,
        endAt: season.endAt,
        createdByUserId: actorId,
      },
      select: { id: true },
    });
    await tx.securityEvent.create({
      data: {
        clubId,
        actorUserId: actorId,
        eventType: "CLUB_CHALLENGE_CREATED",
        referenceId: challenge.id,
      },
    });
    return challenge;
  });
}

export async function setMyChallengeParticipation(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  challengeId: string,
  active: boolean
) {
  return db.$transaction(async (tx) => {
    const { member } = await requireLinkedMember(tx as PrismaClient, actorId, clubId);
    const challenge = await tx.clubChallenge.findFirst({
      where: { id: challengeId, clubId },
      select: { id: true, endAt: true },
    });
    if (!challenge) throw new OnboardingError(404, "Club challenge not found");
    if (active && challenge.endAt <= new Date())
      throw new OnboardingError(409, "This challenge has already ended");
    const where = {
      clubId_challengeId_memberRecordId: {
        clubId,
        challengeId,
        memberRecordId: member.id,
      },
    };
    const previous = await tx.clubChallengeEntry.findUnique({ where, select: { active: true } });
    if (previous?.active === active) return { active };
    await tx.clubChallengeEntry.upsert({
      where,
      create: { clubId, challengeId, memberRecordId: member.id, active },
      update: { active, ...(active ? { joinedAt: new Date() } : {}) },
    });
    await tx.securityEvent.create({
      data: {
        clubId,
        actorUserId: actorId,
        eventType: active ? "CLUB_CHALLENGE_JOINED" : "CLUB_CHALLENGE_LEFT",
        referenceId: challengeId,
      },
    });
    return { active };
  });
}

export async function myChallengeProgress(
  db: PrismaClient,
  clubId: string,
  memberRecordId: string,
  challenge: {
    id: string;
    seasonId: string;
    kind: ClubChallengeKind;
    target: number;
    startAt: Date;
    endAt: Date;
  },
  joinedAt: Date
) {
  const from = joinedAt > challenge.startAt ? joinedAt : challenge.startAt;
  if (from >= challenge.endAt) return { progress: 0, completed: false };
  const progress =
    challenge.kind === "ATTENDANCE"
      ? await db.clubAttendance.count({
          where: attendanceProgressWhere(clubId, memberRecordId, from, challenge.endAt),
        })
      : await db.clubScore.count({
          where: approvedScoreProgressWhere(
            clubId,
            memberRecordId,
            challenge.seasonId,
            from,
            challenge.endAt
          ),
        });
  return {
    progress: Math.min(progress, challenge.target),
    completed: progress >= challenge.target,
  };
}
