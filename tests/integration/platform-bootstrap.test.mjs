import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { verifyPassword } from "better-auth/crypto";

const password = "ci-only-example-password-not-production";
const email = "bootstrap-admin-ci@example.invalid";
const baseArgs = [
  "prisma/bootstrap-platform-admin.mjs",
  "--email",
  email,
  "--name",
  "CI Administrator",
  "--expect-db",
  "clubkeep_ci",
];

function runBootstrap(args = baseArgs) {
  return spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env: process.env,
    input: password + "\n",
    encoding: "utf8",
    timeout: 15000,
  });
}

test("one-time admin bootstrap persists verifiable Better Auth credentials in ClubKeep only", async () => {
  assert.ok(
    process.env.DATABASE_URL?.includes("clubkeep_ci"),
    "Disposable ClubKeep CI database required"
  );
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const wrongDb = runBootstrap([...baseArgs.slice(0, -1), "clubkeep_not_ci"]);
    assert.notEqual(wrongDb.status, 0);
    assert.match(wrongDb.stderr, /Wrong database selected/);

    const first = runBootstrap();
    assert.equal(first.status, 0, first.stderr);
    const users = await db.query(
      'SELECT "id", "name", "emailVerified", "platformRole", "role" FROM "user" WHERE "email" = $1',
      [email]
    );
    assert.equal(users.rowCount, 1);
    assert.equal(users.rows[0].name, "CI Administrator");
    assert.equal(users.rows[0].emailVerified, true);
    assert.equal(users.rows[0].platformRole, "PLATFORM_ADMIN");
    assert.equal(users.rows[0].role, "user");

    const accounts = await db.query(
      'SELECT "accountId", "providerId", "password" FROM "account" WHERE "userId" = $1',
      [users.rows[0].id]
    );
    assert.equal(accounts.rowCount, 1);
    assert.equal(accounts.rows[0].providerId, "credential");
    assert.equal(accounts.rows[0].accountId, users.rows[0].id);
    assert.notEqual(accounts.rows[0].password, password);
    assert.equal(await verifyPassword({ hash: accounts.rows[0].password, password }), true);
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "PersonalProfile" WHERE "userId" = $1', [
          users.rows[0].id,
        ])
      ).rows[0].n,
      1
    );

    const rerun = runBootstrap();
    assert.notEqual(rerun.status, 0);
    assert.match(rerun.stderr, /Account already exists/);
    const after = await db.query('SELECT "password" FROM "account" WHERE "userId" = $1', [
      users.rows[0].id,
    ]);
    assert.equal(after.rows[0].password, accounts.rows[0].password);
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "user" WHERE "platformRole" = $1', [
          "PLATFORM_ADMIN",
        ])
      ).rows[0].n,
      1
    );
  } finally {
    await db.end();
  }
});
