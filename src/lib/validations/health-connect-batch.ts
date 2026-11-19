import { z } from "zod";
export const healthRecordTypes = [
  "STEPS_DAILY", "WORKOUT", "SLEEP", "ACTIVE_CALORIES", "HYDRATION",
] as const;
export type HealthRecordType = (typeof healthRecordTypes)[number];
const kind = z.enum(healthRecordTypes);
const stableId = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_.:@\/-]+$/);
const source = z.string().min(2).max(160).regex(/^[a-zA-Z0-9_.-]+$/);
export const healthRecordInput = z.object({
  recordType: kind,
  externalId: stableId,
  sourcePackage: source,
  startedAt: z.iso.datetime({ offset: true }),
  endedAt: z.iso.datetime({ offset: true }),
  value: z.number().int().min(0).max(5000000).optional(),
  exerciseType: z.number().int().min(0).max(100000).optional(),
}).strict();
export const healthDeletionInput = z.object({
  recordType: kind, externalId: stableId, sourcePackage: source,
}).strict();
export const healthBatchInput = z.object({
  requestId: z.uuid(),
  grantedTypes: z.array(kind).max(5).refine(v => new Set(v).size === v.length),
  records: z.array(healthRecordInput).max(80).default([]),
  deletions: z.array(healthDeletionInput).max(80).default([]),
}).strict().superRefine((v, ctx) => {
  if (v.records.length + v.deletions.length > 80) {
    ctx.addIssue({ code: "custom", message: "Batch size exceeded" });
  }
  const ids = new Set<string>();
  for (const item of [...v.records, ...v.deletions]) {
    const key = item.recordType + ":" + item.sourcePackage + ":" + item.externalId;
    if (ids.has(key)) ctx.addIssue({ code: "custom", message: "Duplicate source record in batch" });
    ids.add(key);
  }
  for (const item of v.records) {
    if (!v.grantedTypes.includes(item.recordType))
      ctx.addIssue({ code: "custom", message: "Record type has not been reported as granted" });
    const a = Date.parse(item.startedAt), b = Date.parse(item.endedAt);
    const maxHours = item.recordType === "STEPS_DAILY" ? 26 : 24;
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a ||
      b - a > maxHours * 3600000 || a < Date.UTC(2000, 0, 1) || b > Date.now() + 5 * 60000)
      ctx.addIssue({ code: "custom", message: "Invalid record time range" });
    if (item.recordType === "STEPS_DAILY" &&
      (item.sourcePackage !== "health-connect-aggregate" || item.value === undefined || item.exerciseType !== undefined))
      ctx.addIssue({ code: "custom", message: "Step totals must come from the Health Connect aggregate API" });
    if (["HYDRATION", "ACTIVE_CALORIES"].includes(item.recordType) &&
      (item.value === undefined || item.exerciseType !== undefined))
      ctx.addIssue({ code: "custom", message: "A measured value is required" });
    if (item.recordType === "HYDRATION" && item.value !== undefined && item.value > 5000)
      ctx.addIssue({ code: "custom", message: "Hydration entry too large" });
    if (["WORKOUT", "SLEEP"].includes(item.recordType) && item.value !== undefined)
      ctx.addIssue({ code: "custom", message: "Duration is derived from timestamps" });
    if (item.recordType !== "WORKOUT" && item.exerciseType !== undefined)
      ctx.addIssue({ code: "custom", message: "Exercise type applies only to workouts" });
  }
});
export type HealthBatchInput = z.infer<typeof healthBatchInput>;
