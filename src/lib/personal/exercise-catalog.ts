import type { MuscleId } from "./muscle-map";

// Maps a logged exercise name (free text) to the muscles it trains. Matching is deliberately simple and
// explainable: lower-cased words, keyword must start at a word boundary, the longest keyword wins.
// Unmatched names are reported back to the user instead of being guessed at.
export interface ExerciseDef {
  key: string;
  label: string;
  keywords: readonly string[];
  primary: readonly MuscleId[];
  secondary: readonly MuscleId[];
}

export const EXERCISES: readonly ExerciseDef[] = [
  {
    key: "bench-press",
    label: "Bench press",
    keywords: ["bench press", "chest press", "incline press", "decline press"],
    primary: ["pectorals"],
    secondary: ["deltoid-front", "triceps"],
  },
  {
    key: "push-up",
    label: "Push-up",
    keywords: ["push up", "pushup", "press up"],
    primary: ["pectorals"],
    secondary: ["triceps", "deltoid-front", "abs", "serratus"],
  },
  {
    key: "chest-fly",
    label: "Chest fly",
    keywords: ["chest fly", "pec fly", "pec deck", "cable fly", "dumbbell fly", "crossover"],
    primary: ["pectorals"],
    secondary: ["deltoid-front"],
  },
  {
    key: "dip",
    label: "Dip",
    keywords: ["dip"],
    primary: ["triceps", "pectorals"],
    secondary: ["deltoid-front"],
  },
  {
    key: "overhead-press",
    label: "Overhead press",
    keywords: ["overhead press", "shoulder press", "military press", "arnold press", "push press"],
    primary: ["deltoid-front", "deltoid-side"],
    secondary: ["triceps", "trapezius"],
  },
  {
    key: "lateral-raise",
    label: "Lateral raise",
    keywords: ["lateral raise", "side raise"],
    primary: ["deltoid-side"],
    secondary: ["trapezius"],
  },
  {
    key: "front-raise",
    label: "Front raise",
    keywords: ["front raise"],
    primary: ["deltoid-front"],
    secondary: ["deltoid-side"],
  },
  {
    key: "rear-delt",
    label: "Rear delt work",
    keywords: ["rear delt", "reverse fly", "rear fly", "face pull"],
    primary: ["deltoid-rear"],
    secondary: ["trapezius", "rhomboids"],
  },
  {
    key: "shrug",
    label: "Shrug",
    keywords: ["shrug"],
    primary: ["trapezius"],
    secondary: ["forearms-back", "rhomboids", "neck"],
  },
  {
    key: "pull-up",
    label: "Pull-up",
    keywords: ["pull up", "pullup", "chin up", "chinup"],
    primary: ["lats"],
    secondary: ["biceps", "deltoid-rear", "forearms-front"],
  },
  {
    key: "lat-pulldown",
    label: "Lat pulldown",
    keywords: ["lat pulldown", "pulldown", "pull down"],
    primary: ["lats"],
    secondary: ["biceps", "deltoid-rear"],
  },
  {
    key: "row",
    label: "Row",
    keywords: ["row"],
    primary: ["lats", "rhomboids"],
    secondary: ["biceps", "deltoid-rear", "lower-back", "trapezius"],
  },
  {
    key: "deadlift",
    label: "Deadlift",
    keywords: ["deadlift"],
    primary: ["glutes", "hamstrings", "lower-back"],
    secondary: ["trapezius", "forearms-front", "quadriceps", "lats", "rhomboids"],
  },
  {
    key: "romanian-deadlift",
    label: "Romanian deadlift",
    keywords: ["romanian deadlift", "rdl", "stiff leg", "good morning"],
    primary: ["hamstrings", "glutes"],
    secondary: ["lower-back"],
  },
  {
    key: "squat",
    label: "Squat",
    keywords: ["squat"],
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "adductors", "lower-back", "abs"],
  },
  {
    key: "lunge",
    label: "Lunge",
    keywords: ["lunge", "split squat", "step up"],
    primary: ["quadriceps", "glutes"],
    secondary: ["hamstrings", "adductors", "calves", "hip-abductors"],
  },
  {
    key: "leg-press",
    label: "Leg press",
    keywords: ["leg press", "hack squat"],
    primary: ["quadriceps"],
    secondary: ["glutes", "adductors"],
  },
  {
    key: "leg-extension",
    label: "Leg extension",
    keywords: ["leg extension"],
    primary: ["quadriceps"],
    secondary: [],
  },
  {
    key: "leg-curl",
    label: "Leg curl",
    keywords: ["leg curl", "hamstring curl", "nordic"],
    primary: ["hamstrings"],
    secondary: ["calves"],
  },
  {
    key: "hip-thrust",
    label: "Hip thrust",
    keywords: ["hip thrust", "glute bridge", "glute kickback"],
    primary: ["glutes"],
    secondary: ["hamstrings"],
  },
  {
    key: "adductor",
    label: "Inner thigh work",
    keywords: ["adductor", "hip adduction", "copenhagen"],
    primary: ["adductors"],
    secondary: [],
  },
  {
    key: "calf-raise",
    label: "Calf raise",
    keywords: ["calf raise", "calf press", "heel raise", "donkey calf"],
    primary: ["calves"],
    secondary: ["soleus"],
  },
  {
    key: "tibialis",
    label: "Shin work",
    keywords: ["tibialis", "toe raise"],
    primary: ["tibialis"],
    secondary: [],
  },
  {
    key: "biceps-curl",
    label: "Curl",
    keywords: ["curl", "bicep", "biceps"],
    primary: ["biceps"],
    secondary: ["forearms-front"],
  },
  {
    key: "wrist-curl",
    label: "Forearm work",
    keywords: ["wrist curl", "reverse curl", "dead hang", "grip"],
    primary: ["forearms-front", "forearms-back"],
    secondary: [],
  },
  {
    key: "triceps",
    label: "Triceps work",
    keywords: [
      "tricep",
      "triceps",
      "pushdown",
      "skull crusher",
      "skullcrusher",
      "close grip bench",
    ],
    primary: ["triceps"],
    secondary: [],
  },
  {
    key: "crunch",
    label: "Crunch",
    keywords: ["crunch", "sit up", "situp", "ab wheel", "ab rollout"],
    primary: ["abs"],
    secondary: ["obliques", "hip-flexors"],
  },
  {
    key: "plank",
    label: "Plank",
    keywords: ["plank", "hollow", "dead bug", "mountain climber"],
    primary: ["abs"],
    secondary: ["obliques", "deltoid-front", "lower-back", "serratus"],
  },
  {
    key: "leg-raise",
    label: "Leg raise",
    keywords: ["leg raise", "knee raise", "hanging raise", "v up"],
    primary: ["abs", "hip-flexors"],
    secondary: [],
  },
  {
    key: "oblique",
    label: "Oblique work",
    keywords: [
      "russian twist",
      "woodchop",
      "wood chop",
      "side bend",
      "pallof",
      "side plank",
      "oblique",
    ],
    primary: ["obliques"],
    secondary: ["abs"],
  },
  {
    key: "back-extension",
    label: "Back extension",
    keywords: ["back extension", "hyperextension", "superman", "reverse hyper"],
    primary: ["lower-back"],
    secondary: ["glutes", "hamstrings"],
  },
  {
    key: "carry",
    label: "Carry",
    keywords: ["farmer", "suitcase carry", "carry"],
    primary: ["forearms-front", "trapezius"],
    secondary: ["obliques", "abs"],
  },
  {
    key: "kettlebell-swing",
    label: "Kettlebell swing",
    keywords: ["kettlebell swing", "swing"],
    primary: ["glutes", "hamstrings"],
    secondary: ["lower-back", "deltoid-front", "abs"],
  },
  {
    key: "olympic",
    label: "Olympic lift",
    keywords: ["power clean", "hang clean", "clean", "snatch", "thruster"],
    primary: ["quadriceps", "glutes", "trapezius"],
    secondary: ["hamstrings", "deltoid-front", "lower-back"],
  },
  {
    key: "seated-calf-raise",
    label: "Seated calf raise",
    keywords: ["seated calf"],
    primary: ["soleus"],
    secondary: ["calves"],
  },
  {
    key: "hip-abduction",
    label: "Hip abduction",
    keywords: ["abduction", "lateral band walk", "monster walk", "clamshell", "side leg raise"],
    primary: ["hip-abductors"],
    secondary: ["glutes"],
  },
  {
    key: "neck-work",
    label: "Neck work",
    keywords: ["neck curl", "neck extension", "neck bridge"],
    primary: ["neck"],
    secondary: ["trapezius"],
  },
  {
    key: "serratus",
    label: "Serratus work",
    keywords: ["serratus", "scapular push up", "scap push up", "pullover"],
    primary: ["serratus", "lats"],
    secondary: ["pectorals", "triceps"],
  },
  {
    key: "run",
    label: "Running",
    keywords: ["run", "jog", "treadmill", "sprint"],
    primary: ["quadriceps", "hamstrings", "calves", "glutes"],
    secondary: ["hip-flexors", "tibialis", "abs", "soleus", "hip-abductors"],
  },
  {
    key: "cycle",
    label: "Cycling",
    keywords: ["cycle", "cycling", "bike", "spin"],
    primary: ["quadriceps", "glutes", "calves"],
    secondary: ["hamstrings", "hip-flexors", "soleus"],
  },
  {
    key: "swim",
    label: "Swimming",
    keywords: ["swim"],
    primary: ["lats", "deltoid-front", "deltoid-rear", "pectorals"],
    secondary: ["triceps", "abs", "serratus"],
  },
  {
    key: "burpee",
    label: "Burpee",
    keywords: ["burpee"],
    primary: ["pectorals", "quadriceps", "deltoid-front"],
    secondary: ["triceps", "abs", "glutes"],
  },
];

function words(text: string): string {
  return (
    " " +
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim() +
    " "
  );
}

/** Longest matching keyword wins, so "romanian deadlift" is not read as a plain "deadlift". */
export function matchExercise(name: string): ExerciseDef | null {
  const haystack = words(name);
  let best: { def: ExerciseDef; length: number } | null = null;
  for (const def of EXERCISES) {
    for (const keyword of def.keywords) {
      const needle =
        " " +
        keyword
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
      if (haystack.includes(needle) && (!best || needle.length > best.length)) {
        best = { def, length: needle.length };
      }
    }
  }
  return best?.def ?? null;
}
