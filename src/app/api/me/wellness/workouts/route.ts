import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { createWorkout, listWorkouts } from "@/lib/personal/wellness-workouts";
import { workoutInput } from "@/lib/validations/wellness";

export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => listWorkouts(db, userId));
}
export async function POST(request: NextRequest) {
  return wellnessPost(request, "workouts-create", 120, workoutInput, (db, userId, input) =>
    createWorkout(db, userId, input)
  );
}
