-- Additive P1-C nonclinical Health Connect data; all data remains self-owned.
CREATE TYPE "HealthConnectRecordType" AS ENUM ('STEPS_DAILY','WORKOUT','SLEEP','ACTIVE_CALORIES','HYDRATION');

CREATE TABLE "HealthConnectPairing" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthConnectPairing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HealthConnectPairing_codeHash_key" ON "HealthConnectPairing"("codeHash");
CREATE INDEX "HealthConnectPairing_userId_expiresAt_idx" ON "HealthConnectPairing"("userId","expiresAt");

CREATE TABLE "HealthConnectConnection" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "installationId" VARCHAR(64) NOT NULL,
  "label" VARCHAR(80) NOT NULL,
  "tokenHash" VARCHAR(64) NOT NULL,
  "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
  "grantedTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "lastSeenAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HealthConnectConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HealthConnectConnection_tokenHash_key" ON "HealthConnectConnection"("tokenHash");
CREATE UNIQUE INDEX "HealthConnectConnection_userId_installationId_key" ON "HealthConnectConnection"("userId","installationId");
CREATE INDEX "HealthConnectConnection_userId_revokedAt_idx" ON "HealthConnectConnection"("userId","revokedAt");

CREATE TABLE "HealthConnectSyncBatch" (
  "id" TEXT PRIMARY KEY,
  "connectionId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "contentHash" VARCHAR(64) NOT NULL,
  "importedCount" INTEGER NOT NULL,
  "deletedCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HealthConnectSyncBatch_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "HealthConnectConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthConnectSyncBatch_counts_check" CHECK ("importedCount" >= 0 AND "deletedCount" >= 0)
);
CREATE UNIQUE INDEX "hcb_connection_request_key" ON "HealthConnectSyncBatch"("connectionId","requestId");
CREATE INDEX "HealthConnectSyncBatch_connectionId_createdAt_idx" ON "HealthConnectSyncBatch"("connectionId","createdAt");

CREATE TABLE "HealthConnectRecord" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "recordType" "HealthConnectRecordType" NOT NULL,
  "externalId" VARCHAR(160) NOT NULL,
  "sourcePackage" VARCHAR(160) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3) NOT NULL,
  "value" INTEGER,
  "exerciseType" INTEGER,
  "deletedAt" TIMESTAMP(3),
  "lastDeviceId" VARCHAR(64) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HealthConnectRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HealthConnectRecord_window_check" CHECK ("endedAt" > "startedAt"),
  CONSTRAINT "HealthConnectRecord_value_check" CHECK ("value" IS NULL OR "value" BETWEEN 0 AND 5000000),
  CONSTRAINT "HealthConnectRecord_steps_check" CHECK (
     "recordType" <> 'STEPS_DAILY' OR ("value" IS NOT NULL AND "sourcePackage" = 'health-connect-aggregate')
  )
);
CREATE UNIQUE INDEX "hcr_dedup" ON "HealthConnectRecord"("userId","recordType","sourcePackage","externalId");
CREATE INDEX "hcr_user_kind_end" ON "HealthConnectRecord"("userId","recordType","endedAt");
