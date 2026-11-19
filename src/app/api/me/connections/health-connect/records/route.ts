import type { NextRequest } from "next/server";
import { wellnessRead } from "@/lib/personal/wellness-http";
import { assertHealthConnectEnabled } from "@/lib/personal/health-connect/flags";
import { listImportedFitness } from "@/lib/personal/health-connect/ingestion";

export async function GET(request: NextRequest): Promise<Response> {
  return wellnessRead(request, (db, userId) => {
    assertHealthConnectEnabled();
    return listImportedFitness(db, userId);
  });
}
