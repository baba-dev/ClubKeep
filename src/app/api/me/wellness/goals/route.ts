import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { createGoal, listGoals } from "@/lib/personal/wellness-goals";
import { goalInput } from "@/lib/validations/wellness";

export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => listGoals(db, userId));
}
export async function POST(request: NextRequest) {
  return wellnessPost(request, "goals-create", 30, goalInput, (db, userId, input) =>
    createGoal(db, userId, input)
  );
}
