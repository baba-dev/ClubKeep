import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { listRecovery, saveRecovery } from "@/lib/personal/wellness-recovery";
import { recoveryInput } from "@/lib/validations/wellness";
export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => listRecovery(db, userId));
}
export async function POST(request: NextRequest) {
  return wellnessPost(request, "recovery-save", 60, recoveryInput,
    (db, userId, input) => saveRecovery(db, userId, input));
}
