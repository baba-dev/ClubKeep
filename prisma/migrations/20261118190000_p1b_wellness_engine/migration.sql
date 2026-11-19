-- P1-B private wellness: additive, isolated from club tenancy and medical-history tables.
CREATE TYPE "WellnessGoalMetric" AS ENUM ('WORKOUT_SESSIONS','ACTIVITY_MINUTES','SLEEP_MINUTES','HYDRATION_ML');
CREATE TYPE "WellnessGoalCadence" AS ENUM ('WEEKLY','TOTAL');
CREATE TYPE "WellnessGoalStatus" AS ENUM ('ACTIVE','PAUSED','ARCHIVED');
CREATE TYPE "WellnessSource" AS ENUM ('MANUAL','HEALTHKIT','HEALTH_CONNECT');
CREATE TYPE "WellnessMealType" AS ENUM ('BREAKFAST','LUNCH','DINNER','SNACK');

CREATE TABLE "PersonalGoalInstance" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "title" VARCHAR(80) NOT NULL,
  "metric" "WellnessGoalMetric" NOT NULL, "cadence" "WellnessGoalCadence" NOT NULL DEFAULT 'WEEKLY',
  "target" INTEGER NOT NULL, "status" "WellnessGoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PersonalGoalInstance_target_check" CHECK ("target" BETWEEN 1 AND 10000000),
  CONSTRAINT "PersonalGoalInstance_dates_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt"),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PersonalGoalInstance_userId_status_startsAt_idx" ON "PersonalGoalInstance"("userId","status","startsAt");

CREATE TABLE "WorkoutSession" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestId" VARCHAR(80) NOT NULL,
  "title" VARCHAR(100) NOT NULL, "activityKey" VARCHAR(40) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL, "distanceMeters" INTEGER,
  "notes" VARCHAR(500), "source" "WellnessSource" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkoutSession_duration_check" CHECK ("durationMinutes" BETWEEN 1 AND 1440),
  CONSTRAINT "WorkoutSession_distance_check" CHECK ("distanceMeters" IS NULL OR "distanceMeters" BETWEEN 0 AND 1000000),
  CONSTRAINT "WorkoutSession_dates_check" CHECK ("endedAt" > "startedAt"),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WorkoutSession_userId_requestId_key" ON "WorkoutSession"("userId","requestId");
CREATE INDEX "WorkoutSession_userId_endedAt_idx" ON "WorkoutSession"("userId","endedAt");

