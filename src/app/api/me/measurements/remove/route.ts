import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { deleteMeasurement } from "@/lib/personal/personal-service";
import { removeMeasurementInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(
    request,
    "measure-remove",
    60,
    removeMeasurementInput,
    async (userId, input) => {
      await deleteMeasurement(prisma, userId, input.id);
    }
  );
}
