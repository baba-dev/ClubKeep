import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { removeRecovery } from "@/lib/personal/wellness-recovery";
import { wellnessRemoveInput } from "@/lib/validations/wellness";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "recovery-remove", 30, wellnessRemoveInput, (db, userId, input) =>
    removeRecovery(db, userId, input.id)
  );
}
