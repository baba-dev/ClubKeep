import { createHash, randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import { assertHealthConnectEnabled } from "./flags";
import { assertWellnessAdult } from "@/lib/personal/wellness-policy";

const PAIR_LIFETIME_MS = 10 * 60_000;
const DEVICE_LIFETIME_MS = 30 * 86400000;
const MAX_DEVICES = 4;
export function hashCapability(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
export function newCapability(): string {
  return randomBytes(32).toString("base64url");
}

/** Public device state only: never expose bearer tokens or capability hashes. */
export async function listHealthConnections(db: PrismaClient, userId: string) {
  assertHealthConnectEnabled();
  await assertWellnessAdult(db, userId);
  return db.healthConnectConnection.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      grantedTypes: true,
      createdAt: true,
      lastSyncAt: true,
      lastSeenAt: true,
      revokedAt: true,
      tokenExpiresAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function beginHealthPairing(db: PrismaClient, userId: string) {
  assertHealthConnectEnabled();
  await assertWellnessAdult(db, userId);
  const now = new Date();
  const active = await db.healthConnectConnection.count({
    where: { userId, revokedAt: null, tokenExpiresAt: { gt: now } },
  });
  if (active >= MAX_DEVICES) throw new OnboardingError(409, "Disconnect an older device first.");
  await db.healthConnectPairing.deleteMany({ where: { userId, expiresAt: { lt: now } } });
  const pairCode = newCapability();
  const expiresAt = new Date(now.getTime() + PAIR_LIFETIME_MS);
  await db.healthConnectPairing.create({
    data: { userId, codeHash: hashCapability(pairCode), expiresAt },
  });
  return { pairCode, expiresAt: expiresAt.toISOString() };
}

export async function claimHealthPairing(
  db: PrismaClient,
  input: { pairCode: string; installationId: string; label: string }
) {
  assertHealthConnectEnabled();
  const codeHash = hashCapability(input.pairCode);
  const now = new Date();
  const token = newCapability();
  const tokenHash = hashCapability(token);
  const expiresAt = new Date(now.getTime() + DEVICE_LIFETIME_MS);
  const connectionId = await db.$transaction(async (tx) => {
    const pair = await tx.healthConnectPairing.findUnique({ where: { codeHash } });
    if (!pair || pair.claimedAt || pair.expiresAt <= now)
      throw new OnboardingError(401, "Pairing code is invalid or expired.");
    const profile = await tx.personalProfile.findUnique({
      where: { userId: pair.userId },
      select: { birthYear: true },
    });
    if (!profile?.birthYear || now.getUTCFullYear() - profile.birthYear < 19)
      throw new OnboardingError(403, "Adult Personal access required.");
    const consumed = await tx.healthConnectPairing.updateMany({
      where: { id: pair.id, claimedAt: null, expiresAt: { gt: now } },
      data: { claimedAt: now },
    });
    if (consumed.count !== 1) throw new OnboardingError(401, "Pairing code already used.");
    const previous = await tx.healthConnectConnection.findUnique({
      where: {
        userId_installationId: { userId: pair.userId, installationId: input.installationId },
      },
    });
    if (!previous) {
      const active = await tx.healthConnectConnection.count({
        where: { userId: pair.userId, revokedAt: null, tokenExpiresAt: { gt: now } },
      });
      if (active >= MAX_DEVICES) throw new OnboardingError(409, "Device limit reached.");
    }
    const connection = await tx.healthConnectConnection.upsert({
      where: {
        userId_installationId: { userId: pair.userId, installationId: input.installationId },
      },
      create: {
        userId: pair.userId,
        installationId: input.installationId,
        label: input.label,
        tokenHash,
        tokenExpiresAt: expiresAt,
      },
      update: {
        label: input.label,
        tokenHash,
        tokenExpiresAt: expiresAt,
        revokedAt: null,
        grantedTypes: [],
        lastSyncAt: null,
      },
      select: { id: true },
    });
    return connection.id;
  });
  return { connectionId, token, expiresAt: expiresAt.toISOString() };
}

export async function revokeHealthConnection(db: PrismaClient, userId: string, id: string) {
  const changed = await db.healthConnectConnection.updateMany({
    where: { id, userId, revokedAt: null },
    data: { revokedAt: new Date(), grantedTypes: [] },
  });
  if (!changed.count) throw new OnboardingError(404, "Active connection not found.");
  return { revoked: true };
}

export async function purgeHealthImports(db: PrismaClient, userId: string) {
  await db.$transaction([
    db.healthConnectConnection.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), grantedTypes: [] },
    }),
    db.healthConnectRecord.deleteMany({ where: { userId } }),
    db.healthConnectPairing.deleteMany({ where: { userId } }),
  ]);
  return { removed: true, connectionsRevoked: true };
}
