import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { effectiveTier } from "../../src/lib/billing/policy.ts";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL only");
const url = new URL(process.env.DATABASE_URL);
const dbName = decodeURIComponent(url.pathname.slice(1));
const port = url.port || "5432";
assert.match(
  dbName,
  /^clubkeep(_[a-z0-9_]+)?$/,
  "The ops script only accepts ClubKeep-scoped databases"
);

const SCRIPT = "infra/billing/clubkeep-billing-ops.sh";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const n = randomUUID().slice(0, 8);
const clubIds = [];
const DAY = 86_400_000;

function ops(...args) {
  const cmd = process.getuid?.() === 0 ? ["bash"] : ["sudo", "bash"];
  const result = spawnSync(
    cmd[0],
    [...cmd.slice(1), SCRIPT, ...args, "--db", dbName, "--port", port],
    {
      encoding: "utf8",
      timeout: 30_000,
    }
  );
  return { status: result.status, out: result.stdout + result.stderr };
}

function opsRaw(...args) {
  const root = process.getuid?.() === 0;
  const result = spawnSync(root ? "bash" : "sudo", [...(root ? [] : ["bash"]), SCRIPT, ...args], {
    encoding: "utf8",
    timeout: 30_000,
  });
  return { status: result.status, out: result.stdout + result.stderr };
}

async function makeClub(label, { tier = "FREE", subscription } = {}) {
  const id = `b8ops-${n}-${label}`;
  clubIds.push(id);
  await db.query(
    'INSERT INTO "Club" ("id","slug","name","businessTier","updatedAt") VALUES ($1,$1,$1,$2,NOW())',
    [id, tier]
  );
  if (subscription) {
    const { status, subTier = "GROWTH", periodEndDays = null, pastDueDays = null } = subscription;
    await db.query(
      `INSERT INTO "ClubSubscription" ("id","clubId","tier","provider","status","providerSubscriptionId","currency","amountMinor","chargeAmountMinor","countryCode","currentPeriodEnd","pastDueSince","createdByUserId","updatedAt")
       VALUES ($1,$2,$3,'RAZORPAY',$4,$5,'INR',29900,35282,'IN',
         CASE WHEN $6::float8 IS NULL THEN NULL ELSE (NOW() AT TIME ZONE 'UTC') + ($6::float8 * INTERVAL '1 day') END,
         CASE WHEN $7::float8 IS NULL THEN NULL ELSE (NOW() AT TIME ZONE 'UTC') - ($7::float8 * INTERVAL '1 day') END,
         'op',NOW())`,
      [`${id}-sub`, id, subTier, status, `sub_${n}_${label}`, periodEndDays, pastDueDays]
    );
  }
  return id;
}
const tierOf = async (id) =>
  (await db.query('SELECT "businessTier" FROM "Club" WHERE id=$1', [id])).rows[0].businessTier;
const audits = async (ids) =>
  (
    await db.query(
      `SELECT "clubId","referenceId" FROM "SecurityEvent" WHERE "clubId" = ANY($1) AND "eventType"='BILLING_TIER_CHANGED' ORDER BY "createdAt"`,
      [ids]
    )
  ).rows;

test.before(() => db.connect());
test.after(async () => {
  try {
    await db.query('DELETE FROM "SecurityEvent" WHERE "clubId" = ANY($1)', [clubIds]);
    await db.query('DELETE FROM "ClubSubscription" WHERE "clubId" = ANY($1)', [clubIds]);
    await db.query('DELETE FROM "Club" WHERE "id" = ANY($1)', [clubIds]);
  } finally {
    await db.end();
  }
});

