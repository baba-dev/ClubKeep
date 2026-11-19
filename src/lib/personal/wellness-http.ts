import type { NextRequest } from "next/server";
import type { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonPrivate, onboardingFailure } from "@/lib/onboarding-http";
import { personalPost } from "@/lib/personal/personal-http";
import { assertWellnessAdult, assertWellnessEnabled } from "@/lib/personal/wellness-policy";

/** Every Personal wellness read and write enforces the rollout AND adult policy server-side. */
export async function wellnessPost<T>(
  request: NextRequest,
  scope: string,
  limit: number,
  schema: z.ZodType<T>,
  handler: (db: PrismaClient, userId: string, input: T) => Promise<unknown>
): Promise<Response> {
  try {
    assertWellnessEnabled();
    return await personalPost(
      request,
      "wellness-" + scope,
      limit,
      schema,
      async (userId, input) => {
        await assertWellnessAdult(prisma, userId);
        return handler(prisma, userId, input);
      }
    );
  } catch (error) {
    return onboardingFailure(error);
  }
}

export async function wellnessRead(
  request: Request,
  handler: (db: PrismaClient, userId: string) => Promise<unknown>
): Promise<Response> {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return jsonPrivate({ error: "Forbidden" }, 403);
  }
  try {
    assertWellnessEnabled();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return jsonPrivate({ error: "Sign in first" }, 401);
    if (!session.user.emailVerified) return jsonPrivate({ error: "Verify your account" }, 403);
    await assertWellnessAdult(prisma, session.user.id);
    return jsonPrivate({ ok: true, data: await handler(prisma, session.user.id) });
  } catch (error) {
    return onboardingFailure(error);
  }
}
