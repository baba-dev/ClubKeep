import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { RecoveryInput } from "@/lib/validations/wellness";
import { localDate } from "./wellness-rules";

export async function listRecovery(db: PrismaClient, userId: string) {
  return db.recoveryCheckIn.findMany({
    where: { userId },
    orderBy: { localDate: "desc" },
    take: 90,
  });
}

export async function saveRecovery(db: PrismaClient, userId: string, input: RecoveryInput) {
  const profile = await db.personalProfile.findUnique({
    where: { userId },
    select: { timezone: true },
  });
  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  if (input.localDate > today || input.localDate < "2000-01-01") {
    throw new OnboardingError(400, "Choose a day that has already started.");
  }
  const data = {
    energy: input.energy,
    soreness: input.soreness,
    stress: input.stress,
    satisfaction: input.satisfaction,
    notes: input.notes,
  };
  const row = await db.recoveryCheckIn.upsert({
    where: { userId_localDate: { userId, localDate: input.localDate } },
    create: { userId, localDate: input.localDate, ...data },
    update: data,
    select: { id: true },
  });
  return { id: row.id };
}
export async function removeRecovery(db: PrismaClient, userId: string, id: string) {
  const row = await db.recoveryCheckIn.deleteMany({ where: { id, userId } });
  if (!row.count) throw new OnboardingError(404, "Check-in not found.");
}
