import type { PrismaClient } from "@/generated/prisma/client";

type AuthReader = Pick<PrismaClient, "user" | "account">;

/**
 * Legacy unverified password users are not eligible for magic-link login:
 * Better Auth intentionally revokes their password/session on first email
 * verification. They can keep signing in with their old password until a
 * separately approved password-migration flow is available.
 *
 * Always return the same outward response in the calling auth endpoint.
 */
export async function maySendLoginLink(db: AuthReader, email: string): Promise<boolean> {
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!existing || existing.emailVerified) return true;
  const passwordAccount = await db.account.findFirst({
    where: { userId: existing.id, providerId: "credential" },
    select: { id: true },
  });
  return passwordAccount === null;
}
