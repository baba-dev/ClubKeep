// Pure rules for Personal body measurements. No I/O and no local imports, so tests can load it directly.
// Storage units (integers only, never floats): weight in grams, body fat in basis points, girths in millimetres.

export const MEASUREMENT_KINDS = [
  "WEIGHT",
  "BODY_FAT",
  "NECK",
  "SHOULDER",
  "CHEST",
  "WAIST",
  "HIP",
  "BICEP_L",
  "BICEP_R",
  "FOREARM_L",
  "FOREARM_R",
  "THIGH_L",
  "THIGH_R",
  "CALF_L",
  "CALF_R",
] as const;
export type MeasurementKind = (typeof MEASUREMENT_KINDS)[number];
export type Units = "METRIC" | "IMPERIAL";

const GRAMS_PER_LB = 453.59237;
const MM_PER_INCH = 25.4;

/** Plausible stored-unit ranges; rejects typos such as 720 kg or 3 cm. */
export const STORED_RANGE: Record<MeasurementKind, { min: number; max: number }> = {
  WEIGHT: { min: 20_000, max: 500_000 },
  BODY_FAT: { min: 200, max: 7_000 },
  NECK: { min: 200, max: 700 },
  SHOULDER: { min: 600, max: 1_800 },
  CHEST: { min: 500, max: 2_000 },
  WAIST: { min: 400, max: 2_000 },
  HIP: { min: 500, max: 2_000 },
  BICEP_L: { min: 100, max: 700 },
  BICEP_R: { min: 100, max: 700 },
  FOREARM_L: { min: 100, max: 600 },
  FOREARM_R: { min: 100, max: 600 },
  THIGH_L: { min: 200, max: 1_100 },
  THIGH_R: { min: 200, max: 1_100 },
  CALF_L: { min: 150, max: 700 },
  CALF_R: { min: 150, max: 700 },
};

export function displayUnit(kind: MeasurementKind, units: Units): string {
  if (kind === "BODY_FAT") return "%";
  if (kind === "WEIGHT") return units === "IMPERIAL" ? "lb" : "kg";
  return units === "IMPERIAL" ? "in" : "cm";
}

/** Converts a user-entered number to stored integer units. Returns null when out of the plausible range. */
export function toStored(kind: MeasurementKind, entered: number, units: Units): number | null {
  if (!Number.isFinite(entered) || entered <= 0) return null;
  let stored: number;
  if (kind === "BODY_FAT") stored = entered * 100;
  else if (kind === "WEIGHT") stored = entered * (units === "IMPERIAL" ? GRAMS_PER_LB : 1000);
  else stored = entered * (units === "IMPERIAL" ? MM_PER_INCH : 10);
  stored = Math.round(stored);
  const { min, max } = STORED_RANGE[kind];
  return stored >= min && stored <= max ? stored : null;
}

/** Converts stored integer units to a number for display, rounded to one decimal place. */
export function fromStored(kind: MeasurementKind, stored: number, units: Units): number {
  let v: number;
  if (kind === "BODY_FAT") v = stored / 100;
  else if (kind === "WEIGHT") v = stored / (units === "IMPERIAL" ? GRAMS_PER_LB : 1000);
  else v = stored / (units === "IMPERIAL" ? MM_PER_INCH : 10);
  return Math.round(v * 10) / 10;
}

/**
 * Body measurements are blocked until birth year is known and the person is clearly an adult.
 * Only the year is stored, so this is deliberately conservative: someone turning 18 this year
 * is treated as a minor until the following year.
 */
export function canLogBodyMeasurements(birthYear: number | null, now: Date): boolean {
  if (birthYear === null) return false;
  return now.getUTCFullYear() - birthYear >= 19;
}
