-- Business B1: additive club roster, plans, immutable subscription terms, audit.
-- Existing Better Auth/0B and invitation tables remain unchanged.
BEGIN;
CREATE TYPE "BusinessTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'PRO');
CREATE TYPE "ClubMemberStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "PlanDurationUnit" AS ENUM ('DAYS', 'WEEKS', 'MONTHS');
CREATE TYPE "MemberEventType" AS ENUM ('REGISTERED', 'LINKED', 'PLAN_ASSIGNED', 'RENEWED', 'CANCELLED', 'ARCHIVED');

ALTER TABLE "Club" ADD COLUMN "businessTier" "BusinessTier" NOT NULL DEFAULT 'FREE',
 ADD COLUMN "memberSequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClubContact" ADD COLUMN "memberRecordId" TEXT;

CREATE TABLE "ClubMemberRecord" (
 "id" TEXT NOT NULL,
 "clubId" TEXT NOT NULL,
 "memberNumber" INTEGER NOT NULL,
 "displayName" TEXT NOT NULL,
 "status" "ClubMemberStatus" NOT NULL DEFAULT 'ACTIVE',
 "membershipId" TEXT,
 "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClubMemberRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ClubPlan" (
 "id" TEXT NOT NULL,
 "clubId" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "description" TEXT,
 "durationUnit" "PlanDurationUnit" NOT NULL,
 "durationCount" INTEGER NOT NULL,
 "priceMinor" INTEGER NOT NULL,
 "currency" TEXT NOT NULL,
 "archivedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClubPlan_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ClubPlan_positive_price" CHECK ("priceMinor" >= 0),
 CONSTRAINT "ClubPlan_valid_duration" CHECK ("durationCount" BETWEEN 1 AND 1200)
);

CREATE TABLE "MemberSubscription" (
 "id" TEXT NOT NULL,
 "clubId" TEXT NOT NULL,
 "memberRecordId" TEXT NOT NULL,
 "planId" TEXT NOT NULL,
 "planName" TEXT NOT NULL,
 "priceMinor" INTEGER NOT NULL,
 "currency" TEXT NOT NULL,
 "startAt" TIMESTAMP(3) NOT NULL,
 "endAt" TIMESTAMP(3) NOT NULL,
 "cancelledAt" TIMESTAMP(3),
 "operationKey" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "createdByUserId" TEXT NOT NULL,
 CONSTRAINT "MemberSubscription_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "MemberSubscription_valid_term" CHECK ("endAt" > "startAt"),
 CONSTRAINT "MemberSubscription_positive_price" CHECK ("priceMinor" >= 0)
);

CREATE TABLE "MemberEvent" (
 "id" TEXT NOT NULL,
 "clubId" TEXT NOT NULL,
 "memberRecordId" TEXT NOT NULL,
 "actorUserId" TEXT NOT NULL,
 "eventType" "MemberEventType" NOT NULL,
 "referenceId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MemberEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClubMemberRecord_clubId_id_key" ON "ClubMemberRecord" ("clubId","id");
CREATE UNIQUE INDEX "ClubMemberRecord_clubId_memberNumber_key" ON "ClubMemberRecord" ("clubId","memberNumber");
CREATE UNIQUE INDEX "ClubMemberRecord_clubId_membershipId_key" ON "ClubMemberRecord" ("clubId","membershipId");
CREATE INDEX "ClubMemberRecord_clubId_status_displayName_idx" ON "ClubMemberRecord" ("clubId","status","displayName");
CREATE UNIQUE INDEX "ClubPlan_clubId_id_key" ON "ClubPlan" ("clubId","id");
CREATE INDEX "ClubPlan_clubId_archivedAt_name_idx" ON "ClubPlan" ("clubId","archivedAt","name");
CREATE UNIQUE INDEX "MemberSubscription_operationKey_key" ON "MemberSubscription" ("operationKey");
CREATE INDEX "MemberSubscription_clubId_memberRecordId_startAt_endAt_idx" ON "MemberSubscription" ("clubId","memberRecordId","startAt","endAt");
CREATE INDEX "MemberSubscription_clubId_endAt_idx" ON "MemberSubscription" ("clubId","endAt");
CREATE INDEX "MemberEvent_clubId_memberRecordId_createdAt_idx" ON "MemberEvent" ("clubId","memberRecordId","createdAt");
CREATE INDEX "ClubContact_clubId_memberRecordId_idx" ON "ClubContact" ("clubId","memberRecordId");

ALTER TABLE "ClubMemberRecord" ADD CONSTRAINT "ClubMemberRecord_clubId_fkey"
 FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubMemberRecord" ADD CONSTRAINT "ClubMemberRecord_clubId_membershipId_fkey"
 FOREIGN KEY ("clubId","membershipId") REFERENCES "ClubMembership" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubPlan" ADD CONSTRAINT "ClubPlan_clubId_fkey"
 FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_clubId_fkey"
 FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_clubId_memberRecordId_fkey"
 FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberSubscription" ADD CONSTRAINT "MemberSubscription_clubId_planId_fkey"
 FOREIGN KEY ("clubId","planId") REFERENCES "ClubPlan" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_clubId_fkey"
 FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_clubId_memberRecordId_fkey"
 FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_actorUserId_fkey"
 FOREIGN KEY ("actorUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubContact" ADD CONSTRAINT "ClubContact_clubId_memberRecordId_fkey"
 FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
COMMIT;
