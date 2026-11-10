import { z } from "zod";

export const memberInput = z.object({
  displayName: z.string().trim().min(2).max(100),
  phoneE164: z.union([z.string().regex(/^\+[1-9]\d{7,14}$/), z.literal("")]).optional(),
}).strict();

export const memberEditInput = memberInput;
export const linkMemberInput = z.object({
  membershipId: z.string().trim().min(10).max(128),
}).strict();

export const planInput = z.object({
  name: z.string().trim().min(2).max(90),
  description: z.string().trim().max(500).optional().default(""),
  durationUnit: z.enum(["DAYS", "WEEKS", "MONTHS"]),
  durationCount: z.number().int().min(1).max(1200),
  priceMinor: z.number().int().min(0).max(100000000),
  currency: z.string().regex(/^[A-Z]{3}$/),
}).strict();

export const assignPlanInput = z.object({
  planId: z.string().min(10).max(128),
  startDate: z.iso.date().optional(),
  operationKey: z.uuid(),
}).strict();

export const cancelSubscriptionInput = z.object({
  reason: z.string().trim().min(3).max(240),
}).strict();

export const searchInput = z.string().trim().max(100).default("");
