import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { setActivities } from "@/lib/personal/personal-service";
import { setActivitiesInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(request, "activities", 30, setActivitiesInput, async (userId, input) => {
    await setActivities(prisma, userId, input.activities);
  });
}
