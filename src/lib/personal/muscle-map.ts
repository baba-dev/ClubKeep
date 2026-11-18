// Registry of muscle groups drawn on the Personal body map.
// The ids are stable: the SVG path ids, the activity catalogue and stored data all use them.

export const MUSCLE_GROUPS = [
  { id: "trapezius", label: "Trapezius", side: "back", region: "upper" },
  { id: "deltoid-front", label: "Front deltoid", side: "front", region: "upper" },
  { id: "deltoid-side", label: "Side deltoid", side: "front", region: "upper" },
  { id: "deltoid-rear", label: "Rear deltoid", side: "back", region: "upper" },
  { id: "pectorals", label: "Chest", side: "front", region: "upper" },
  { id: "biceps", label: "Biceps", side: "front", region: "arms" },
  { id: "triceps", label: "Triceps", side: "back", region: "arms" },
  { id: "forearms-front", label: "Forearms (front)", side: "front", region: "arms" },
  { id: "forearms-back", label: "Forearms (back)", side: "back", region: "arms" },
  { id: "abs", label: "Abs", side: "front", region: "core" },
  { id: "obliques", label: "Obliques", side: "front", region: "core" },
  { id: "lats", label: "Lats", side: "back", region: "upper" },
  { id: "lower-back", label: "Lower back", side: "back", region: "core" },
  { id: "glutes", label: "Glutes", side: "back", region: "lower" },
  { id: "hip-flexors", label: "Hip flexors", side: "front", region: "lower" },
  { id: "quadriceps", label: "Quadriceps", side: "front", region: "lower" },
  { id: "adductors", label: "Inner thighs", side: "front", region: "lower" },
  { id: "hamstrings", label: "Hamstrings", side: "back", region: "lower" },
  { id: "tibialis", label: "Shins", side: "front", region: "lower" },
  { id: "calves", label: "Calves", side: "back", region: "lower" },
] as const;

export type MuscleId = (typeof MUSCLE_GROUPS)[number]["id"];
export type MuscleSide = (typeof MUSCLE_GROUPS)[number]["side"];

export const MUSCLE_IDS: readonly MuscleId[] = MUSCLE_GROUPS.map((m) => m.id);

const BY_ID = new Map<string, (typeof MUSCLE_GROUPS)[number]>(MUSCLE_GROUPS.map((m) => [m.id, m]));

export function muscleLabel(id: MuscleId): string {
  return BY_ID.get(id)?.label ?? id;
}

// Curated activities and the muscles they load. Self-declared in v1; club vertical only suggests defaults.
export type ActivityKey =
  | "gym-lifting"
  | "running"
  | "cycling"
  | "swimming"
  | "yoga"
  | "dance"
  | "football"
  | "cricket"
  | "badminton"
  | "tennis"
  | "boxing"
  | "climbing";

export interface ActivityDef {
  key: ActivityKey;
  label: string;
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
}

