import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Global platform authority is independent of Club roles and the deprecated
 * User.role string. Never authorize an admin from client input or a cached
 * session role. Require a verified session and fetch this field from the DB.
 */
export async function requirePlatformAdmin(
  db: Pick<PrismaClient, "user">,
  authenticatedUserId: string | undefined | null
): Promise<string> {
  if (!authenticatedUserId) {
    throw new Error("Platform access denied");
  }
  const user = await db.user.findUnique({
    where: { id: authenticatedUserId },
    select: { platformRole: true },
  });
  if (user?.platformRole !== "PLATFORM_ADMIN") {
    throw new Error("Platform access denied");
  }
  return authenticatedUserId;
}
