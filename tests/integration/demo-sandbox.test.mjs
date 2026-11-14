import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

test("sandbox seed creates separate OWNER and linked MEMBER journeys for both reviewer logins", async () => {
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  try {
    const name = (await db.query("SELECT current_database() AS name")).rows[0].name;
    assert.equal(name, "clubkeep_demo_ci");
    const users = await db.query('SELECT "email","platformRole" FROM "user" ORDER BY "email"');
    assert.equal(users.rows.length, 4);
    assert.ok(users.rows.every((u) => u.email.endsWith("@demo.clubkeep.invalid")));
    assert.equal(users.rows.filter((u) => u.platformRole === "PLATFORM_ADMIN").length, 1);
    const clubs = await db.query('SELECT "id","name" FROM "Club"');
    assert.equal(clubs.rows.length, 2);
    const memberships = await db.query(
      'SELECT u."email",m."role",m."clubId" FROM "ClubMembership" m JOIN "user" u ON u."id"=m."userId"'
    );
    for (const prefix of ["review-owner", "review-member"]) {
      const rows = memberships.rows.filter((r) => r.email.startsWith(prefix + "@"));
      assert.equal(rows.length, 2);
      assert.deepEqual(new Set(rows.map((r) => r.role)), new Set(["OWNER", "MEMBER"]));
    }
    const linked = await db.query(
      'SELECT COUNT(*)::int AS total FROM "ClubMemberRecord" WHERE "membershipId" IS NOT NULL'
    );
    assert.equal(linked.rows[0].total, 2);
    const stats = await Promise.all([
      db.query('SELECT COUNT(*)::int AS total FROM "ClubAttendance"'),
      db.query('SELECT COUNT(*)::int AS total FROM "ClubPayment"'),
      db.query('SELECT COUNT(*)::int AS total FROM "ClubScore" WHERE "status"=\'APPROVED\''),
      db.query('SELECT COUNT(*)::int AS total FROM "ClubChallenge"'),
      db.query('SELECT COUNT(*)::int AS total FROM "MemberRenewalRequest"'),
    ]);
    assert.deepEqual(
      stats.map((x) => x.rows[0].total),
      [10, 2, 2, 2, 1]
    );
  } finally {
    await db.end();
  }
});
