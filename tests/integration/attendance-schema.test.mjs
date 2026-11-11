import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Use a disposable migrated PG17 ClubKeep test database");
const { Client } = pg;
const newClient = () =>
  new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });

async function expectCode(db, query, params, code) {
  await db.query("SAVEPOINT b2_expected_failure");
  try {
    await assert.rejects(
      () => db.query(query, params),
      (error) => error.code === code
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT b2_expected_failure");
  }
}

const userSql =
  'INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,\'Owner\',$2,NOW())';
const clubSql = 'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Club\',NOW())';
const rosterSql =
  'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,\'Member\',NOW())';
const entrySql =
  'INSERT INTO "ClubAttendance" ("id","clubId","memberRecordId","localDate","method","checkedInByUserId") VALUES ($1,$2,$3,$4,\'MANUAL\',$5)';

test("PG17 rejects duplicate local days, cross-club identities and illegal QR overrides", async () => {
  const db = newClient();
  await db.connect();
  await db.query("BEGIN");
  try {
    const s = randomUUID().slice(0, 8);
    const user = "b2-user-" + s,
      club = "b2-a-" + s,
      other = "b2-b-" + s,
      member = "b2-m-" + s;
    await db.query(userSql, [user, user + "@example.invalid"]);
    await db.query(clubSql, [club]);
    await db.query(clubSql, [other]);
    await db.query(rosterSql, [member, club]);
    await db.query(entrySql, ["b2-entry-" + s, club, member, "2026-11-11", user]);
    await expectCode(
      db,
      entrySql,
      ["b2-duplicate-" + s, club, member, "2026-11-11", user],
      "23505"
    );
    await expectCode(db, entrySql, ["b2-cross-" + s, other, member, "2026-11-11", user], "23503");
    await expectCode(db, entrySql, ["b2-baddate-" + s, club, member, "not-a-day", user], "23514");
    const badOverride =
      'INSERT INTO "ClubAttendance" ("id","clubId","memberRecordId","localDate","method","checkedInByUserId","overrideReason") VALUES ($1,$2,$3,$4,\'QR\',$5,\'Invalid QR override\')';
    await expectCode(
      db,
      badOverride,
      ["b2-override-" + s, club, member, "2026-11-13", user],
      "23514"
    );
    await db.query(entrySql, ["b2-nextday-" + s, club, member, "2026-11-12", user]);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM "ClubAttendance" WHERE "clubId"=$1', [club]))
        .rows[0].n,
      2
    );
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
});

test("two concurrent check-ins cannot both claim the same member-local day", async () => {
  const one = newClient(),
    two = newClient();
  await one.connect();
  await two.connect();
  const s = randomUUID().slice(0, 8),
    user = "b2-race-u-" + s,
    club = "b2-race-c-" + s,
    member = "b2-race-m-" + s;
  try {
    await one.query(userSql, [user, user + "@example.invalid"]);
    await one.query(clubSql, [club]);
    await one.query(rosterSql, [member, club]);
    await one.query("BEGIN");
    await two.query("BEGIN");
    await one.query(entrySql, ["b2-race-first-" + s, club, member, "2026-11-11", user]);
    const second = two.query(entrySql, ["b2-race-second-" + s, club, member, "2026-11-11", user]);
    await one.query("COMMIT");
    await assert.rejects(second, (error) => error.code === "23505");
    await two.query("ROLLBACK");
    assert.equal(
      (await one.query('SELECT count(*)::int AS n FROM "ClubAttendance" WHERE "clubId"=$1', [club]))
        .rows[0].n,
      1
    );
  } finally {
    await one.query("ROLLBACK").catch(() => {});
    await two.query("ROLLBACK").catch(() => {});
    await one.query('DELETE FROM "ClubAttendance" WHERE "clubId"=$1', [club]).catch(() => {});
    await one.query('DELETE FROM "ClubMemberRecord" WHERE "clubId"=$1', [club]).catch(() => {});
    await one.query('DELETE FROM "Club" WHERE "id"=$1', [club]).catch(() => {});
    await one.query('DELETE FROM "user" WHERE "id"=$1', [user]).catch(() => {});
    await one.end();
    await two.end();
  }
});
