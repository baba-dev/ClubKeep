import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { changeGoal } from "@/lib/personal/wellness-goals";
import { goalChangeInput } from "@/lib/validations/wellness";

export async function POST(request: NextRequest) {
  return wellnessPost(request, "goals-change", 60, goalChangeInput,
    (db, userId, input) => changeGoal(db, userId, input));
}
