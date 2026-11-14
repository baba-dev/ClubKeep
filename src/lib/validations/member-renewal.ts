import { z } from "zod";
export const newRenewalRequestInput = z.object({
  operationKey: z.string().uuid(),
  message: z.string().trim().max(300).optional().default(""),
}).strict();
export const renewalDecisionInput = z.object({
  decision: z.enum(["RESOLVED", "DECLINED"]),
}).strict();
