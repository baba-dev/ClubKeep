import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeMeal } from "@/lib/personal/wellness-nutrition";
import { wellnessRemoveInput } from "@/lib/validations/wellness";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "meals-remove", 60, wellnessRemoveInput, (db, userId, input) =>
    removeMeal(db, userId, input.id)
  );
}
