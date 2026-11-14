import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import pg from "pg";
assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL 17 only");
const { Client } = pg;
async function withinTx(fn) {
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
async function reject(db, sql, values, code) {
  await db.query("SAVEPOINT expected_failure");
  try {
    await assert.rejects(
      () => db.query(sql, values),
      (err) => err.code === code
    );
  } finally {
    await db.query("ROLLBACK TO SAVEPOINT expected_failure");
  }
}
async function fixture(db) {
  const n = randomUUID().slice(0, 8),
    user = "b4-u-" + n,
    club = "b4-a-" + n,
    foreignClub = "b4-b-" + n;
  const member = "b4-m-" + n,
    plan = "b4-plan-" + n,
    term = "b4-term-" + n;
  await db.query(
    'INSERT INTO "user" ("id","name","email","updatedAt") VALUES ($1,\'Bookkeeper\',$2,NOW())',
    [user, user + "@example.invalid"]
  );
  await db.query(
    'INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Club One\',NOW()),($2,$2,\'Club Two\',NOW())',
    [club, foreignClub]
  );
  await db.query(
    'INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","updatedAt") VALUES ($1,$2,1,\'Walk-in Member\',NOW())',
    [member, club]
  );
  await db.query(
    'INSERT INTO "ClubPlan" ("id","clubId","name","durationUnit","durationCount","priceMinor","currency","updatedAt") VALUES ($1,$2,\'Monthly\',\'MONTHS\',1,15000,\'INR\',NOW())',
    [plan, club]
  );
  await db.query(
    'INSERT INTO "MemberSubscription" ("id","clubId","memberRecordId","planId","planName","priceMinor","currency","startAt","endAt","operationKey","createdByUserId") VALUES ($1,$2,$3,$4,\'Monthly\',15000,\'INR\',NOW(),NOW()+INTERVAL \'1 month\',$5,$6)',
    [term, club, member, plan, "b4-term-op-" + n, user]
  );
  return { n, user, club, foreignClub, member, term };
}
function insertSQL() {
  return 'INSERT INTO "ClubPayment" ("id","clubId","memberRecordId","subscriptionId","receiptNo","operationKey","amountMinor","currency","method","recordedByUserId","clubName","memberName","memberNumber","planName","termPriceMinor","termStartsAt","termEndsAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,\'CASH\',$9,\'Club One\',\'Walk-in Member\',1,\'Monthly\',15000,NOW(),NOW()+INTERVAL \'1 month\')';
}
test("B4 denies cross-club member/term use, zero money, duplicate receipts and idempotency keys", async () => {
  await withinTx(async (db) => {
    const f = await fixture(db),
      payment = "b4-pay-" + f.n,
      key = "b4-payment-op-" + f.n;
    const good = [payment, f.club, f.member, f.term, 1, key, 5000, "INR", f.user];
    await db.query(insertSQL(), good);
    await reject(
      db,
      insertSQL(),
      [
        "b4-foreign-" + f.n,
        f.foreignClub,
        f.member,
        f.term,
        2,
        key + "foreign",
        100,
        "INR",
        f.user,
      ],
      "23503"
    );
    await reject(
      db,
      insertSQL(),
      ["b4-zero-" + f.n, f.club, f.member, f.term, 2, key + "zero", 0, "INR", f.user],
      "23514"
    );
    await reject(
      db,
      insertSQL(),
      ["b4-negative-" + f.n, f.club, f.member, f.term, 2, key + "negative", -1, "INR", f.user],
      "23514"
    );
    await reject(
      db,
      insertSQL(),
      ["b4-dupno-" + f.n, f.club, f.member, f.term, 1, key + "duplicate", 1, "INR", f.user],
      "23505"
    );
    await reject(
      db,
      insertSQL(),
      ["b4-dupkey-" + f.n, f.club, f.member, f.term, 2, key, 1, "INR", f.user],
      "23505"
    );
    await reject(
      db,
      insertSQL(),
      ["b4-badcurrency-" + f.n, f.club, f.member, f.term, 2, key + "currency", 10, "123", f.user],
      "23514"
    );
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM "ClubPayment" WHERE "clubId"=$1', [f.club]))
        .rows[0].n,
      1
    );
  });
});
test("B4 appends one reversal, never rewrites or deletes historical payments or reversals", async () => {
  await withinTx(async (db) => {
    const f = await fixture(db),
      payment = "b4-pay-" + f.n,
      key = "b4-payment-op-" + f.n;
    await db.query(insertSQL(), [payment, f.club, f.member, f.term, 1, key, 5000, "INR", f.user]);
    await reject(
      db,
      'UPDATE "ClubPayment" SET "amountMinor"=2000 WHERE "id"=$1',
      [payment],
      "P0001"
    );
    await reject(db, 'DELETE FROM "ClubPayment" WHERE "id"=$1', [payment], "P0001");
    await db.query(
      'INSERT INTO "ClubPaymentReversal" ("id","clubId","paymentId","reason","reversedByUserId") VALUES ($1,$2,$3,$4,$5)',
      ["b4-rev-" + f.n, f.club, payment, "Mistaken collection entered twice", f.user]
    );
    await reject(
      db,
      'INSERT INTO "ClubPaymentReversal" ("id","clubId","paymentId","reason","reversedByUserId") VALUES ($1,$2,$3,$4,$5)',
      ["b4-other-rev-" + f.n, f.club, payment, "Mistaken collection entered twice", f.user],
      "23505"
    );
    await reject(
      db,
      'UPDATE "ClubPaymentReversal" SET "reason"=$2 WHERE "paymentId"=$1',
      [payment, "Some other reason"],
      "P0001"
    );
    await reject(db, 'DELETE FROM "ClubPaymentReversal" WHERE "paymentId"=$1', [payment], "P0001");
    const p = (
      await db.query(
        'SELECT p."amountMinor",r."reason" FROM "ClubPayment" p LEFT JOIN "ClubPaymentReversal" r ON r."paymentId"=p."id" WHERE p."id"=$1',
        [payment]
      )
    ).rows[0];
    assert.equal(p.amountMinor, 5000);
    assert.equal(p.reason, "Mistaken collection entered twice");
    await db.query('UPDATE "MemberSubscription" SET "cancelledAt"=NOW() WHERE "id"=$1', [f.term]);
    assert.equal(
      (await db.query('SELECT count(*)::int n FROM "ClubPayment" WHERE "id"=$1', [payment])).rows[0]
        .n,
      1
    );
  });
});
