import { z } from "zod";
import { idInput } from "@/lib/validations/onboarding";

export const checkInInput = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("QR"),
      token: z
        .string()
        .min(80)
        .max(320)
        .regex(/^ck1\.[A-Za-z0-9_.-]+$/),
    })
    .strict(),
  z
    .object({
      method: z.literal("MANUAL"),
      memberRecordId: idInput,
      overrideReason: z.string().trim().min(8).max(240).optional(),
    })
    .strict(),
]);

export type CheckInInput = z.infer<typeof checkInInput>;

export const attendanceSearch = z
  .object({
    q: z.string().trim().min(2).max(80),
  })
  .strict();

export const clubTimeZoneInput = z
  .object({
    timeZone: z.string().trim().min(2).max(64),
  })
  .strict();