export const ACTIVITIES: readonly ActivityDef[] = [
  {
    key: "gym-lifting",
    label: "Gym / strength",
    primary: ["pectorals", "lats", "quadriceps", "glutes", "deltoid-front"],
    secondary: ["biceps", "triceps", "hamstrings", "abs", "lower-back", "trapezius"],
  },
  {
    key: "running",
    label: "Running",
    primary: ["quadriceps", "hamstrings", "calves", "glutes"],
    secondary: ["hip-flexors", "tibialis", "abs"],
  },
  {
    key: "cycling",
    label: "Cycling",
    primary: ["quadriceps", "glutes", "calves"],
    secondary: ["hamstrings", "hip-flexors", "lower-back"],
  },
  {
    key: "swimming",
    label: "Swimming",
    primary: ["lats", "deltoid-front", "deltoid-rear", "pectorals"],
    secondary: ["triceps", "abs", "quadriceps", "calves"],
  },
  {
    key: "yoga",
    label: "Yoga",
    primary: ["abs", "hamstrings", "hip-flexors", "lower-back"],
    secondary: ["deltoid-side", "quadriceps", "glutes", "adductors", "triceps"],
  },
  {
    key: "dance",
    label: "Dance",
    primary: ["quadriceps", "calves", "glutes", "abs"],
    secondary: ["hamstrings", "adductors", "obliques", "tibialis"],
  },
  {
    key: "football",
    label: "Football",
    primary: ["quadriceps", "hamstrings", "calves", "hip-flexors"],
    secondary: ["glutes", "adductors", "abs", "tibialis"],
  },
  {
    key: "cricket",
    label: "Cricket",
    primary: ["obliques", "deltoid-side", "forearms-front", "quadriceps"],
    secondary: ["lats", "glutes", "calves", "triceps"],
  },
  {
    key: "badminton",
    label: "Badminton",
    primary: ["deltoid-side", "forearms-front", "quadriceps", "calves"],
    secondary: ["triceps", "obliques", "glutes"],
  },
  {
    key: "tennis",
    label: "Tennis",
    primary: ["forearms-front", "obliques", "deltoid-side", "quadriceps"],
    secondary: ["lats", "glutes", "calves", "triceps"],
  },
  {
    key: "boxing",
    label: "Boxing",
    primary: ["deltoid-front", "triceps", "obliques", "pectorals"],
    secondary: ["abs", "lats", "calves", "forearms-front", "trapezius"],
  },
  {
    key: "climbing",
    label: "Climbing",
    primary: ["lats", "forearms-front", "biceps", "forearms-back"],
    secondary: ["deltoid-rear", "abs", "trapezius", "quadriceps"],
  },
];

export const ACTIVITY_KEYS: readonly ActivityKey[] = ACTIVITIES.map((a) => a.key);

// Club vertical -> suggested activity keys. Suggestion only; nothing is created without the user.
export const VERTICAL_DEFAULTS: Record<string, readonly ActivityKey[]> = {
  GYM: ["gym-lifting"],
  YOGA: ["yoga"],
  DANCE: ["dance"],
};

export const PRIMARY_WEIGHT = 1;
export const SECONDARY_WEIGHT = 0.4;

export interface ActivityFrequency {
  key: ActivityKey;
  /** Sessions per week; clamped to 0..14 so bad input cannot dominate the map. */
  sessionsPerWeek: number;
}

/** Muscle load on a 0..1 scale (1 = the most-loaded muscle for this user). Pure and deterministic. */
export function muscleLoad(inputs: readonly ActivityFrequency[]): Record<MuscleId, number> {
  const raw = Object.fromEntries(MUSCLE_IDS.map((id) => [id, 0])) as Record<MuscleId, number>;
  const byKey = new Map(ACTIVITIES.map((a) => [a.key, a]));

  for (const input of inputs) {
    const def = byKey.get(input.key);
    if (!def) continue;
    const freq = Math.min(
      14,
      Math.max(0, Number.isFinite(input.sessionsPerWeek) ? input.sessionsPerWeek : 0)
    );
    for (const id of def.primary) raw[id] += freq * PRIMARY_WEIGHT;
    for (const id of def.secondary) raw[id] += freq * SECONDARY_WEIGHT;
  }

  const max = Math.max(0, ...Object.values(raw));
  if (max === 0) return raw;
  for (const id of MUSCLE_IDS) raw[id] = Math.round((raw[id] / max) * 1000) / 1000;
  return raw;
}

/** Activities that load a muscle, primary first, for the detail sheet. */
export function activitiesForMuscle(
  id: MuscleId
): { key: ActivityKey; label: string; role: "primary" | "secondary" }[] {
  const out: { key: ActivityKey; label: string; role: "primary" | "secondary" }[] = [];
  for (const a of ACTIVITIES) {
    if (a.primary.includes(id)) out.push({ key: a.key, label: a.label, role: "primary" });
  }
  for (const a of ACTIVITIES) {
    if (a.secondary.includes(id)) out.push({ key: a.key, label: a.label, role: "secondary" });
  }
  return out;
}
