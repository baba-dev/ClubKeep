import { z } from "zod";

export const recordClubPaymentInput = z
  .object({
    memberId: z.string().trim().min(10).max(128),
    subscriptionId: z.string().trim().min(10).max(128),
    operationKey: z.uuid(),
    amountMinor: z.number().int().min(1).max(100000000),
    method: z.enum(["CASH", "UPI", "CARD", "OTHER"]),
    externalReference: z.string().trim().max(120).optional().default(""),
    note: z.string().trim().max(240).optional().default(""),
  })
  .strict();
export const reverseClubPaymentInput = z
  .object({ reason: z.string().trim().min(8).max(240) })
  .strict();
export type RecordClubPaymentInput = z.infer<typeof recordClubPaymentInput>;
