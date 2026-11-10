import type { PlanDurationUnit } from "@/generated/prisma/client";

export function utcDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid date");
  const parsed = new Date(date + "T00:00:00.000Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date)
    throw new Error("Invalid date");
  return parsed;
}

export function utcToday(now = new Date()): Date {
  return utcDate(now.toISOString().slice(0, 10));
}

/** Exclusive end date; a term beginning 31 Jan for one month ends 28 Feb / 29 Feb. */
export function termEnd(start: Date, unit: PlanDurationUnit, count: number): Date {
  if (!Number.isInteger(count) || count < 1 || count > 1200) throw new Error("Invalid term length");
  const end = new Date(start);
  if (unit === "DAYS" || unit === "WEEKS") {
    end.setUTCDate(end.getUTCDate() + count * (unit === "WEEKS" ? 7 : 1));
  } else if (unit === "MONTHS") {
    const originalDay = end.getUTCDate();
    end.setUTCDate(1);
    end.setUTCMonth(end.getUTCMonth() + count);
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
    end.setUTCDate(Math.min(originalDay, last));
  } else {
    throw new Error("Invalid duration");
  }
  return end;
}

export function statusForTerm(
  term: { startAt: Date; endAt: Date; cancelledAt?: Date | null } | null,
  today = utcToday()
): "NONE" | "CANCELLED" | "SCHEDULED" | "ACTIVE" | "EXPIRING" | "EXPIRED" {
  if (!term) return "NONE";
  if (term.cancelledAt) return "CANCELLED";
  if (today < term.startAt) return "SCHEDULED";
  if (today >= term.endAt) return "EXPIRED";
  const days = Math.ceil((term.endAt.getTime() - today.getTime()) / 86400000);
  return days <= 7 ? "EXPIRING" : "ACTIVE";
}
