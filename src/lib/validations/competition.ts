import { z } from "zod";

export const createSeasonInput = z
  .object({
    startDate: z.iso.date().refine((date) => date.endsWith("-01"), "A season must start on day 1"),
    metrics: z
      .array(
        z.enum([
          "GYM_STRENGTH_KG",
          "SPORTS_MATCH_POINTS",
          "DANCE_ROUTINE_SCORE",
          "YOGA_PRACTICE_MINUTES",
          "TRAINING_MINUTES",
        ])
      )
      .min(1)
      .max(5)
      .refine((xs) => new Set(xs).size === xs.length, "Choose unique metrics"),
  })
  .strict();
export const rankingConsentInput = z.object({ enabled: z.boolean() }).strict();
export const submitScoreInput = z
  .object({
    seasonMetricId: z
      .string()
      .min(10)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    operationKey: z.uuid(),
    value: z.number().int().min(1).max(1000),
    note: z.string().trim().max(160).optional().default(""),
    memberRecordId: z
      .string()
      .min(10)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
  })
  .strict();
export const decideScoreInput = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
  })
  .strict();
export const createChallengeInput = z
  .object({
    seasonId: z
      .string()
      .min(10)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    title: z.string().trim().min(5).max(90),
    kind: z.enum(["ATTENDANCE", "APPROVED_SCORES"]),
    target: z.number().int().min(1).max(100),
  })
  .strict();
export const challengeJoinInput = z.object({ active: z.boolean() }).strict();
