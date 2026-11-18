import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { updateBio } from "@/lib/personal/personal-service";
import { updateBioInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(request, "bio", 30, updateBioInput, async (userId, input) => {
    await updateBio(prisma, userId, input);
  });
}
