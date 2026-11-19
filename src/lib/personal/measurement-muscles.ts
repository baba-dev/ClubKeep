import type { MeasurementKind } from "./measurements";
import type { MuscleId } from "./muscle-map";

// Which drawn muscle each girth measurement annotates on the body map. Left and right share one muscle;
// the detail panel shows whichever was logged most recently.
export const MEASUREMENT_MUSCLE: Partial<Record<MeasurementKind, MuscleId>> = {
  SHOULDER: "deltoid-side",
  CHEST: "pectorals",
  WAIST: "abs",
  BICEP_L: "biceps",
  BICEP_R: "biceps",
  FOREARM_L: "forearms-front",
  FOREARM_R: "forearms-front",
  THIGH_L: "quadriceps",
  THIGH_R: "quadriceps",
  CALF_L: "calves",
  CALF_R: "calves",
};

export const MEASUREMENT_LABEL: Record<MeasurementKind, string> = {
  WEIGHT: "Weight",
  BODY_FAT: "Body fat",
  NECK: "Neck",
  SHOULDER: "Shoulders",
  CHEST: "Chest",
  WAIST: "Waist",
  HIP: "Hips",
  BICEP_L: "Left bicep",
  BICEP_R: "Right bicep",
  FOREARM_L: "Left forearm",
  FOREARM_R: "Right forearm",
  THIGH_L: "Left thigh",
  THIGH_R: "Right thigh",
  CALF_L: "Left calf",
  CALF_R: "Right calf",
};
