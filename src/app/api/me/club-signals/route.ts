import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { setClubSignalConsent } from "@/lib/personal/personal-service";
import { clubSignalInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(request, "club-signal", 30, clubSignalInput, async (userId, input) => {
    await setClubSignalConsent(prisma, userId, input.clubId, input.enabled);
  });
}
