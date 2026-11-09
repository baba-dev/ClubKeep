import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

test("preexisting Better Auth identities survive baseline resolution and additive migration", async () => {
  assert.ok(process.env.DATABASE_URL, "A disposable legacy test database is required");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const user = await db.query(
      'SELECT "id","email","phoneNumber","role","emailVerified" FROM "user" WHERE "id" = $1',
      ["legacy-user-1"]
    );
    assert.deepEqual(user.rows[0], {
      id: "legacy-user-1",
      email: "legacy.member@example.invalid",
      phoneNumber: "+919922334455",
      role: "user",
      emailVerified: true,
    });
    const account = await db.query(
      'SELECT "accountId","providerId","password" FROM "account" WHERE "id"=$1',
      ["legacy-account-1"]
    );
    assert.equal(account.rows[0].accountId, "legacy-user-1");
    assert.equal(account.rows[0].providerId, "credential");
    assert.equal(account.rows[0].password, "fixture-password-not-a-real-hash");
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "session" WHERE "userId"=$1', [
          "legacy-user-1",
        ])
      ).rows[0].n,
      1
    );
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "verification" WHERE "identifier"=$1', [
          "legacy@example.invalid",
        ])
      ).rows[0].n,
      1
    );
    const tables = await db.query(
      "SELECT to_regclass('public.\"ClubMembership\"') IS NOT NULL AS ready"
    );
    assert.equal(tables.rows[0].ready, true);
  } finally {
    await db.end();
  }
});
