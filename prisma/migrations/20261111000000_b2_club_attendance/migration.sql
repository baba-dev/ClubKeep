-- B2: additive attendance ledger, preserving B1 member/plan histories and all auth data.
-- "localDate" is a snapshot in the IANA zone configured for this club at entry time.
ALTER TYPE "SecurityEventType" ADD VALUE 'CLUB_TIMEZONE_CHANGED';

ALTER TABLE "Club" ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC';

CREATE TYPE "CheckInMethod" AS ENUM ('QR', 'MANUAL');

CREATE TABLE "ClubAttendance" (
  "id" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "memberRecordId" TEXT NOT NULL,
  "localDate" VARCHAR(10) NOT NULL,
  "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "method" "CheckInMethod" NOT NULL,
  "checkedInByUserId" TEXT NOT NULL,
  "overrideReason" VARCHAR(240),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClubAttendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ClubAttendance_localDate_check" CHECK ("localDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  CONSTRAINT "ClubAttendance_override_check" CHECK (
     "overrideReason" IS NULL OR
      ("method" = 'MANUAL' AND char_length(btrim("overrideReason")) BETWEEN 8 AND 240)
  )
);

CREATE UNIQUE INDEX "ClubAttendance_clubId_memberRecordId_localDate_key"
  ON "ClubAttendance" ("clubId", "memberRecordId", "localDate");
CREATE INDEX "ClubAttendance_clubId_localDate_checkedInAt_idx"
  ON "ClubAttendance" ("clubId", "localDate", "checkedInAt" DESC);
CREATE INDEX "ClubAttendance_clubId_memberRecordId_checkedInAt_idx"
  ON "ClubAttendance" ("clubId", "memberRecordId", "checkedInAt" DESC);

ALTER TABLE "ClubAttendance" ADD CONSTRAINT "ClubAttendance_clubId_fkey"
  FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubAttendance" ADD CONSTRAINT "ClubAttendance_clubId_memberRecordId_fkey"
  FOREIGN KEY ("clubId", "memberRecordId") REFERENCES "ClubMemberRecord" ("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClubAttendance" ADD CONSTRAINT "ClubAttendance_checkedInByUserId_fkey"
  FOREIGN KEY ("checkedInByUserId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
