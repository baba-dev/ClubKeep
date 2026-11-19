import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeHydration } from "@/lib/personal/wellness-nutrition";
import { wellnessRemoveInput } from "@/lib/validations/wellness";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "hydration-remove", 60, wellnessRemoveInput, (db, userId, input) =>
    removeHydration(db, userId, input.id)
  );
}
