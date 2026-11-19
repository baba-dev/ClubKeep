import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { personalPost } from "@/lib/personal/personal-http";
import { logMeasurement } from "@/lib/personal/personal-service";
import { logMeasurementInput } from "@/lib/validations/personal";

export async function POST(request: NextRequest): Promise<Response> {
  return personalPost(request, "measure", 60, logMeasurementInput, (userId, input) =>
    logMeasurement(prisma, userId, input)
  );
}
