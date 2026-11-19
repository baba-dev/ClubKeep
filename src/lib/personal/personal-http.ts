import type { NextRequest } from "next/server";
import type { z } from "zod";
import { OnboardingError } from "@/lib/club-onboarding";
import {
  guardOnboardingPost,
  jsonPrivate,
  onboardingFailure,
  readOnboardingBody,
} from "@/lib/onboarding-http";

/**
 * Shared wrapper for every Personal mutation: origin and same-site check, verified session,
 * fail-closed rate limit, size-capped JSON body, Zod validation and safe error mapping.
 * The handler receives only the session user id, never an owner id from the client.
 */
export async function personalPost<T>(
  request: NextRequest,
  scope: string,
  maxPerHour: number,
  schema: z.ZodType<T>,
  handler: (userId: string, input: T) => Promise<unknown>
): Promise<Response> {
  try {
    const guard = await guardOnboardingPost(request, "personal-" + scope, maxPerHour, true);
    if (!guard.ok) return guard.response;
    const parsed = schema.safeParse(await readOnboardingBody(request));
    if (!parsed.success) throw new OnboardingError(400, "Check your entries and try again.");
    const result = await handler(guard.userId!, parsed.data);
    return jsonPrivate({ ok: true, ...(result && typeof result === "object" ? result : {}) });
  } catch (error) {
    return onboardingFailure(error);
  }
}
