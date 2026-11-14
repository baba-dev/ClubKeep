-- B6 additive performance domain. No Personal data, public profiles or payment mutations.
CREATE TYPE "CompetitionMetric" AS ENUM ('GYM_STRENGTH_KG','SPORTS_MATCH_POINTS','DANCE_ROUTINE_SCORE','YOGA_PRACTICE_MINUTES','TRAINING_MINUTES');
CREATE TYPE "CompetitionScoreStatus" AS ENUM ('PENDING','APPROVED','REJECTED');
CREATE TYPE "ClubChallengeKind" AS ENUM ('ATTENDANCE','APPROVED_SCORES');
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'COMPETITION_SEASON_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'COMPETITION_SCORE_SUBMITTED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'COMPETITION_SCORE_REVIEWED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'COMPETITION_CONSENT_CHANGED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'CLUB_CHALLENGE_CREATED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'CLUB_CHALLENGE_JOINED';
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'CLUB_CHALLENGE_LEFT';

CREATE TABLE "ClubSeason" (
 "id" TEXT NOT NULL, "clubId" TEXT NOT NULL, "name" VARCHAR(90) NOT NULL,
 "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL,
 "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ClubSeason_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ClubSeason_range_chk" CHECK ("startAt" < "endAt"),
 CONSTRAINT "ClubSeason_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubSeason_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubSeason_clubId_id_key" ON "ClubSeason"("clubId","id");
CREATE UNIQUE INDEX "ClubSeason_clubId_startAt_key" ON "ClubSeason"("clubId","startAt");
CREATE INDEX "ClubSeason_clubId_endAt_idx" ON "ClubSeason"("clubId","endAt");

CREATE TABLE "ClubSeasonMetric" (
 "id" TEXT NOT NULL, "clubId" TEXT NOT NULL, "seasonId" TEXT NOT NULL,
 "metric" "CompetitionMetric" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ClubSeasonMetric_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ClubSeasonMetric_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubSeasonMetric_clubId_seasonId_fkey" FOREIGN KEY ("clubId","seasonId") REFERENCES "ClubSeason"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubSeasonMetric_clubId_id_key" ON "ClubSeasonMetric"("clubId","id");
CREATE UNIQUE INDEX "ClubSeasonMetric_clubId_seasonId_metric_key" ON "ClubSeasonMetric"("clubId","seasonId","metric");
CREATE INDEX "ClubSeasonMetric_clubId_seasonId_idx" ON "ClubSeasonMetric"("clubId","seasonId");

CREATE TABLE "ClubRankingConsent" (
 "clubId" TEXT NOT NULL, "memberRecordId" TEXT NOT NULL, "enabled" BOOLEAN NOT NULL DEFAULT false,
 "consentedAt" TIMESTAMP(3), "updatedAt" TIMESTAMP(3) NOT NULL, "changedByUserId" TEXT NOT NULL,
 CONSTRAINT "ClubRankingConsent_pkey" PRIMARY KEY ("clubId","memberRecordId"),
 CONSTRAINT "ClubRankingConsent_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubRankingConsent_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubRankingConsent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubRankingConsent_state_chk" CHECK ((NOT "enabled") OR "consentedAt" IS NOT NULL)
);
CREATE INDEX "ClubRankingConsent_clubId_enabled_idx" ON "ClubRankingConsent"("clubId","enabled");

CREATE TABLE "ClubScore" (
 "id" TEXT NOT NULL, "clubId" TEXT NOT NULL, "seasonMetricId" TEXT NOT NULL,
 "memberRecordId" TEXT NOT NULL, "value" INTEGER NOT NULL, "note" VARCHAR(160),
 "status" "CompetitionScoreStatus" NOT NULL DEFAULT 'PENDING', "operationKey" TEXT NOT NULL,
 "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "submittedByUserId" TEXT NOT NULL,
 "decidedAt" TIMESTAMP(3), "decidedByUserId" TEXT,
 CONSTRAINT "ClubScore_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ClubScore_value_chk" CHECK ("value" BETWEEN 1 AND 1000),
 CONSTRAINT "ClubScore_decision_chk" CHECK (
   ("status"='PENDING' AND "decidedAt" IS NULL AND "decidedByUserId" IS NULL)
   OR ("status"<>'PENDING' AND "decidedAt" IS NOT NULL AND "decidedByUserId" IS NOT NULL)),
 CONSTRAINT "ClubScore_no_self_approval_chk" CHECK ("status" <> 'APPROVED' OR "submittedByUserId" <> "decidedByUserId"),
 CONSTRAINT "ClubScore_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubScore_clubId_seasonMetricId_fkey" FOREIGN KEY ("clubId","seasonMetricId") REFERENCES "ClubSeasonMetric"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubScore_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubScore_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubScore_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubScore_operationKey_key" ON "ClubScore"("operationKey");
CREATE UNIQUE INDEX "ClubScore_clubId_id_key" ON "ClubScore"("clubId","id");
CREATE INDEX "ClubScore_clubId_seasonMetricId_status_submittedAt_idx" ON "ClubScore"("clubId","seasonMetricId","status","submittedAt" DESC);
CREATE INDEX "ClubScore_clubId_memberRecordId_submittedAt_idx" ON "ClubScore"("clubId","memberRecordId","submittedAt" DESC);
CREATE UNIQUE INDEX "ClubScore_one_pending_per_member_metric" ON "ClubScore"("clubId","seasonMetricId","memberRecordId") WHERE "status"='PENDING';

-- Approval history cannot be edited, removed, or re-decided.
CREATE FUNCTION clubkeep_score_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Score records cannot be deleted'; END IF;
 IF OLD."status" <> 'PENDING' THEN RAISE EXCEPTION 'Decided score records are immutable'; END IF;
 IF NEW."id" <> OLD."id" OR NEW."clubId" <> OLD."clubId" OR
    NEW."seasonMetricId" <> OLD."seasonMetricId" OR NEW."memberRecordId" <> OLD."memberRecordId" OR
    NEW."value" <> OLD."value" OR NEW."operationKey" <> OLD."operationKey" OR
    NEW."submittedByUserId" <> OLD."submittedByUserId" OR
    NEW."submittedAt" <> OLD."submittedAt" OR
    NEW."note" IS DISTINCT FROM OLD."note" OR
    NEW."status" = 'PENDING'
 THEN RAISE EXCEPTION 'Only one score decision is allowed'; END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER "clubkeep_score_immutable" BEFORE UPDATE OR DELETE ON "ClubScore"
 FOR EACH ROW EXECUTE FUNCTION clubkeep_score_immutable();

CREATE TABLE "ClubLeaderboardBest" (
 "clubId" TEXT NOT NULL, "seasonMetricId" TEXT NOT NULL, "memberRecordId" TEXT NOT NULL,
 "scoreId" TEXT NOT NULL, "value" INTEGER NOT NULL, "approvedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClubLeaderboardBest_pkey" PRIMARY KEY ("clubId","seasonMetricId","memberRecordId"),
 CONSTRAINT "ClubLeaderboardBest_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubLeaderboardBest_clubId_seasonMetricId_fkey" FOREIGN KEY ("clubId","seasonMetricId") REFERENCES "ClubSeasonMetric"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubLeaderboardBest_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubLeaderboardBest_clubId_scoreId_fkey" FOREIGN KEY ("clubId","scoreId") REFERENCES "ClubScore"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubLeaderboardBest_scoreId_key" ON "ClubLeaderboardBest"("scoreId");
CREATE INDEX "ClubLeaderboardBest_clubId_seasonMetricId_value_approvedAt_memberRecordId_idx"
 ON "ClubLeaderboardBest"("clubId","seasonMetricId","value" DESC,"approvedAt","memberRecordId");

CREATE TABLE "ClubChallenge" (
 "id" TEXT NOT NULL, "clubId" TEXT NOT NULL, "seasonId" TEXT NOT NULL,
 "title" VARCHAR(90) NOT NULL, "kind" "ClubChallengeKind" NOT NULL, "target" INTEGER NOT NULL,
 "startAt" TIMESTAMP(3) NOT NULL, "endAt" TIMESTAMP(3) NOT NULL,
 "createdByUserId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "ClubChallenge_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "ClubChallenge_target_chk" CHECK ("target" BETWEEN 1 AND 100),
 CONSTRAINT "ClubChallenge_dates_chk" CHECK ("startAt" < "endAt"),
 CONSTRAINT "ClubChallenge_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubChallenge_clubId_seasonId_fkey" FOREIGN KEY ("clubId","seasonId") REFERENCES "ClubSeason"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubChallenge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ClubChallenge_clubId_id_key" ON "ClubChallenge"("clubId","id");
CREATE INDEX "ClubChallenge_clubId_seasonId_startAt_idx" ON "ClubChallenge"("clubId","seasonId","startAt");

CREATE TABLE "ClubChallengeEntry" (
 "clubId" TEXT NOT NULL, "challengeId" TEXT NOT NULL, "memberRecordId" TEXT NOT NULL,
 "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "active" BOOLEAN NOT NULL DEFAULT true,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "ClubChallengeEntry_pkey" PRIMARY KEY ("clubId","challengeId","memberRecordId"),
 CONSTRAINT "ClubChallengeEntry_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubChallengeEntry_clubId_challengeId_fkey" FOREIGN KEY ("clubId","challengeId") REFERENCES "ClubChallenge"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "ClubChallengeEntry_clubId_memberRecordId_fkey" FOREIGN KEY ("clubId","memberRecordId") REFERENCES "ClubMemberRecord"("clubId","id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ClubChallengeEntry_clubId_memberRecordId_active_idx" ON "ClubChallengeEntry"("clubId","memberRecordId","active");
