import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { purgeHealthImports } from "@/lib/personal/health-connect/connections";
import { healthPurgeInput } from "@/lib/validations/health-connect";
import { assertHealthConnectEnabled } from "@/lib/personal/health-connect/flags";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "health-purge", 5, healthPurgeInput, (db, userId) => {
    assertHealthConnectEnabled();
    return purgeHealthImports(db, userId);
  });
}
