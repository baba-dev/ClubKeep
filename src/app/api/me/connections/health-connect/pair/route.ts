import type { NextRequest } from "next/server";
import { z } from "zod";
import { wellnessPost } from "@/lib/personal/wellness-http";
import { beginHealthPairing } from "@/lib/personal/health-connect/connections";
export async function POST(request: NextRequest) {
  return wellnessPost(request, "health-pair", 6, z.object({}).strict(), (db, userId) =>
    beginHealthPairing(db, userId)
  );
}
