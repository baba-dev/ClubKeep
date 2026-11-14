-- B5: additive renewal request records, no charges or term mutations.
CREATE TYPE "MemberRenewalStatus" AS ENUM ('PENDING','RESOLVED','DECLINED');
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'RENEWAL_REQUESTED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'RENEWAL_REVIEWED';
CREATE TABLE "MemberRenewalRequest" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "memberRecordId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "operationKey" TEXT NOT NULL,
  "message" VARCHAR(300),
  "status" "MemberRenewalStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "decidedAt" TIMESTAMP(3),
  "decidedByUserId" TEXT,
  CONSTRAINT "MemberRenewalRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MemberRenewalRequest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberRenewalRequest_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberRenewalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberRenewalRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "MemberRenewalRequest_decision_check" CHECK (
    ("status"='PENDING' AND "decidedAt" IS NULL AND "decidedByUserId" IS NULL)
    OR ("status"<>'PENDING' AND "decidedAt" IS NOT NULL AND "decidedByUserId" IS NOT NULL))
);
CREATE UNIQUE INDEX "MemberRenewalRequest_operationKey_key" ON "MemberRenewalRequest"("operationKey");
CREATE UNIQUE INDEX "MemberRenewalRequest_clubId_id_key" ON "MemberRenewalRequest"("clubId","id");
CREATE INDEX "MemberRenewalRequest_clubId_status_createdAt_idx" ON "MemberRenewalRequest"("clubId","status","createdAt" DESC);
CREATE INDEX "MemberRenewalRequest_clubId_memberRecordId_createdAt_idx" ON "MemberRenewalRequest"("clubId","memberRecordId","createdAt" DESC);
CREATE UNIQUE INDEX "MemberRenewalRequest_one_pending_per_member" ON "MemberRenewalRequest"("clubId","memberRecordId") WHERE "status"='PENDING';
