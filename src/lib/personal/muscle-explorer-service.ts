import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { getOverview } from "./personal-service";
import { muscleTimeline, type MuscleTimeline } from "./muscle-timeline";
import { trainingFromWorkouts, type MuscleTraining } from "./muscle-training";
import { assertWellnessAdult, assertWellnessEnabled } from "./wellness-policy";

export const EXPLORER_WINDOWS = [7, 28, 90] as const;
export type ExplorerWindow = (typeof EXPLORER_WINDOWS)[number];

const MAX_WORKOUTS = 400;
const TIMELINE_DAYS = 28;
const TIMELINE_TRAILING_DAYS = 7;

/**
 * Everything the interactive muscle map needs, for the signed-in user only.
 * `logged` is null whenever the wellness feature is off or the user is not a clear adult: that is the
 * same gate the workout routes use (wellness-policy.ts), reused here so the two cannot drift apart.
 */
export async function getMuscleExplorer(db: PrismaClient, userId: string, now = new Date()) {
  const overview = await getOverview(db, userId, now);
  const result = await loggedTraining(db, userId, now);
  return { overview, logged: result?.windows ?? null, timeline: result?.timeline ?? null };
}

async function loggedTraining(
  db: PrismaClient,
  userId: string,
  now: Date
): Promise<{ windows: Record<ExplorerWindow, MuscleTraining>; timeline: MuscleTimeline } | null> {
  try {
    assertWellnessEnabled();
    await assertWellnessAdult(db, userId, now);
  } catch (error) {
    if (error instanceof OnboardingError) return null;
    throw error;
  }
  const since = new Date(now.getTime() - Math.max(...EXPLORER_WINDOWS) * 86_400_000);
  const rows = await db.workoutSession.findMany({
    where: { userId, endedAt: { gte: since, lte: now } },
    orderBy: { endedAt: "desc" },
    take: MAX_WORKOUTS,
    select: {
      endedAt: true,
      activityKey: true,
      durationMinutes: true,
      exercises: {
        orderBy: { position: "asc" },
        select: {
          name: true,
          sets: {
            select: { reps: true, weightGrams: true, durationSeconds: true, distanceMeters: true },
          },
        },
      },
    },
  });
  const windows = Object.fromEntries(
    EXPLORER_WINDOWS.map((days) => [days, trainingFromWorkouts(rows, days, now)])
  ) as Record<ExplorerWindow, MuscleTraining>;
  return {
    windows,
    timeline: muscleTimeline(rows, TIMELINE_DAYS, TIMELINE_TRAILING_DAYS, now),
  };
}
