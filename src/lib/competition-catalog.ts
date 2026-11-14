import type { ClubVertical } from "@/generated/prisma/client";

/** Strict non-clinical achievement catalogue; no body measurements or private Personal data. */
export const METRICS = {
  GYM_STRENGTH_KG: {
    label: "Strength lift",
    unit: "kg",
    min: 1,
    max: 500,
    verticals: ["GYM"],
    explanation: "Best staff-verified whole-kilogram lift; no body-weight ratio.",
  },
  SPORTS_MATCH_POINTS: {
    label: "Match points",
    unit: "pts",
    min: 1,
    max: 1000,
    verticals: ["SPORTS"],
    explanation: "Points confirmed by your club from a match or event.",
  },
  DANCE_ROUTINE_SCORE: {
    label: "Routine score",
    unit: "pts",
    min: 1,
    max: 100,
    verticals: ["DANCE"],
    explanation: "Score issued by club judging; not an AI body assessment.",
  },
  YOGA_PRACTICE_MINUTES: {
    label: "Guided practice",
    unit: "min",
    min: 1,
    max: 240,
    verticals: ["YOGA"],
    explanation: "Staff-verified supervised class duration.",
  },
  TRAINING_MINUTES: {
    label: "Training duration",
    unit: "min",
    min: 1,
    max: 600,
    verticals: ["GYM", "SPORTS", "YOGA", "DANCE", "OTHER"],
    explanation: "Verified training duration; no heart rate or health inference.",
  },
} as const;

export type CompetitionMetricKey = keyof typeof METRICS;
export const METRIC_KEYS = Object.keys(METRICS) as CompetitionMetricKey[];
export function supportsMetric(vertical: ClubVertical, metric: CompetitionMetricKey): boolean {
  return (METRICS[metric].verticals as readonly string[]).includes(vertical);
}
export function validScore(metric: CompetitionMetricKey, score: number): boolean {
  const rule = METRICS[metric];
  return Number.isSafeInteger(score) && score >= rule.min && score <= rule.max;
}
/** Explicit club-selected season start, exclusive end three calendar months later. */
export function threeMonthEnd(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid season date");
  const start = new Date(date + "T00:00:00.000Z");
  if (Number.isNaN(start.getTime()) || start.toISOString().slice(0, 10) !== date)
    throw new Error("Invalid season date");
  if (start.getUTCDate() !== 1) throw new Error("A season must begin on day 1 of a month");
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 3);
  return end;
}
export function seasonName(start: Date): string {
  return (
    new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(
      start
    ) +
    " — " +
    new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(
      new Date(start.getTime() + 76 * 86400000)
    )
  );
}
