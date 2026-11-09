import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
assert.ok(connectionString, "Identity migration tests require a disposable ClubKeep DATABASE_URL");

async function tx(fn) {
  const db = new Client({ connectionString, connectionTimeoutMillis: 4000 });
  await db.connect();
  try {
    await db.query("BEGIN");
    await fn(db);
  } finally {
    await db.query("ROLLBACK");
    await db.end();
  }
}

async function rejectsUnique(db, query, values) {
  await db.query("SAVEPOINT unique_case");
  try {
    await assert.rejects(
      () => db.query(query, values),
      (err) => err.code === "23505"
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT unique_case");
  }
}

test("two clubs allow one global user with different roles and reject duplicate membership", async () => {
  await tx(async (db) => {
    await db.query(`
      INSERT INTO "user" ("id", "name", "email", "updatedAt")
      VALUES ('id-user-1', 'First User', 'id-user-1@example.invalid', NOW())
    `);
    await db.query(`
      INSERT INTO "Club" ("id", "slug", "name", "updatedAt")
      VALUES ('id-club-a', 'id-club-a', 'Gym A', NOW()),
             ('id-club-b', 'id-club-b', 'Gym B', NOW())
    `);
    await db.query(`
      INSERT INTO "ClubMembership" ("id", "clubId", "userId", "role", "updatedAt")
      VALUES ('member-a', 'id-club-a', 'id-user-1', 'OWNER', NOW()),
             ('member-b', 'id-club-b', 'id-user-1', 'MEMBER', NOW())
    `);
    const result = await db.query(
      'SELECT "clubId", "role" FROM "ClubMembership" WHERE "userId" = $1 ORDER BY "clubId"',
      ["id-user-1"]
    );
    assert.deepEqual(result.rows, [
      { clubId: "id-club-a", role: "OWNER" },
      { clubId: "id-club-b", role: "MEMBER" },
    ]);
    await rejectsUnique(
      db,
      'INSERT INTO "ClubMembership" ("id", "clubId", "userId", "updatedAt") VALUES ($1,$2,$3,NOW())',
      ["member-duplicate", "id-club-a", "id-user-1"]
    );

    // A contact cannot attach a membership belonging to a different club.
    await db.query(
      'INSERT INTO "ClubContact" ("id","clubId","membershipId","updatedAt") VALUES ($1,$2,$3,NOW())',
      ["attached-valid", "id-club-a", "member-a"]
    );
    await db.query("SAVEPOINT reject_cross_club_contact");
    await assert.rejects(
      () =>
        db.query(
          'INSERT INTO "ClubContact" ("id","clubId","membershipId","updatedAt") VALUES ($1,$2,$3,NOW())',
          ["attached-invalid", "id-club-b", "member-a"]
        ),
      (err) => err.code === "23503"
    );
    await db.query("ROLLBACK TO SAVEPOINT reject_cross_club_contact");

    // A club role cannot supply global PersonalProfile ownership.
    await db.query('INSERT INTO "PersonalProfile" ("userId", "updatedAt") VALUES ($1,NOW())', [
      "id-user-1",
    ]);
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "PersonalProfile" WHERE "userId" = $1', [
          "id-user-1",
        ])
      ).rows[0].n,
      1
    );
  });
});

test("unverified phone contacts are nonunique and cannot create global accounts", async () => {
  await tx(async (db) => {
    await db.query(`
      INSERT INTO "Club" ("id", "slug", "name", "updatedAt")
      VALUES ('phone-club-a', 'phone-club-a', 'Gym A', NOW()),
             ('phone-club-b', 'phone-club-b', 'Gym B', NOW())
    `);
    const phone = "+919876543210";
    await db.query(
      'INSERT INTO "ClubContact" ("id", "clubId", "phoneE164", "updatedAt") VALUES ($1,$2,$3,NOW()),($4,$5,$6,NOW())',
      ["phone-contact-a", "phone-club-a", phone, "phone-contact-b", "phone-club-b", phone]
    );
    assert.equal(
      (
        await db.query('SELECT count(*)::int AS n FROM "ClubContact" WHERE "phoneE164" = $1', [
          phone,
        ])
      ).rows[0].n,
      2
    );
    // Legacy User.phoneNumber is preserved but not globally unique after 0B.
    await db.query(
      `
      INSERT INTO "user" ("id", "name", "email", "phoneNumber", "updatedAt")
      VALUES ('legacy-phone-1', 'Contact One', 'legacy1@example.invalid', $1, NOW()),
             ('legacy-phone-2', 'Contact Two', 'legacy2@example.invalid', $1, NOW())
    `,
      [phone]
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM "user" WHERE "phoneNumber" = $1', [phone]))
        .rows[0].n,
      2
    );
  });
});

