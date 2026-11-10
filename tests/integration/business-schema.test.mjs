import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Use a disposable migrated ClubKeep PG17 database");
const { Client } = pg;
async function tx(callback) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    await callback(db);
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
}
async function rejectsCode(db, query, params, code) {
  await db.query("SAVEPOINT expected_error");
  try {
    await assert.rejects(
      () => db.query(query, params),
      (err) => err.code === code
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT expected_error");
  }
}
test("B1 domain creates walk-in without User and rejects cross-club plan/member associations", async () => {
  await tx(async (db) => {
    const s = randomUUID().slice(0, 8);
    const owner = "b1-owner-" + s;
    const a = "b1-a-" + s,
      b = "b1-b-" + s,
      roster = "b1-roster-" + s,
      plan = "b1-plan-" + s;
    await db.query(
      'INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,\'Owner\',$2,NOW())',
      [owner, owner + "@example.invalid"]
    );
    await db.query(
      'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Club A\',NOW()),($2,$2,\'Club B\',NOW())',
      [a, b]
    );
    await db.query(
      'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,\'Walk in\',NOW())',
      [roster, a]
    );
    await db.query(
      'INSERT INTO "ClubPlan" ("id","clubId","name","durationUnit","durationCount","priceMinor","currency","updatedAt") VALUES ($1,$2,\'Monthly\',\'MONTHS\',1,99900,\'INR\',NOW())',
      [plan, b]
    );
    await db.query(
      'INSERT INTO "ClubContact" ("id","clubId","memberRecordId","phoneE164","updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      ["b1-contact-" + s, a, roster, "+919999999999"]
    );
    await rejectsCode(
      db,
      'INSERT INTO "ClubContact" ("id","clubId","memberRecordId","updatedAt") VALUES ($1,$2,$3,NOW())',
      ["b1-bad-contact-" + s, b, roster],
      "23503"
    );
    await rejectsCode(
      db,
      'INSERT INTO "MemberSubscription" ("id","clubId","memberRecordId","planId","planName","priceMinor","currency","startAt","endAt","operationKey","createdByUserId") VALUES ($1,$2,$3,$4,\'Monthly\',99900,\'INR\',NOW(),NOW()+INTERVAL \'1 month\',$5,$6)',
      ["b1-term-" + s, a, roster, plan, "b1-op-" + s, owner],
      "23503"
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM "ClubMemberRecord" WHERE "id"=$1', [roster]))
        .rows[0].n,
      1
    );
  });
});
test("B1 rejects duplicate numbering, reused idempotency keys and invalid dates", async () => {
  await tx(async (db) => {
    const s = randomUUID().slice(0, 8),
      owner = "b1-own-" + s,
      club = "b1-club-" + s,
      member = "b1-member-" + s,
      plan = "b1-plan-" + s;
    await db.query(
      'INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,\'Owner\',$2,NOW())',
      [owner, owner + "@example.invalid"]
    );
    await db.query(
      'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Club\',NOW())',
      [club]
    );
    await db.query(
      'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,\'Member\',NOW())',
      [member, club]
    );
    await rejectsCode(
      db,
      'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,\'Duplicate\',NOW())',
      ["b1-duplicate-" + s, club],
      "23505"
    );
    await db.query(
      'INSERT INTO "ClubPlan" ("id","clubId","name","durationUnit","durationCount","priceMinor","currency","updatedAt") VALUES ($1,$2,\'Monthly\',\'MONTHS\',1,5000,\'INR\',NOW())',
      [plan, club]
    );
    const insert =
      'INSERT INTO "MemberSubscription" ("id","clubId","memberRecordId","planId","planName","priceMinor","currency","startAt","endAt","operationKey","createdByUserId") VALUES ($1,$2,$3,$4,\'Monthly\',5000,\'INR\',\'2026-11-10\',\'2026-12-10\',$5,$6)';
    await db.query(insert, ["b1-term-" + s, club, member, plan, "b1-key-" + s, owner]);
    await rejectsCode(
      db,
      insert,
      ["b1-term2-" + s, club, member, plan, "b1-key-" + s, owner],
      "23505"
    );
    await rejectsCode(
      db,
      'INSERT INTO "MemberSubscription" ("id","clubId","memberRecordId","planId","planName","priceMinor","currency","startAt","endAt","operationKey","createdByUserId") VALUES ($1,$2,$3,$4,\'Monthly\',5000,\'INR\',\'2026-12-10\',\'2026-11-10\',$5,$6)',
      ["b1-backwards-" + s, club, member, plan, "b1-reverse-" + s, owner],
      "23514"
    );
    await db.query('UPDATE "ClubPlan" SET "priceMinor"=7500 WHERE "id"=$1', [plan]);
    assert.equal(
      (
        await db.query('SELECT "priceMinor" FROM "MemberSubscription" WHERE "operationKey"=$1', [
          "b1-key-" + s,
        ])
      ).rows[0].priceMinor,
      5000
    );
  });
});
