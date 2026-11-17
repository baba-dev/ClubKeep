import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL 17 only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const { ownerInsights, membershipHealth } = await import("../../src/lib/owner-insights.ts");
const { clubLocalDate } = await import("../../src/lib/attendance-calendar.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const DAY = 86_400_000;
// 01:30 on 18 Nov in Asia/Kolkata but still 17 Nov in UTC: exercises club-local day and month edges.
const NOW = new Date("2026-11-17T20:00:00Z");
const TZ = "Asia/Kolkata";
const at = (days) => new Date(NOW.getTime() + days * DAY);

const n = randomUUID().slice(0, 8);
const ids = { user: "b7-u-" + n, x: "b7-x-" + n, y: "b7-y-" + n };
let opSeq = 0;

async function makeClub(id) {
  await db.club.create({
    data: { id, slug: id, name: id, timeZone: TZ, setupStatus: "READY" },
  });
  const plan = await db.clubPlan.create({
    data: {
      clubId: id,
      name: "Monthly",
      durationUnit: "MONTHS",
      durationCount: 1,
      priceMinor: 100000,
      currency: "INR",
    },
  });
  return { clubId: id, planId: plan.id, memberNumber: 0 };
}

async function addMember(club, name, { terms = [], visits = [], joinedAt = at(-40), status } = {}) {
  const member = await db.clubMemberRecord.create({
    data: {
      clubId: club.clubId,
      memberNumber: ++club.memberNumber,
      displayName: name,
      joinedAt,
      ...(status ? { status } : {}),
    },
  });
  for (const [start, end, cancelled] of terms) {
    await db.memberSubscription.create({
      data: {
        clubId: club.clubId,
        memberRecordId: member.id,
        planId: club.planId,
        planName: "Monthly",
        priceMinor: 100000,
        currency: "INR",
        startAt: at(start),
        endAt: at(end),
        cancelledAt: cancelled ? NOW : null,
        operationKey: `b7-op-${n}-${++opSeq}`,
        createdByUserId: ids.user,
      },
    });
  }
  for (const daysAgo of visits) {
    await db.clubAttendance.create({
      data: {
        clubId: club.clubId,
        memberRecordId: member.id,
        localDate: clubLocalDate(at(-daysAgo), TZ),
        method: "MANUAL",
        checkedInByUserId: ids.user,
      },
    });
  }
}

async function cleanup() {
  const clubs = [ids.x, ids.y];
  const run = (sql) => pool.query(sql, [clubs]);
  await run('DELETE FROM "ClubAttendance" WHERE "clubId" = ANY($1)');
  await run('DELETE FROM "MemberSubscription" WHERE "clubId" = ANY($1)');
  await run('DELETE FROM "ClubMemberRecord" WHERE "clubId" = ANY($1)');
  await run('DELETE FROM "ClubPlan" WHERE "clubId" = ANY($1)');
  await run('DELETE FROM "Club" WHERE "id" = ANY($1)');
  await pool.query('DELETE FROM "user" WHERE "id" = $1', [ids.user]);
}

test.before(async () => {
  await db.user.create({
    data: { id: ids.user, name: "Insights Tester", email: ids.user + "@example.invalid" },
  });
  const x = await makeClub(ids.x);
  const y = await makeClub(ids.y);
  await addMember(x, "A lapsing", { terms: [[-27, 3]], visits: [0, 1, 2] });
  await addMember(x, "B active", { terms: [[-5, 60]], visits: [0, 9] });
  await addMember(x, "C lapsed", { terms: [[-35, -5]] });
  await addMember(x, "D long gone", { terms: [[-90, -45]] });
  await addMember(x, "E never subscribed");
  await addMember(x, "F cancelled term", { terms: [[-5, 20, true]] });
  await addMember(x, "G renewed", {
    terms: [
      [-40, -10],
      [-10, 20],
    ],
    visits: [3],
  });
  await addMember(x, "Archived with live term", {
    terms: [[-5, 3]],
    visits: [1],
    status: "ARCHIVED",
  });
  // 20:00Z on 31 Oct is 1 Nov in Asia/Kolkata: must count as a November join.
  await addMember(x, "J joined at month edge", { joinedAt: new Date("2026-10-31T20:00:00Z") });
  await addMember(y, "Other club lapsing", { terms: [[-27, 2]], visits: [0, 1, 2, 3] });
});

test.after(async () => {
  try {
    await cleanup();
  } finally {
    await db.$disconnect();
    await pool.end();
  }
});

test("membership health classifies by non-cancelled terms of ACTIVE members only", async () => {
  const health = await membershipHealth(db, ids.x, NOW);
  assert.deepEqual(health.counts, { ACTIVE: 2, LAPSING: 1, LAPSED: 1, UPCOMING: 0, INACTIVE: 4 });
  assert.equal(health.total, 8, "archived members are not on the active roster");
  assert.deepEqual(
    health.lapsing.map((m) => m.name),
    ["A lapsing"]
  );
  assert.deepEqual(
    health.lapsed.map((m) => m.name),
    ["C lapsed"]
  );
});

test("insights never include another club's members or visits", async () => {
  const x = await ownerInsights(db, ids.x, TZ, NOW);
  const y = await ownerInsights(db, ids.y, TZ, NOW);
  assert.equal(x.attendance.totalVisits, 7, "A 3 + B 2 + G 1 + archived 1; club Y excluded");
  assert.equal(y.attendance.totalVisits, 4);
  assert.equal(y.health.counts.LAPSING, 1);
  assert.deepEqual(
    y.health.lapsing.map((m) => m.name),
    ["Other club lapsing"]
  );
  assert.equal(
    x.health.lapsing.some((m) => m.name.startsWith("Other")),
    false
  );
});

test("renewal rate counts later non-cancelled terms within the window", async () => {
  const { renewals } = await ownerInsights(db, ids.x, TZ, NOW);
  // Ended in the last 30 days: C (-5) and G's first term (-10). Only G has a later term.
  assert.deepEqual(
    { ended: renewals.ended, renewed: renewals.renewed, ratePercent: renewals.ratePercent },
    { ended: 2, renewed: 1, ratePercent: 50 }
  );
});

test("attendance uses club-local days, zero-fills and counts unique members", async () => {
  const { attendance, today } = await ownerInsights(db, ids.x, TZ, NOW);
  assert.equal(today, "2026-11-18", "club-local day is ahead of UTC");
  assert.equal(attendance.daily.length, 28);
  assert.equal(attendance.daily.at(-1).key, "2026-11-18");
  assert.equal(attendance.daily.at(-1).value, 2, "A and B visited today");
  // Check-ins are ledger facts, so an archived member's visit still counts.
  assert.equal(attendance.uniqueMembersWeek, 4, "A, B, G and the archived member");
  assert.equal(attendance.uniqueMembersMonth, 4);
  assert.equal(
    attendance.weekdays.reduce((sum, d) => sum + d.value, 0),
    7
  );
});

test("growth buckets joins by club-local month and plan mix ignores cancelled terms", async () => {
  const { growth, plans } = await ownerInsights(db, ids.x, TZ, NOW);
  assert.equal(growth.length, 6);
  assert.deepEqual(growth.slice(-2), [
    { key: "2026-10", value: 8 },
    { key: "2026-11", value: 1 },
  ]);
  assert.deepEqual(plans, [{ plan: "Monthly", members: 3 }], "A, B and G; F is cancelled");
});
