import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Use disposable, fully migrated ClubKeep PostgreSQL 17 only");
const { Client } = pg;
async function tx(fn) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
}
async function expectReject(db, query, args, code) {
  await db.query("SAVEPOINT expected_failure");
  try {
    await assert.rejects(
      () => db.query(query, args),
      (e) => e.code === code
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT expected_failure");
  }
}
async function fixture(db) {
  const n = randomUUID().slice(0, 8);
  const u = "b6-u-" + n,
    reviewer = "b6-rev-" + n;
  const club = "b6-a-" + n,
    foreign = "b6-b-" + n;
  const member = "b6-member-" + n,
    season = "b6-season-" + n,
    metric = "b6-metric-" + n;
  await db.query(
    'INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,$2,$3,NOW()),($4,$5,$6,NOW())',
    [u, "Athlete", u + "@example.invalid", reviewer, "Reviewer", reviewer + "@example.invalid"]
  );
  await db.query(
    'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,$1,NOW()),($2,$2,$2,NOW())',
    [club, foreign]
  );
  await db.query(
    'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,$3,NOW())',
    [member, club, "Athlete"]
  );
  await db.query(
    'INSERT INTO "ClubSeason" ("id","clubId","name","startAt","endAt","createdByUserId") VALUES ($1,$2,$3,$4,$5,$6)',
    [season, club, "Winter league", "2026-11-01", "2027-02-01", u]
  );
  await db.query(
    'INSERT INTO "ClubSeasonMetric" ("id","clubId","seasonId","metric") VALUES ($1,$2,$3,$4)',
    [metric, club, season, "GYM_STRENGTH_KG"]
  );
  return { n, u, reviewer, club, foreign, member, season, metric };
}

test("B6 multi-tenant FKs, metric uniqueness, consent and score-pending constraints", async () => {
  await tx(async (db) => {
    const f = await fixture(db);
    await expectReject(
      db,
      'INSERT INTO "ClubSeasonMetric" ("id","clubId","seasonId","metric") VALUES ($1,$2,$3,$4)',
      ["b6-foreign-metric-" + f.n, f.foreign, f.season, "TRAINING_MINUTES"],
      "23503"
    );
    await expectReject(
      db,
      'INSERT INTO "ClubSeasonMetric" ("id","clubId","seasonId","metric") VALUES ($1,$2,$3,$4)',
      ["b6-duplicate-metric-" + f.n, f.club, f.season, "GYM_STRENGTH_KG"],
      "23505"
    );
    await expectReject(
      db,
      'INSERT INTO "ClubRankingConsent" ("clubId","memberRecordId","enabled","changedByUserId","updatedAt") VALUES ($1,$2,true,$3,NOW())',
      [f.club, f.member, f.u],
      "23514"
    );
    await db.query(
      'INSERT INTO "ClubRankingConsent" ("clubId","memberRecordId","enabled","consentedAt","changedByUserId","updatedAt") VALUES ($1,$2,true,NOW(),$3,NOW())',
      [f.club, f.member, f.u]
    );
    await expectReject(
      db,
      'INSERT INTO "ClubRankingConsent" ("clubId","memberRecordId","enabled","consentedAt","changedByUserId","updatedAt") VALUES ($1,$2,true,NOW(),$3,NOW())',
      [f.foreign, f.member, f.u],
      "23503"
    );
    const q =
      'INSERT INTO "ClubScore" ("id","clubId","seasonMetricId","memberRecordId","value","operationKey","submittedByUserId") VALUES ($1,$2,$3,$4,$5,$6,$7)';
    await db.query(q, ["b6-score1-" + f.n, f.club, f.metric, f.member, 105, "b6-op1-" + f.n, f.u]);
    await expectReject(
      db,
      q,
      ["b6-score2-" + f.n, f.club, f.metric, f.member, 106, "b6-op2-" + f.n, f.u],
      "23505"
    );
    await expectReject(
      db,
      q,
      ["b6-cross-" + f.n, f.foreign, f.metric, f.member, 101, "b6-op3-" + f.n, f.u],
      "23503"
    );
    await expectReject(
      db,
      q,
      ["b6-overflow-" + f.n, f.club, f.metric, f.member, 1500, "b6-op4-" + f.n, f.u],
      "23514"
    );
    await expectReject(
      db,
      'UPDATE "ClubScore" SET "status"=$2,"decidedAt"=NOW(),"decidedByUserId"=$3 WHERE "id"=$1',
      ["b6-score1-" + f.n, "APPROVED", f.u],
      "23514"
    );
    await db.query(
      'UPDATE "ClubScore" SET "status"=$2,"decidedAt"=NOW(),"decidedByUserId"=$3 WHERE "id"=$1',
      ["b6-score1-" + f.n, "APPROVED", f.reviewer]
    );
    await expectReject(
      db,
      'UPDATE "ClubScore" SET "value"=110 WHERE "id"=$1',
      ["b6-score1-" + f.n],
      "P0001"
    );
    await expectReject(db, 'DELETE FROM "ClubScore" WHERE "id"=$1', ["b6-score1-" + f.n], "P0001");
    await db.query(
      'INSERT INTO "ClubLeaderboardBest" ("clubId","seasonMetricId","memberRecordId","scoreId","value","approvedAt") VALUES ($1,$2,$3,$4,105,NOW())',
      [f.club, f.metric, f.member, "b6-score1-" + f.n]
    );
    await expectReject(
      db,
      'INSERT INTO "ClubLeaderboardBest" ("clubId","seasonMetricId","memberRecordId","scoreId","value","approvedAt") VALUES ($1,$2,$3,$4,105,NOW())',
      [f.foreign, f.metric, f.member, "b6-score1-" + f.n],
      // Global score uniqueness rejects reuse before PostgreSQL evaluates the cross-club FK.
      "23505"
    );
  });
});
test("B6 challenge enrollments require same-club records; targets have hard bounds", async () => {
  await tx(async (db) => {
    const f = await fixture(db);
    const challenge = "b6-challenge-" + f.n;
    const q =
      'INSERT INTO "ClubChallenge" ("id","clubId","seasonId","title","kind","target","startAt","endAt","createdByUserId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)';
    await expectReject(
      db,
      q,
      [
        challenge,
        f.club,
        f.season,
        "Broken challenge",
        "ATTENDANCE",
        101,
        "2026-11-01",
        "2027-02-01",
        f.u,
      ],
      "23514"
    );
    await db.query(q, [
      challenge,
      f.club,
      f.season,
      "Five checked-in sessions",
      "ATTENDANCE",
      5,
      "2026-11-01",
      "2027-02-01",
      f.u,
    ]);
    await db.query(
      'INSERT INTO "ClubChallengeEntry" ("clubId","challengeId","memberRecordId","updatedAt") VALUES ($1,$2,$3,NOW())',
      [f.club, challenge, f.member]
    );
    await expectReject(
      db,
      'INSERT INTO "ClubChallengeEntry" ("clubId","challengeId","memberRecordId","updatedAt") VALUES ($1,$2,$3,NOW())',
      [f.foreign, challenge, f.member],
      "23503"
    );
    await expectReject(
      db,
      'INSERT INTO "ClubChallengeEntry" ("clubId","challengeId","memberRecordId","updatedAt") VALUES ($1,$2,$3,NOW())',
      [f.club, challenge, f.member],
      "23505"
    );
  });
});
