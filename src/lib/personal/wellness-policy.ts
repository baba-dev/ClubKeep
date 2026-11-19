import { OnboardingError } from "@/lib/club-onboarding";
import type { PrismaClient } from "@/generated/prisma/client";

// Feature off until production age, privacy and operator gates are accepted.
export function assertWellnessEnabled(): void {
  if (process.env.PERSONAL_WELLNESS_ENABLED !== "true") {
    throw new OnboardingError(503, "Wellness is not enabled yet.");
  }
}

export async function assertWellnessAdult(db: PrismaClient, userId: string, now = new Date()): Promise<void> {
  const profile = await db.personalProfile.findUnique({
    where: { userId },
    select: { birthYear: true },
  });
  // Conservative age rule with birth-year-only profiles; no unsupported guardian flow.
  if (!profile?.birthYear || now.getUTCFullYear() - profile.birthYear < 19) {
    throw new OnboardingError(403, "Adult Personal access is required for this feature.");
  }
}

export function checkedDate(value: string, now = new Date()): Date {
  const when = new Date(value);
  if (!Number.isFinite(when.getTime()) || when.getUTCFullYear() < 2000 || when.getTime() > now.getTime() + 5 * 60_000) {
    throw new OnboardingError(400, "Choose a valid date that is not in the future.");
  }
  return when;
}
