import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { deleteAllPersonalData } from "@/lib/personal/personal-service";
import { deleteAllInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(request, "delete-all", 5, deleteAllInput, async (userId) => {
    await deleteAllPersonalData(prisma, userId);
  });
}
