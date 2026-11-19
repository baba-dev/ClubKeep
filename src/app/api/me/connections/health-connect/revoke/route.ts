import type { NextRequest } from "next/server";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { revokeHealthConnection } from "@/lib/personal/health-connect/connections";
import { healthConnectionIdInput } from "@/lib/validations/health-connect";
import { assertHealthConnectEnabled } from "@/lib/personal/health-connect/flags";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "health-revoke", 12, healthConnectionIdInput, (db, userId, data) => {
    assertHealthConnectEnabled();
    return revokeHealthConnection(db, userId, data.id);
  });
}
