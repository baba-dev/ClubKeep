import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeGoal } from "@/lib/personal/wellness-goals";
import { wellnessRemoveInput } from "@/lib/validations/wellness";

export async function POST(request: NextRequest) {
  return wellnessPost(request, "goals-remove", 30, wellnessRemoveInput, (db, userId, input) =>
    removeGoal(db, userId, input.id)
  );
}
