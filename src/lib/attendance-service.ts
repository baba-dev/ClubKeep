import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { requireClubActive } from "@/lib/member-service";
import { clubLocalDate } from "@/lib/attendance-calendar";
import { verifyAttendanceQr } from "@/lib/attendance-token";
import type { CheckInInput } from "@/lib/validations/attendance";

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

/**
 * Authoritative, once-per-day check-in. No membership or tenant identifiers
 * from the QR bypass server-side club/role/roster/active-plan checks.
 * One record per club, roster member and club-local civil date.
 */
export async function recordAttendance(
  db: PrismaClient,
  actorId: string,
  clubId: string,
  input: CheckInInput,
  secret: string,
  now = new Date()
) {
  const signed =
    input.method === "QR" ? verifyAttendanceQr(input.token, clubId, secret, now.getTime()) : null;
  if (input.method === "QR" && !signed)
    throw new OnboardingError(
      400,
      "The QR has expired or is not valid for this club. Ask the member to refresh it."
    );
  const memberRecordId =
    signed?.memberRecordId ?? (input.method === "MANUAL" ? input.memberRecordId : "");
  try {
    return await db.$transaction(async (tx) => {
      const actor = await requireClubActive(tx, actorId, clubId, ["OWNER", "MANAGER", "STAFF"]);
      const club = await tx.club.findFirst({
        where: { id: clubId, status: "ACTIVE" },
        select: { timeZone: true },
      });
      if (!club) throw new OnboardingError(404, "Club not available");
      // Serialize member archive/subscription edits against entry validation.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "ClubMemberRecord"
        WHERE "clubId" = ${clubId} AND "id" = ${memberRecordId} AND "status" = 'ACTIVE'
        FOR UPDATE
      `;
      if (locked.length !== 1) throw new OnboardingError(404, "Member not found or inactive");
      const member = await tx.clubMemberRecord.findFirst({
        where: { id: memberRecordId, clubId, status: "ACTIVE" },
        select: {
          displayName: true,
          memberNumber: true,
          membership: { select: { role: true, status: true } },
        },
      });
      if (!member) throw new OnboardingError(404, "Member not available");
      if (
        input.method === "QR" &&
        (member.membership?.role !== "MEMBER" || member.membership?.status !== "ACTIVE")
      )
        throw new OnboardingError(403, "QR membership account is no longer active");

      const validTerm = await tx.memberSubscription.findFirst({
        where: {
          clubId,
          memberRecordId,
          cancelledAt: null,
          startAt: { lte: now },
          endAt: { gt: now },
        },
        select: { id: true },
      });
      let overrideReason: string | null = null;
      if (!validTerm) {
        if (input.method !== "MANUAL" || !input.overrideReason)
          throw new OnboardingError(
            409,
            "Membership expired or not assigned. Ask a manager to review before admitting."
          );
        if (!["OWNER", "MANAGER"].includes(actor.role))
          throw new OnboardingError(
            403,
            "Only an owner or manager can override an inactive membership"
          );
        overrideReason = input.overrideReason;
      } else if (input.method === "MANUAL" && input.overrideReason) {
        throw new OnboardingError(400, "Override is only available for inactive memberships");
      }

      const localDate = clubLocalDate(now, club.timeZone);
      const entry = await tx.clubAttendance.create({
        data: {
          clubId,
          memberRecordId,
          localDate,
          checkedInAt: now,
          method: input.method,
          checkedInByUserId: actorId,
          overrideReason,
        },
        select: { id: true, localDate: true, checkedInAt: true, method: true },
      });
      return {
        ...entry,
        member: { displayName: member.displayName, memberNumber: member.memberNumber },
        overridden: overrideReason !== null,
      };
    });
  } catch (error) {
    if (isUniqueViolation(error))
      throw new OnboardingError(409, "Already checked in for this club day");
    throw error;
  }
}