test("malformed or hostile arguments are rejected before any database change", async () => {
  const club = await makeClub("guard");
  const bad = [
    [],
    ["bogus"],
    ["grant", "--club", `${club}';select 1;--`, "--tier", "STARTER", "--reason", "pilot gym"],
    ["grant", "--club", club, "--tier", "starter", "--reason", "pilot gym"],
    ["grant", "--club", club, "--tier", "FREE", "--reason", "pilot gym"],
    ["grant", "--club", club, "--tier", "STARTER", "--reason", "hi"],
    ["grant", "--club", club, "--tier", "STARTER"],
    ["grant", "--club", club, "--tier", "STARTER", "--reason", "pilot gym", "--port", "abc"],
    ["revoke", "--club", club, "--tier", "STARTER", "--reason", "pilot gym"],
    ["list", "--execute"],
    ["reconcile", "--club", club],
  ];
  for (const args of bad) {
    const r = ops(...args);
    assert.notEqual(r.status, 0, JSON.stringify(args));
  }
  // Raw invocations (no helper-appended --db/--port) for connection arguments.
  for (const args of [
    ["list", "--db", "postgres", "--port", port],
    ["list", "--db", dbName, "--port", "abc"],
    ["list", "--db", dbName, "--port", "70000"],
    ["list", "--db", dbName, "--db", dbName, "--port", port],
    [
      "grant",
      "--club",
      club,
      "--club",
      club,
      "--tier",
      "PRO",
      "--reason",
      "twice",
      "--db",
      dbName,
      "--port",
      port,
    ],
  ]) {
    assert.notEqual(opsRaw(...args).status, 0, JSON.stringify(args));
  }
  assert.equal(await tierOf(club), "FREE");
  assert.equal((await audits([club])).length, 0);
});

test("grant is a dry run by default, then applies once with an audit row", async () => {
  const club = await makeClub("grant");
  const reason = "pilot gym onboarding";
  let r = ops("grant", "--club", club, "--tier", "STARTER", "--reason", reason);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /DRY RUN/);
  assert.equal(await tierOf(club), "FREE", "dry run changes nothing");
  assert.equal((await audits([club])).length, 0, "and writes no audit row");

  r = ops("grant", "--club", club, "--tier", "STARTER", "--reason", reason, "--execute");
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /FREE -> STARTER/);
  assert.equal(await tierOf(club), "STARTER");
  const rows = await audits([club]);
  assert.equal(rows.length, 1);
  assert.match(
    rows[0].referenceId,
    new RegExp(`^operator-grant:STARTER:by=[a-z_][a-z0-9_-]*:${reason}$`)
  );

  r = ops("grant", "--club", club, "--tier", "STARTER", "--reason", reason, "--execute");
  assert.equal(r.status, 0);
  assert.match(r.out, /already STARTER/);
  assert.equal((await audits([club])).length, 1, "a repeat writes nothing");
});

test("grant and revoke refuse unknown, inactive and subscribed clubs", async () => {
  const subscribed = await makeClub("subd", { tier: "GROWTH", subscription: { status: "ACTIVE" } });
  for (const verb of [["grant", "--tier", "PRO"], ["revoke"]]) {
    const r = ops(
      verb[0],
      "--club",
      subscribed,
      ...verb.slice(1),
      "--reason",
      "should be refused",
      "--execute"
    );
    assert.notEqual(r.status, 0);
    assert.match(r.out, /paid subscription/);
  }
  assert.equal(await tierOf(subscribed), "GROWTH");
  assert.equal((await audits([subscribed])).length, 0);

  const missing = ops(
    "grant",
    "--club",
    `b8ops-${n}-nope`,
    "--tier",
    "PRO",
    "--reason",
    "no such club",
    "--execute"
  );
  assert.notEqual(missing.status, 0);
  assert.match(missing.out, /No such club/);

  const inactive = await makeClub("inactive");
  await db
    .query(`UPDATE "Club" SET "status"='SUSPENDED' WHERE id=$1`, [inactive])
    .catch(() => null);
  const statusNow = (await db.query('SELECT status FROM "Club" WHERE id=$1', [inactive])).rows[0]
    .status;
  if (statusNow !== "ACTIVE") {
    const r = ops(
      "grant",
      "--club",
      inactive,
      "--tier",
      "PRO",
      "--reason",
      "suspended club",
      "--execute"
    );
    assert.notEqual(r.status, 0);
    assert.equal(await tierOf(inactive), "FREE");
  }
});

test("a club can be found by slug, listed as complimentary, and revoked", async () => {
  const club = await makeClub("revoke", { tier: "GROWTH" });
  const subscribed = await makeClub("listsub", { subscription: { status: "ACTIVE" } });
  const list = ops("list");
  assert.equal(list.status, 0, list.out);
  const rowOf = (id) => list.out.split("\n").find((line) => line.startsWith(id + "|"));
  assert.match(rowOf(club), /\|GROWTH\|complimentary\|-\|/);
  assert.match(rowOf(subscribed), /\|subscription\|ACTIVE\|/);

  let r = ops("revoke", "--club", club, "--reason", "pilot ended");
  assert.match(r.out, /DRY RUN/);
  assert.equal(await tierOf(club), "GROWTH");
  r = ops("revoke", "--club", club, "--reason", "pilot ended", "--execute");
  assert.equal(r.status, 0, r.out);
  assert.equal(await tierOf(club), "FREE");
  assert.match((await audits([club]))[0].referenceId, /^operator-revoke:FREE:by=/);
  r = ops("revoke", "--club", club, "--reason", "pilot ended", "--execute");
  assert.match(r.out, /already FREE/);
});