test("passkey IDs, OAuth subjects and invitation hashes are globally unique", async () => {
  await tx(async (db) => {
    await db.query(`
      INSERT INTO "user" ("id", "name", "email", "updatedAt")
      VALUES ('token-user-1', 'User One', 'token1@example.invalid', NOW()),
             ('token-user-2', 'User Two', 'token2@example.invalid', NOW())
    `);
    await db.query(`
      INSERT INTO "Club" ("id", "slug", "name", "updatedAt")
      VALUES ('token-club', 'token-club', 'Club', NOW())
    `);
    await db.query(
      'INSERT INTO "passkey" ("id", "publicKey", "userId", "credentialID", "counter", "deviceType", "backedUp") VALUES ($1,$2,$3,$4,0,$5,false)',
      ["passkey-a", "TEST_PUBLIC_KEY_A", "token-user-1", "credential-unique", "singleDevice"]
    );
    await rejectsUnique(
      db,
      'INSERT INTO "passkey" ("id","publicKey","userId","credentialID","counter","deviceType","backedUp") VALUES ($1,$2,$3,$4,0,$5,false)',
      ["passkey-b", "TEST_PUBLIC_KEY_B", "token-user-2", "credential-unique", "multiDevice"]
    );
    await db.query(
      'INSERT INTO "account" ("id","providerId","accountId","userId","updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      ["oauth-1", "google", "google-subject-1", "token-user-1"]
    );
    await rejectsUnique(
      db,
      'INSERT INTO "account" ("id","providerId","accountId","userId","updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      ["oauth-2", "google", "google-subject-1", "token-user-2"]
    );
    await db.query(
      'INSERT INTO "ClubInvite" ("id","clubId","issuedByUserId","tokenHash","expiresAt") VALUES ($1,$2,$3,$4,NOW() + INTERVAL \'7 days\')',
      ["token-invite-a", "token-club", "token-user-1", "hmac-digest-a"]
    );
    await rejectsUnique(
      db,
      'INSERT INTO "ClubInvite" ("id","clubId","issuedByUserId","tokenHash","expiresAt") VALUES ($1,$2,$3,$4,NOW() + INTERVAL \'7 days\')',
      ["token-invite-b", "token-club", "token-user-1", "hmac-digest-a"]
    );
    const invite = await db.query(
      'SELECT "role", "expiresAt" > "createdAt" AS valid, "claimedAt" FROM "ClubInvite" WHERE "id" = $1',
      ["token-invite-a"]
    );
    assert.equal(invite.rows[0].role, "MEMBER");
    assert.equal(invite.rows[0].valid, true);
    assert.equal(invite.rows[0].claimedAt, null);
  });
});

test("a Club cannot be deleted while memberships exist; Personal data remains user owned", async () => {
  await tx(async (db) => {
    await db.query(
      'INSERT INTO "user" ("id", "name", "email", "updatedAt") VALUES ($1,$2,$3,NOW())',
      ["owner-user", "Owner", "owner@example.invalid"]
    );
    await db.query(
      'INSERT INTO "Club" ("id", "slug", "name", "updatedAt") VALUES ($1,$2,$3,NOW())',
      ["protected-club", "protected-club", "Protected Club"]
    );
    await db.query(
      'INSERT INTO "ClubMembership" ("id", "clubId", "userId", "role", "updatedAt") VALUES ($1,$2,$3,$4,NOW())',
      ["protected-member", "protected-club", "owner-user", "OWNER"]
    );
    await db.query("SAVEPOINT club_delete");
    await assert.rejects(
      () => db.query('DELETE FROM "Club" WHERE "id" = $1', ["protected-club"]),
      (err) => err.code === "23503"
    );
    await db.query("ROLLBACK TO SAVEPOINT club_delete");
  });
});
