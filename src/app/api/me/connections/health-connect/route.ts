import type { NextRequest } from "next/server";
import { wellnessRead } from "@/lib/personal/wellness-http";
import { listHealthConnections } from "@/lib/personal/health-connect/connections";
export async function GET(request: NextRequest) {
  return wellnessRead(request, (db, userId) => listHealthConnections(db, userId));
}
