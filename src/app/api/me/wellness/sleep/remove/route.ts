import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeSleep } from "@/lib/personal/wellness-sleep";
import { wellnessRemoveInput } from "@/lib/validations/wellness";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "sleep-remove", 30, wellnessRemoveInput,
    (db, userId, input) => removeSleep(db, userId, input.id));
}
