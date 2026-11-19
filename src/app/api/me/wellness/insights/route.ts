import type { NextRequest } from "next/server";
import { wellnessRead } from "@/lib/personal/wellness-http";
import { wellnessInsights } from "@/lib/personal/wellness-insights";
export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => wellnessInsights(db, userId));
}
