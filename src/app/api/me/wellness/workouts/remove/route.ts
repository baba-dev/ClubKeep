import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeWorkout } from "@/lib/personal/wellness-workouts";
import { wellnessRemoveInput } from "@/lib/validations/wellness";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "workouts-remove", 60, wellnessRemoveInput,
    (db, userId, input) => removeWorkout(db, userId, input.id));
}
