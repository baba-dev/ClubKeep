import { z } from "zod";
import { ACTIVITY_KEYS } from "@/lib/personal/muscle-map";

const requestId = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
export const wellnessRemoveInput = z.object({ id: z.string().min(10).max(128) }).strict();

export const goalInput = z
  .object({
    title: z.string().trim().min(2).max(80),
    metric: z.enum(["WORKOUT_SESSIONS", "ACTIVITY_MINUTES", "SLEEP_MINUTES", "HYDRATION_ML"]),
    cadence: z.enum(["WEEKLY", "TOTAL"]),
    target: z.number().int().min(1).max(10000000),
    endsAt: timestamp.optional(),
  })
  .strict();
export const goalChangeInput = z
  .object({
    id: z.string().min(10).max(128),
    title: z.string().trim().min(2).max(80).optional(),
    target: z.number().int().min(1).max(10000000).optional(),
    status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
  })
  .strict()
  .refine(
    (v) => v.title !== undefined || v.target !== undefined || v.status !== undefined,
    "No change specified"
  );

export const workoutInput = z
  .object({
    requestId,
    title: z.string().trim().min(2).max(100),
    activityKey: z.enum(ACTIVITY_KEYS as [string, ...string[]]),
    startedAt: timestamp,
    endedAt: timestamp,
    durationMinutes: z.number().int().min(1).max(1440),
    distanceMeters: z.number().int().min(0).max(1000000).optional(),
    notes: z.string().trim().max(500).optional(),
    exercises: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            sets: z
              .array(
                z
                  .object({
                    reps: z.number().int().min(0).max(1000).optional(),
                    weightGrams: z.number().int().min(0).max(1000000).optional(),
                    durationSeconds: z.number().int().min(0).max(86400).optional(),
                    distanceMeters: z.number().int().min(0).max(1000000).optional(),
                  })
                  .strict()
              )
              .min(1)
              .max(30),
          })
          .strict()
      )
      .max(30)
      .default([]),
  })
  .strict();
export const sleepInput = z
  .object({
    requestId,
    startedAt: timestamp,
    endedAt: timestamp,
    quality: z.number().int().min(1).max(5).optional(),
    isNap: z.boolean().default(false),
  })
  .strict();
export const mealInput = z
  .object({
    requestId,
    mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
    eatenAt: timestamp,
    notes: z.string().trim().max(300).optional(),
    items: z
      .array(
        z
          .object({
            name: z.string().trim().min(1).max(100),
            portionGrams: z.number().int().min(1).max(50000).optional(),
            caloriesKcal: z.number().int().min(0).max(50000).optional(),
            proteinGrams: z.number().int().min(0).max(10000).optional(),
            carbsGrams: z.number().int().min(0).max(10000).optional(),
            fatGrams: z.number().int().min(0).max(10000).optional(),
          })
          .strict()
      )
      .min(1)
      .max(20),
  })
  .strict();
export const hydrationInput = z
  .object({
    requestId,
    volumeMl: z.number().int().min(1).max(5000),
    takenAt: timestamp,
  })
  .strict();
export const recoveryInput = z
  .object({
    localDate: z.iso.date(),
    energy: z.number().int().min(1).max(5).optional(),
    soreness: z.number().int().min(1).max(5).optional(),
    stress: z.number().int().min(1).max(5).optional(),
    satisfaction: z.number().int().min(1).max(5).optional(),
    notes: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine(
    (v) =>
      [v.energy, v.soreness, v.stress, v.satisfaction].some((x) => x !== undefined) || !!v.notes,
    "Add at least one check-in observation"
  );

export type GoalInput = z.infer<typeof goalInput>;
export type WorkoutInput = z.infer<typeof workoutInput>;
export type SleepInput = z.infer<typeof sleepInput>;
export type MealInput = z.infer<typeof mealInput>;
export type HydrationInput = z.infer<typeof hydrationInput>;
export type RecoveryInput = z.infer<typeof recoveryInput>;
