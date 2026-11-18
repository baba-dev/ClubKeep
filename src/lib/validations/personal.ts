import { z } from "zod";
import { ACTIVITY_KEYS } from "@/lib/personal/muscle-map";
import { MEASUREMENT_KINDS } from "@/lib/personal/measurements";

// Keep in sync with PersonalGoal / PersonalUnits in prisma/schema.prisma.
export const personalGoals = [
  "STRENGTH",
  "ENDURANCE",
  "FLEXIBILITY",
  "WEIGHT_MANAGEMENT",
  "GENERAL_FITNESS",
] as const;

export const updateBioInput = z
  .object({
    displayName: z.string().trim().min(1).max(60).nullable().optional(),
    birthYear: z.number().int().min(1900).max(new Date().getUTCFullYear()).nullable().optional(),
    heightCm: z.number().min(50).max(280).nullable().optional(),
    units: z.enum(["METRIC", "IMPERIAL"]).optional(),
    goal: z.enum(personalGoals).nullable().optional(),
  })
  .strict();

// The entered number is in the user's display units; the server converts and range-checks it.
export const logMeasurementInput = z
  .object({
    kind: z.enum(MEASUREMENT_KINDS),
    value: z.number().positive().max(1000),
    measuredAt: z.iso.datetime().optional(),
  })
  .strict();

export const setActivitiesInput = z
  .object({
    activities: z
      .array(
        z
          .object({
            key: z.enum(ACTIVITY_KEYS as [string, ...string[]]),
            sessionsPerWeek: z.number().int().min(0).max(14),
          })
          .strict()
      )
      .max(ACTIVITY_KEYS.length)
      .refine(
        (xs) => new Set(xs.map((x) => x.key)).size === xs.length,
        "Choose each activity once"
      ),
  })
  .strict();

export const clubSignalConsentInput = z.object({ enabled: z.boolean() }).strict();

export const removeMeasurementInput = z.object({ id: z.string().min(10).max(128) }).strict();
export const clubSignalInput = z
  .object({ clubId: z.string().min(10).max(128), enabled: z.boolean() })
  .strict();
export const deleteAllInput = z.object({ confirm: z.literal(true) }).strict();
