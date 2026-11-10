import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidClubTimeZone } from "@/lib/attendance-calendar";
import { requireClubActive } from "@/lib/member-service";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";
import { clubTimeZoneInput } from "@/lib/validations/attendance";
import { idInput } from "@/lib/validations/onboarding";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clubId: string }> }
): Promise<Response> {
  try {
    const { clubId } = await context.params;
    if (!idInput.safeParse(clubId).success) return jsonPrivate({ error: "Club not found" }, 404);
    const guard = await guardOnboardingPost(request, "attendance-timezone", 10, true);
    if (!guard.ok) return guard.response;
    const parsed = clubTimeZoneInput.safeParse(await readOnboardingBody(request));
    if (!parsed.success || !isValidClubTimeZone(parsed.data.timeZone))
      return jsonPrivate({ error: "Enter a valid IANA time zone (for example Asia/Kolkata)" }, 400);
    await prisma.$transaction(async (tx) => {
      await requireClubActive(tx, guard.userId!, clubId, ["OWNER"]);
      const changed = await tx.club.updateMany({
        where: { id: clubId, status: "ACTIVE", timeZone: { not: parsed.data.timeZone } },
        data: { timeZone: parsed.data.timeZone },
      });
      if (changed.count)
        await tx.securityEvent.create({
          data: {
            clubId,
            actorUserId: guard.userId!,
            eventType: "CLUB_TIMEZONE_CHANGED",
            referenceId: clubId,
          },
        });
    });
    return jsonPrivate({ ok: true, timeZone: parsed.data.timeZone });
  } catch (error) {
    return onboardingFailure(error);
  }
}
