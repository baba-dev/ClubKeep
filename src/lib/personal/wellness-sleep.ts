import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { SleepInput } from "@/lib/validations/wellness";
import { checkedDate } from "./wellness-policy";
import { sleepMinutes } from "./wellness-rules";

export async function listSleep(db: PrismaClient, userId: string) {
  return db.sleepSession.findMany({ where: { userId }, orderBy: { endedAt: "desc" }, take: 100 });
}

export async function recordSleep(db: PrismaClient, userId: string, input: SleepInput) {
  const startedAt = checkedDate(input.startedAt);
  const endedAt = checkedDate(input.endedAt);
  const minutes = sleepMinutes(startedAt, endedAt);
  if (minutes < 1 || minutes >= 1440) {
    throw new OnboardingError(400, "Sleep must be between one minute and under 24 hours.");
  }
  const existing = await db.sleepSession.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
  if (existing) return { id: existing.id, replayed: true };
  try {
    const row = await db.sleepSession.create({
      data: { userId, requestId: input.requestId, startedAt, endedAt,
        quality: input.quality, isNap: input.isNap, source: "MANUAL" },
      select: { id: true },
    });
    return { id: row.id, replayed: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const row = await db.sleepSession.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
      if (row) return { id: row.id, replayed: true };
    }
    throw error;
  }
}

export async function removeSleep(db: PrismaClient, userId: string, id: string) {
  const deleted = await db.sleepSession.deleteMany({ where: { id, userId } });
  if (!deleted.count) throw new OnboardingError(404, "Sleep record not found.");
}
