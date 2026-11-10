import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "Use a disposable migrated ClubKeep PostgreSQL 17 database");

test("two independent PostgreSQL connections cannot consume one invitation twice", async () => {
  const root = new pg.Client({ connectionString });
  const a = new pg.Client({ connectionString });
  const b = new pg.Client({ connectionString });
  await Promise.all([root.connect(), a.connect(), b.connect()]);
  const unique = randomUUID();
  const owner = "owner-" + unique;
  const personA = "person-a-" + unique;
  const personB = "person-b-" + unique;
  const clubId = "club-" + unique;
  const inviteId = "invite-" + unique;
  let firstStarted = false;
  let secondStarted = false;
  try {
    await root.query("BEGIN");
    await root.query(
      'INSERT INTO "user" ("id","name","email","emailVerified","updatedAt") VALUES ($1,$2,$3,true,NOW()),($4,$5,$6,true,NOW()),($7,$8,$9,true,NOW())',
      [
        owner,
        "Owner",
        owner + "@example.invalid",
        personA,
        "Member A",
        personA + "@example.invalid",
        personB,
        "Member B",
        personB + "@example.invalid",
      ]
    );
    await root.query(
      'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$2,$3,NOW())',
      [clubId, clubId, "Concurrency Club"]
    );
    await root.query(
      'INSERT INTO "ClubMembership" ("id","clubId","userId","role","updatedAt") VALUES ($1,$2,$3,\'OWNER\',NOW())',
      ["owner-member-" + unique, clubId, owner]
    );
    await root.query(
      'INSERT INTO "ClubInvite" ("id","clubId","issuedByUserId","role","tokenHash","expiresAt") VALUES ($1,$2,$3,\'MEMBER\',$4,NOW() + INTERVAL \'7 days\')',
      [inviteId, clubId, owner, "test-hmac-" + unique]
    );
    await root.query("COMMIT");

    const claim = (person) => ({
      text: `UPDATE "ClubInvite"
        SET "claimedAt" = NOW(), "claimedByUserId" = $2
        WHERE id = $1 AND "claimedAt" IS NULL AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
          AND EXISTS (SELECT 1 FROM "Club" WHERE "Club"."id" = "ClubInvite"."clubId" AND "Club"."status" = 'ACTIVE')
        RETURNING "id"`,
      values: [inviteId, person],
    });
    await a.query("BEGIN");
    firstStarted = true;
    const winner = await a.query(claim(personA));
    assert.equal(winner.rowCount, 1);
    await b.query("BEGIN");
    secondStarted = true;
    // B waits on A's row lock until its commit. It must then observe
    // claimedAt != NULL, despite having initially seen the old row state.
    const loserPending = b.query(claim(personB));
    await a.query(
      'INSERT INTO "ClubMembership" ("id","clubId","userId","role","updatedAt") VALUES ($1,$2,$3,\'MEMBER\',NOW())',
      ["claimed-member-" + unique, clubId, personA]
    );
    await a.query("COMMIT");
    firstStarted = false;
    const loser = await loserPending;
    assert.equal(loser.rowCount, 0);
    await b.query("COMMIT");
    secondStarted = false;

    const invite = await root.query('SELECT "claimedByUserId" FROM "ClubInvite" WHERE id = $1', [
      inviteId,
    ]);
    assert.equal(invite.rows[0].claimedByUserId, personA);
    const membership = await root.query(
      'SELECT "userId" FROM "ClubMembership" WHERE "clubId"=$1 AND "role"=\'MEMBER\'',
      [clubId]
    );
    assert.deepEqual(
      membership.rows.map((row) => row.userId),
      [personA]
    );

    const revoked = await root.query(
      'UPDATE "ClubInvite" SET "revokedAt"=NOW() WHERE id=$1 AND "claimedAt" IS NULL RETURNING id',
      [inviteId]
    );
    assert.equal(revoked.rowCount, 0);
  } finally {
    if (firstStarted) await a.query("ROLLBACK").catch(() => {});
    if (secondStarted) await b.query("ROLLBACK").catch(() => {});
    await root.query('DELETE FROM "SecurityEvent" WHERE "clubId"=$1', [clubId]).catch(() => {});
    await root.query('DELETE FROM "ClubMembership" WHERE "clubId"=$1', [clubId]).catch(() => {});
    await root.query('DELETE FROM "ClubInvite" WHERE "clubId"=$1', [clubId]).catch(() => {});
    await root.query('DELETE FROM "Club" WHERE id=$1', [clubId]).catch(() => {});
    await root
      .query('DELETE FROM "user" WHERE id = ANY($1::text[])', [[owner, personA, personB]])
      .catch(() => {});
    await Promise.all([root.end(), a.end(), b.end()]);
  }
});
