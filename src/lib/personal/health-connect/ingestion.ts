import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { HealthBatchInput } from "@/lib/validations/health-connect-batch";

const hashBatch = (body: HealthBatchInput) =>
  createHash("sha256").update(JSON.stringify(body)).digest("hex");

/** Every batch is all-or-nothing, scoped to one active device and user. */
export async function acceptHealthBatch(
  db: PrismaClient,
  device: { id: string; userId: string },
  body: HealthBatchInput,
  now = new Date()
) {
  const digest = hashBatch(body);
  const known = await db.healthConnectSyncBatch.findUnique({
    where: { connectionId_requestId: { connectionId: device.id, requestId: body.requestId } },
  });
  if (known) {
    if (known.contentHash !== digest)
      throw new OnboardingError(409, "Batch ID used with different content.");
    return { imported: known.importedCount, deleted: known.deletedCount, replayed: true };
  }

  try {
    return await db.$transaction(async (tx) => {
      // A device revocation or Personal purge acquires the same connection row lock.
      await tx.$queryRaw`SELECT "id" FROM "HealthConnectConnection" WHERE "id" = ${device.id} FOR UPDATE`;
      const current = await tx.healthConnectConnection.findUnique({
        where: { id: device.id },
        select: { userId: true, revokedAt: true, tokenExpiresAt: true },
      });
      if (
        !current ||
        current.userId !== device.userId ||
        current.revokedAt ||
        current.tokenExpiresAt <= now
      )
        throw new OnboardingError(401, "Connection expired or revoked.");
      const old = await tx.healthConnectSyncBatch.findUnique({
        where: { connectionId_requestId: { connectionId: device.id, requestId: body.requestId } },
      });
      if (old) {
        if (old.contentHash !== digest) throw new OnboardingError(409, "Batch content changed.");
        return { imported: old.importedCount, deleted: old.deletedCount, replayed: true };
      }
      for (const record of body.records) {
        const key = {
          userId: device.userId,
          recordType: record.recordType,
          sourcePackage: record.sourcePackage,
          externalId: record.externalId,
        };
        // Important: never resurrect a tombstoned record on stale duplicate replay.
        await tx.healthConnectRecord.upsert({
          where: { userId_recordType_sourcePackage_externalId: key },
          create: {
            ...key,
            startedAt: new Date(record.startedAt),
            endedAt: new Date(record.endedAt),
            value: record.value,
            exerciseType: record.exerciseType,
            lastDeviceId: device.id,
            lastSeenAt: now,
          },
          update: {
            startedAt: new Date(record.startedAt),
            endedAt: new Date(record.endedAt),
            value: record.value ?? null,
            exerciseType: record.exerciseType ?? null,
            lastDeviceId: device.id,
            lastSeenAt: now,
            // deletedAt is deliberately never nulled by an ordinary upsert.
          },
        });
      }
      for (const record of body.deletions) {
        const key = {
          userId: device.userId,
          recordType: record.recordType,
          sourcePackage: record.sourcePackage,
          externalId: record.externalId,
        };
        await tx.healthConnectRecord.upsert({
          where: { userId_recordType_sourcePackage_externalId: key },
          create: {
            ...key,
            startedAt: new Date(now.getTime() - 1000),
            endedAt: now,
            value: record.recordType === "STEPS_DAILY" ? 0 : null,
            deletedAt: now,
            lastDeviceId: device.id,
            lastSeenAt: now,
          },
          update: { deletedAt: now, lastDeviceId: device.id, lastSeenAt: now },
        });
      }
      await tx.healthConnectSyncBatch.create({
        data: {
          connectionId: device.id,
          requestId: body.requestId,
          contentHash: digest,
          importedCount: body.records.length,
          deletedCount: body.deletions.length,
        },
      });
      await tx.healthConnectConnection.updateMany({
        where: { id: device.id, userId: device.userId, revokedAt: null },
        data: { lastSyncAt: now, lastSeenAt: now, grantedTypes: body.grantedTypes },
      });
      return { imported: body.records.length, deleted: body.deletions.length, replayed: false };
    });
  } catch (error) {
    // A concurrent replay can hit the unique constraint before its own lookup.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const result = await db.healthConnectSyncBatch.findUnique({
        where: { connectionId_requestId: { connectionId: device.id, requestId: body.requestId } },
      });
      if (result) {
        if (result.contentHash !== digest)
          throw new OnboardingError(409, "Batch ID used with different content.");
        return { imported: result.importedCount, deleted: result.deletedCount, replayed: true };
      }
    }
    throw error;
  }
}

/** Single source of truth: imported copies never overwrite user-entered Manual rows. */
export async function listImportedFitness(db: PrismaClient, userId: string) {
  return db.healthConnectRecord.findMany({
    where: { userId, deletedAt: null },
    orderBy: { endedAt: "desc" },
    take: 150,
    select: {
      id: true,
      recordType: true,
      startedAt: true,
      endedAt: true,
      value: true,
      exerciseType: true,
      sourcePackage: true,
    },
  });
}
