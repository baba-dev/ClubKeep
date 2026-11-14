import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated PG17 ClubKeep database");
const { Client } = pg;
async function withinTx(task) {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  try {
    await db.query("BEGIN");
    await task(db);
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
}
async function rejects(db, sql, args, code) {
  await db.query("SAVEPOINT expected_fail");
  try {
    await assert.rejects(
      () => db.query(sql, args),
      (e) => e.code === code
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT expected_fail");
  }
}
test("B5 renewal queue is club-scoped, single-pending and decision constrained", async () => {
  await withinTx(async (db) => {
    const x = randomUUID().slice(0, 8);
    const user = "b5-user-" + x,
      a = "b5-a-" + x,
      b = "b5-b-" + x,
      member = "b5-member-" + x;
    await db.query('INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,$2,$3,NOW())', [
      user,
      "Club member",
      user + "@example.invalid",
    ]);
    await db.query(
      'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,$1,NOW()),($2,$2,$2,NOW())',
      [a, b]
    );
    await db.query(
      'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,$3,NOW())',
      [member, a, "Gym member"]
    );
    const insert =
      'INSERT INTO "MemberRenewalRequest" ("id","clubId","memberRecordId","requestedByUserId","operationKey","updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())';
    await db.query(insert, ["b5-1-" + x, a, member, user, "b5-op-1-" + x]);
    await rejects(db, insert, ["b5-2-" + x, a, member, user, "b5-op-2-" + x], "23505");
    await rejects(db, insert, ["b5-x-" + x, b, member, user, "b5-op-x-" + x], "23503");
    await rejects(db, insert, ["b5-key-" + x, a, member, user, "b5-op-1-" + x], "23505");
    await rejects(
      db,
      'UPDATE "MemberRenewalRequest" SET "status"=$2 WHERE "id"=$1',
      ["b5-1-" + x, "RESOLVED"],
      "23514"
    );
    await db.query(
      'UPDATE "MemberRenewalRequest" SET "status"=$2,"decidedAt"=NOW(),"decidedByUserId"=$3 WHERE "id"=$1',
      ["b5-1-" + x, "RESOLVED", user]
    );
    await db.query(insert, ["b5-3-" + x, a, member, user, "b5-op-3-" + x]);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM "MemberRenewalRequest" WHERE "clubId"=$1 AND "status"=$2',
          [a, "PENDING"]
        )
      ).rows[0].n,
      1
    );
  });
});
