import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { WorkoutInput } from "@/lib/validations/wellness";
import { checkedDate } from "./wellness-policy";

export async function listWorkouts(db: PrismaClient, userId: string) {
  return db.workoutSession.findMany({
    where: { userId },
    orderBy: { endedAt: "desc" },
    take: 100,
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { sets: { orderBy: { position: "asc" } } },
      },
    },
  });
}

export async function createWorkout(db: PrismaClient, userId: string, input: WorkoutInput) {
  const startedAt = checkedDate(input.startedAt);
  const endedAt = checkedDate(input.endedAt);
  const measured = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000);
  if (measured <= 0 || measured > 1440 || Math.abs(measured - input.durationMinutes) > 1) {
    throw new OnboardingError(400, "Workout duration must match start and finish times.");
  }
  const existing = await db.workoutSession.findUnique({
    where: { userId_requestId: { userId, requestId: input.requestId } },
  });
  if (existing) return { id: existing.id, replayed: true };
  try {
    const row = await db.workoutSession.create({
      data: {
        userId,
        requestId: input.requestId,
        title: input.title,
        activityKey: input.activityKey,
        startedAt,
        endedAt,
        durationMinutes: measured,
        distanceMeters: input.distanceMeters,
        notes: input.notes,
        source: "MANUAL",
        exercises: {
          create: input.exercises.map((e, position) => ({
            name: e.name,
            position,
            sets: { create: e.sets.map((s, index) => ({ ...s, position: index })) },
          })),
        },
      },
      select: { id: true },
    });
    return { id: row.id, replayed: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const row = await db.workoutSession.findUnique({
        where: { userId_requestId: { userId, requestId: input.requestId } },
      });
      if (row) return { id: row.id, replayed: true };
    }
    throw error;
  }
}

export async function removeWorkout(db: PrismaClient, userId: string, id: string) {
  const deleted = await db.workoutSession.deleteMany({ where: { id, userId } });
  if (!deleted.count) throw new OnboardingError(404, "Workout not found.");
}
