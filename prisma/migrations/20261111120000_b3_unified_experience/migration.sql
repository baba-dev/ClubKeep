-- B3: safe additive club setup and moderated public listings
CREATE TYPE "ClubVertical" AS ENUM ('GYM','YOGA','DANCE','SPORTS','OTHER');
CREATE TYPE "ClubSetupStatus" AS ENUM ('IN_PROGRESS','READY','LEGACY_ACTIVE');
CREATE TYPE "ClubPublicationStatus" AS ENUM ('HIDDEN','PENDING','UNLISTED','LISTED','SUSPENDED');
CREATE TYPE "ClubPublicReviewStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
ALTER TABLE "Club" ADD COLUMN "vertical" "ClubVertical" NOT NULL DEFAULT 'OTHER';
ALTER TABLE "Club" ADD COLUMN "setupStatus" "ClubSetupStatus" NOT NULL DEFAULT 'IN_PROGRESS';
ALTER TABLE "Club" ADD COLUMN "setupCompletedAt" TIMESTAMP(3);
-- Pre-B3 clubs retain all B1/B2 access, with incomplete setup flagged for later completion.
UPDATE "Club" SET "setupStatus"='LEGACY_ACTIVE';
CREATE TABLE "ClubSetupProgress" (
  "clubId" TEXT NOT NULL PRIMARY KEY REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 0,
  "countryCode" VARCHAR(2),
  "currencyCode" VARCHAR(3),
  "operatingMode" VARCHAR(16),
  "city" VARCHAR(100),
  "address" VARCHAR(240),
  "contactEmail" VARCHAR(254),
  "logoUrl" VARCHAR(512),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ClubPublicProfile" (
  "clubId" TEXT NOT NULL PRIMARY KEY REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "draft" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "published" JSONB,
  "status" "ClubPublicationStatus" NOT NULL DEFAULT 'HIDDEN',
  "publishedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "ClubPublicRevision" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "clubId" TEXT NOT NULL REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "content" JSONB NOT NULL,
  "status" "ClubPublicReviewStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewerId" TEXT
);
CREATE INDEX "ClubPublicProfile_status_publishedAt_idx" ON "ClubPublicProfile"("status","publishedAt");
CREATE INDEX "ClubPublicRevision_clubId_status_submittedAt_idx" ON "ClubPublicRevision"("clubId","status","submittedAt");
CREATE INDEX "ClubPublicRevision_status_submittedAt_idx" ON "ClubPublicRevision"("status","submittedAt");
