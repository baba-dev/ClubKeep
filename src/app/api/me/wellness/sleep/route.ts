import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { listSleep, recordSleep } from "@/lib/personal/wellness-sleep";
import { sleepInput } from "@/lib/validations/wellness";
export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => listSleep(db, userId));
}
export async function POST(request: NextRequest) {
  return wellnessPost(request, "sleep-create", 60, sleepInput,
    (db, userId, input) => recordSleep(db, userId, input));
}
