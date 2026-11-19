-- Personal bio, body measurements and self-declared activities. Additive; user-owned; no clubId on data rows.
CREATE TYPE "PersonalUnits" AS ENUM ('METRIC','IMPERIAL');
CREATE TYPE "PersonalGoal" AS ENUM ('STRENGTH','ENDURANCE','FLEXIBILITY','WEIGHT_MANAGEMENT','GENERAL_FITNESS');
CREATE TYPE "PersonalMeasurementKind" AS ENUM ('WEIGHT','BODY_FAT','NECK','SHOULDER','CHEST','WAIST','HIP','BICEP_L','BICEP_R','FOREARM_L','FOREARM_R','THIGH_L','THIGH_R','CALF_L','CALF_R');

ALTER TABLE "PersonalProfile"
  ADD COLUMN "birthYear" INTEGER,
  ADD COLUMN "heightMm" INTEGER,
  ADD COLUMN "units" "PersonalUnits" NOT NULL DEFAULT 'METRIC',
  ADD COLUMN "goal" "PersonalGoal",
  ADD CONSTRAINT "PersonalProfile_birthYear_chk" CHECK ("birthYear" IS NULL OR ("birthYear" BETWEEN 1900 AND 2100)),
  ADD CONSTRAINT "PersonalProfile_heightMm_chk" CHECK ("heightMm" IS NULL OR ("heightMm" BETWEEN 500 AND 2800));

CREATE TABLE "PersonalMeasurement" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" "PersonalMeasurementKind" NOT NULL,
  "value" INTEGER NOT NULL,
  "measuredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PersonalMeasurement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PersonalMeasurement_value_chk" CHECK ("value" > 0 AND "value" <= 1000000),
  CONSTRAINT "PersonalMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonalMeasurement_userId_kind_measuredAt_idx" ON "PersonalMeasurement"("userId","kind","measuredAt");

CREATE TABLE "PersonalActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activityKey" VARCHAR(40) NOT NULL,
  "sessionsPerWeek" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalActivity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PersonalActivity_sessions_chk" CHECK ("sessionsPerWeek" BETWEEN 0 AND 14),
  CONSTRAINT "PersonalActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PersonalActivity_userId_activityKey_key" ON "PersonalActivity"("userId","activityKey");

CREATE TABLE "PersonalClubSignalConsent" (
  "userId" TEXT NOT NULL,
  "clubId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalClubSignalConsent_pkey" PRIMARY KEY ("userId","clubId"),
  CONSTRAINT "PersonalClubSignalConsent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