// Each case: [label, stored tier, subscription]. Margins are whole days so the
// DB clock and this process clock cannot disagree about which side they fall on.
const MATRIX = [
  ["active-upgrade", "FREE", { status: "ACTIVE", subTier: "GROWTH", periodEndDays: 20 }],
  ["active-same", "STARTER", { status: "ACTIVE", subTier: "STARTER", periodEndDays: 20 }],
  ["past-due-in-grace", "GROWTH", { status: "PAST_DUE", subTier: "GROWTH", pastDueDays: 6 }],
  ["past-due-in-grace-stale", "FREE", { status: "PAST_DUE", subTier: "PRO", pastDueDays: 3 }],
  ["past-due-expired", "GROWTH", { status: "PAST_DUE", subTier: "GROWTH", pastDueDays: 8 }],
  ["past-due-no-clock", "GROWTH", { status: "PAST_DUE", subTier: "GROWTH" }],
  [
    "cancelled-paid-through",
    "STARTER",
    { status: "CANCELLED", subTier: "STARTER", periodEndDays: 2 },
  ],
  ["cancelled-ended", "STARTER", { status: "CANCELLED", subTier: "STARTER", periodEndDays: -2 }],
  ["cancelled-no-end", "PRO", { status: "CANCELLED", subTier: "PRO" }],
  ["expired", "PRO", { status: "EXPIRED", subTier: "PRO", periodEndDays: -30 }],
  ["pending-keeps-hand-set", "GROWTH", { status: "PENDING", subTier: "PRO" }],
  ["pending-free", "FREE", { status: "PENDING", subTier: "PRO" }],
];

test("reconcile matches effectiveTier() for every state, is idempotent, and never touches other clubs", async () => {
  const subscribed = [];
  const expected = new Map();
  for (const [label, stored, sub] of MATRIX) {
    const id = await makeClub(label, { tier: stored, subscription: sub });
    subscribed.push(id);
    expected.set(
      id,
      effectiveTier(
        {
          tier: sub.subTier ?? "GROWTH",
          status: sub.status,
          currentPeriodEnd:
            sub.periodEndDays == null ? null : new Date(Date.now() + sub.periodEndDays * DAY),
          pastDueSince:
            sub.pastDueDays == null ? null : new Date(Date.now() - sub.pastDueDays * DAY),
        },
        stored,
        new Date()
      )
    );
  }
  const comp = await makeClub("recon-comp", { tier: "STARTER" });
  const legacy = await makeClub("recon-legacy", { tier: "PRO" });
  const before = new Map();
  for (const id of subscribed) before.set(id, await tierOf(id));
  const expectedChanges = subscribed.filter((id) => expected.get(id) !== before.get(id));
  assert.ok(expectedChanges.length >= 5, "the matrix exercises real changes");

  let r = ops("reconcile");
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /DRY RUN/);
  for (const id of subscribed)
    assert.equal(await tierOf(id), before.get(id), "dry run changes nothing");
  assert.equal((await audits(subscribed)).length, 0);

  r = ops("reconcile", "--execute");
  assert.equal(r.status, 0, r.out);
  for (const id of subscribed) {
    assert.equal(
      await tierOf(id),
      expected.get(id),
      `${id}: SQL reconcile agrees with effectiveTier()`
    );
  }
  assert.equal(await tierOf(comp), "STARTER", "complimentary club untouched");
  assert.equal(await tierOf(legacy), "PRO", "hand-set club untouched");
  const rows = await audits(subscribed);
  assert.equal(
    rows.length,
    expectedChanges.length,
    "one audit row per change, none for unchanged clubs"
  );
  assert.ok(rows.every((row) => /^operator-reconcile:by=/.test(row.referenceId)));

  r = ops("reconcile", "--execute");
  assert.match(r.out, /already match/);
  assert.equal(
    (await audits(subscribed)).length,
    expectedChanges.length,
    "second run writes nothing"
  );
});