CREATE TABLE "WorkoutExercise" (
  "id" TEXT PRIMARY KEY, "workoutId" TEXT NOT NULL, "name" VARCHAR(100) NOT NULL,
  "position" INTEGER NOT NULL, FOREIGN KEY ("workoutId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkoutExercise_workoutId_position_idx" ON "WorkoutExercise"("workoutId","position");
CREATE TABLE "WorkoutSet" (
  "id" TEXT PRIMARY KEY, "exerciseId" TEXT NOT NULL, "position" INTEGER NOT NULL,
  "reps" INTEGER, "weightGrams" INTEGER, "durationSeconds" INTEGER, "distanceMeters" INTEGER,
  CONSTRAINT "WorkoutSet_reps_check" CHECK ("reps" IS NULL OR "reps" BETWEEN 0 AND 1000),
  CONSTRAINT "WorkoutSet_weight_check" CHECK ("weightGrams" IS NULL OR "weightGrams" BETWEEN 0 AND 1000000),
  CONSTRAINT "WorkoutSet_seconds_check" CHECK ("durationSeconds" IS NULL OR "durationSeconds" BETWEEN 0 AND 86400),
  CONSTRAINT "WorkoutSet_distance_check" CHECK ("distanceMeters" IS NULL OR "distanceMeters" BETWEEN 0 AND 1000000),
  FOREIGN KEY ("exerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "WorkoutSet_exerciseId_position_idx" ON "WorkoutSet"("exerciseId","position");

CREATE TABLE "SleepSession" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestId" VARCHAR(80) NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL, "endedAt" TIMESTAMP(3) NOT NULL, "quality" INTEGER,
  "isNap" BOOLEAN NOT NULL DEFAULT FALSE, "source" "WellnessSource" NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SleepSession_dates_check" CHECK ("endedAt" > "startedAt" AND "endedAt" < "startedAt" + INTERVAL '24 hours'),
  CONSTRAINT "SleepSession_quality_check" CHECK ("quality" IS NULL OR "quality" BETWEEN 1 AND 5),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SleepSession_userId_requestId_key" ON "SleepSession"("userId","requestId");
CREATE INDEX "SleepSession_userId_endedAt_idx" ON "SleepSession"("userId","endedAt");

CREATE TABLE "MealEntry" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestId" VARCHAR(80) NOT NULL,
  "mealType" "WellnessMealType" NOT NULL, "eatenAt" TIMESTAMP(3) NOT NULL, "notes" VARCHAR(300),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "MealEntry_userId_requestId_key" ON "MealEntry"("userId","requestId");
CREATE INDEX "MealEntry_userId_eatenAt_idx" ON "MealEntry"("userId","eatenAt");
CREATE TABLE "MealItem" (
  "id" TEXT PRIMARY KEY, "mealId" TEXT NOT NULL, "name" VARCHAR(100) NOT NULL,
  "portionGrams" INTEGER, "caloriesKcal" INTEGER, "proteinGrams" INTEGER,
  "carbsGrams" INTEGER, "fatGrams" INTEGER, "position" INTEGER NOT NULL,
  CONSTRAINT "MealItem_portion_check" CHECK ("portionGrams" IS NULL OR "portionGrams" BETWEEN 1 AND 50000),
  CONSTRAINT "MealItem_energy_check" CHECK ("caloriesKcal" IS NULL OR "caloriesKcal" BETWEEN 0 AND 50000),
  CONSTRAINT "MealItem_protein_check" CHECK ("proteinGrams" IS NULL OR "proteinGrams" BETWEEN 0 AND 10000),
  CONSTRAINT "MealItem_carbs_check" CHECK ("carbsGrams" IS NULL OR "carbsGrams" BETWEEN 0 AND 10000),
  CONSTRAINT "MealItem_fat_check" CHECK ("fatGrams" IS NULL OR "fatGrams" BETWEEN 0 AND 10000),
  FOREIGN KEY ("mealId") REFERENCES "MealEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "MealItem_mealId_position_idx" ON "MealItem"("mealId","position");

CREATE TABLE "HydrationEntry" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestId" VARCHAR(80) NOT NULL,
  "volumeMl" INTEGER NOT NULL, "takenAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HydrationEntry_volume_check" CHECK ("volumeMl" BETWEEN 1 AND 5000),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "HydrationEntry_userId_requestId_key" ON "HydrationEntry"("userId","requestId");
CREATE INDEX "HydrationEntry_userId_takenAt_idx" ON "HydrationEntry"("userId","takenAt");

CREATE TABLE "RecoveryCheckIn" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "localDate" VARCHAR(10) NOT NULL,
  "energy" INTEGER, "soreness" INTEGER, "stress" INTEGER, "satisfaction" INTEGER,
  "notes" VARCHAR(300), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecoveryCheckIn_ratings_check" CHECK (
    ("energy" IS NULL OR "energy" BETWEEN 1 AND 5) AND
    ("soreness" IS NULL OR "soreness" BETWEEN 1 AND 5) AND
    ("stress" IS NULL OR "stress" BETWEEN 1 AND 5) AND
    ("satisfaction" IS NULL OR "satisfaction" BETWEEN 1 AND 5)),
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RecoveryCheckIn_userId_localDate_key" ON "RecoveryCheckIn"("userId","localDate");

CREATE TABLE "WellnessSourceRecord" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "provider" VARCHAR(40) NOT NULL,
  "externalId" VARCHAR(200) NOT NULL, "recordType" VARCHAR(40) NOT NULL,
  "sourceUpdatedAt" TIMESTAMP(3), "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WellnessSourceRecord_userId_provider_recordType_externalId_key" ON "WellnessSourceRecord"("userId","provider","recordType","externalId");
CREATE INDEX "WellnessSourceRecord_userId_provider_idx" ON "WellnessSourceRecord"("userId","provider");
