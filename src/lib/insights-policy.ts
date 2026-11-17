// Pure rules for B7 owner insights. No database or clock access, so every
// definition here is unit-testable and shared by the overview and insights page.

export const LAPSING_WINDOW_DAYS = 7;
export const LAPSED_WINDOW_DAYS = 30;
export const RENEWAL_WINDOW_DAYS = 30;
export const ATTENDANCE_TREND_DAYS = 28;
export const WEEKDAY_WINDOW_WEEKS = 8;
export const GROWTH_MONTHS = 6;

const DAY_MS = 86_400_000;

export type MemberTermFacts = {
  /** A non-cancelled term covers `now`. */
  activeNow: boolean;
  /** Latest end of any non-cancelled term, or null if the member never had one. */
  lastEnd: Date | null;
};

export type MemberHealth = "ACTIVE" | "LAPSING" | "LAPSED" | "UPCOMING" | "INACTIVE";

/**
 * - ACTIVE: covered now and not ending within the lapsing window.
 * - LAPSING: covered now, and the last term ends within 7 days (no later term).
 * - LAPSED: not covered, last term ended within the past 30 days.
 * - UPCOMING: not covered yet, but a future term exists.
 * - INACTIVE: no term at all, or the last term ended more than 30 days ago.
 */
export function classifyMember(facts: MemberTermFacts, now: Date): MemberHealth {
  const { activeNow, lastEnd } = facts;
  if (activeNow) {
    if (lastEnd && lastEnd.getTime() <= now.getTime() + LAPSING_WINDOW_DAYS * DAY_MS) {
      return "LAPSING";
    }
    return "ACTIVE";
  }
  if (!lastEnd) return "INACTIVE";
  if (lastEnd.getTime() > now.getTime()) return "UPCOMING";
  if (lastEnd.getTime() >= now.getTime() - LAPSED_WINDOW_DAYS * DAY_MS) return "LAPSED";
  return "INACTIVE";
}

/** Whole-number percentage, or null when there is nothing to measure. */
export function renewalRatePercent(renewed: number, ended: number): number | null {
  if (ended <= 0) return null;
  return Math.round((Math.min(renewed, ended) / ended) * 100);
}

function parseDay(day: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid club-local date");
  return Date.parse(day + "T00:00:00Z");
}

/** `count` consecutive YYYY-MM-DD strings ending at `endDay`, oldest first. */
export function lastDays(endDay: string, count: number): string[] {
  const end = parseDay(endDay);
  return Array.from({ length: count }, (_, i) =>
    new Date(end - (count - 1 - i) * DAY_MS).toISOString().slice(0, 10)
  );
}

/** `count` consecutive YYYY-MM strings ending at `endMonth`, oldest first. */
export function lastMonths(endMonth: string, count: number): string[] {
  const match = /^(\d{4})-(\d{2})$/.exec(endMonth);
  if (!match) throw new Error("Invalid club-local month");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(year, monthIndex - (count - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Zero-fill a sparse series so charts never skip empty days or months. */
export function fillSeries(
  keys: readonly string[],
  rows: ReadonlyArray<{ key: string; value: number }>
): Array<{ key: string; value: number }> {
  const byKey = new Map(rows.map((row) => [row.key, row.value]));
  return keys.map((key) => ({ key, value: byKey.get(key) ?? 0 }));
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Visits per weekday (Monday first) from club-local day totals. */
export function weekdayTotals(
  days: ReadonlyArray<{ key: string; value: number }>
): Array<{ label: (typeof WEEKDAY_LABELS)[number]; value: number }> {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  for (const { key, value } of days) {
    const sundayFirst = new Date(parseDay(key)).getUTCDay();
    totals[(sundayFirst + 6) % 7] += value;
  }
  return WEEKDAY_LABELS.map((label, i) => ({ label, value: totals[i] }));
}
