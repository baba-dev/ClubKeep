import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";

assert.ok(process.env.DATABASE_URL, "Run on disposable migrated ClubKeep PostgreSQL 17 only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const svc = await import("../../src/lib/personal/personal-service.ts");
const explorer = await import("../../src/lib/personal/muscle-explorer-service.ts");

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
test.after(() => pool.end());

const NOW = new Date("2026-11-18T12:00:00Z");
class Rollback extends Error {}
async function inRolledBackTx(fn) {
  await assert.rejects(
    db.$transaction(async (tx) => {
      await fn(tx);
      throw new Rollback();
    }),
    (err) => err instanceof Rollback
  );
}
const newUser = (tx, tag) =>
  tx.user.create({
    data: {
      id: `ps-${tag}-${randomUUID().slice(0, 8)}`,
      name: "Personal Tester",
      email: `ps-${randomUUID().slice(0, 10)}@example.invalid`,
    },
  });
const rejectsWith = (p, status) =>
  assert.rejects(p, (e) => e.status === status, `expected status ${status}`);

test("measurements require a known adult and a plausible value", async () => {
  await inRolledBackTx(async (tx) => {
    const u = await newUser(tx, "gate");
    const input = { kind: "WEIGHT", value: 72.5 };
    await rejectsWith(svc.logMeasurement(tx, u.id, input, NOW), 403); // no birth year
    await svc.updateBio(tx, u.id, { birthYear: 2015 });
    await rejectsWith(svc.logMeasurement(tx, u.id, input, NOW), 403); // minor
    await svc.updateBio(tx, u.id, { birthYear: 1990 });
    await rejectsWith(svc.logMeasurement(tx, u.id, { kind: "WEIGHT", value: 720 }, NOW), 400);
    await rejectsWith(
      svc.logMeasurement(tx, u.id, { ...input, measuredAt: "2027-01-01T00:00:00Z" }, NOW),
      400
    );
    await svc.logMeasurement(tx, u.id, input, NOW);
    const row = await tx.personalMeasurement.findFirst({ where: { userId: u.id } });
    assert.equal(row.value, 72500); // grams, integer
  });
});

test("imperial entries are converted to integer metric storage", async () => {
  await inRolledBackTx(async (tx) => {
    const u = await newUser(tx, "imp");
    await svc.updateBio(tx, u.id, { birthYear: 1990, units: "IMPERIAL", heightCm: 180 });
    await svc.logMeasurement(tx, u.id, { kind: "WAIST", value: 32 }, NOW);
    const row = await tx.personalMeasurement.findFirst({ where: { userId: u.id } });
    assert.equal(row.value, 813);
    const overview = await svc.getOverview(tx, u.id, NOW);
    assert.equal(overview.measurements.WAIST[0].value, 32);
    assert.equal(overview.profile.heightCm, 180);
  });
});

test("one user can never read or delete another user's measurements", async () => {
  await inRolledBackTx(async (tx) => {
    const a = await newUser(tx, "a");
    const b = await newUser(tx, "b");
    for (const u of [a, b]) await svc.updateBio(tx, u.id, { birthYear: 1990 });
    const { id } = await svc.logMeasurement(tx, a.id, { kind: "WEIGHT", value: 80 }, NOW);

    const bView = await svc.getOverview(tx, b.id, NOW);
    assert.deepEqual(bView.measurements, {});
    const bExport = await svc.exportPersonalData(tx, b.id, NOW);
    assert.equal(bExport.measurements.length, 0);

    await rejectsWith(svc.deleteMeasurement(tx, b.id, id), 404);
    assert.equal(await tx.personalMeasurement.count({ where: { id } }), 1);
    await svc.deleteMeasurement(tx, a.id, id);
    assert.equal(await tx.personalMeasurement.count({ where: { id } }), 0);
  });
});

async function gymFixture(tx, user, visits, otherUser) {
  const n = randomUUID().slice(0, 8);
  const club = await tx.club.create({
    data: {
      id: `ps-c-${n}`,
      slug: `ps-c-${n}`,
      name: "Signal Gym",
      vertical: "GYM",
      setupStatus: "READY",
    },
  });
  const mk = async (u, number) => {
    const membership = await tx.clubMembership.create({
      data: { clubId: club.id, userId: u.id, role: "MEMBER", status: "ACTIVE" },
    });
    return tx.clubMemberRecord.create({
      data: {
        clubId: club.id,
        memberNumber: number,
        displayName: "M" + number,
        membershipId: membership.id,
      },
    });
  };
  const mine = await mk(user, 1);
  const theirs = await mk(otherUser, 2);
  const visit = (record, daysAgo) =>
    tx.clubAttendance.create({
      data: {
        clubId: club.id,
        memberRecordId: record.id,
        localDate: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10),
        checkedInAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
        method: "MANUAL",
        checkedInByUserId: user.id,
      },
    });
  for (let i = 0; i < visits; i++) await visit(mine, i + 1);
  for (let i = 0; i < 20; i++) await visit(theirs, i + 1); // must never count for the other user
  return club;
}

test("club attendance shapes the map only with consent, only for the user's own visits", async () => {
  await inRolledBackTx(async (tx) => {
    const me = await newUser(tx, "me");
    const other = await newUser(tx, "other");
    const club = await gymFixture(tx, me, 8, other);

    // No consent yet: attendance is ignored.
    let view = await svc.getOverview(tx, me.id, NOW);
    assert.equal(view.clubs[0].enabled, false);
    assert.equal(view.load.quadriceps, 0);

    await svc.setClubSignalConsent(tx, me.id, club.id, true);
    view = await svc.getOverview(tx, me.id, NOW);
    assert.equal(view.clubs[0].visits28d, 8); // only my 8, not the other member's 20
    assert.equal(view.clubs[0].perWeek, 2);
    assert.ok(view.load.quadriceps > 0);

    // Revoking removes the effect immediately; nothing was stored to clean up.
    await svc.setClubSignalConsent(tx, me.id, club.id, false);
    view = await svc.getOverview(tx, me.id, NOW);
    assert.equal(view.load.quadriceps, 0);
    assert.equal(await tx.personalActivity.count({ where: { userId: me.id } }), 0);
  });
});

test("consent cannot be enabled for a club the user does not belong to, but can always be revoked", async () => {
  await inRolledBackTx(async (tx) => {
    const me = await newUser(tx, "me2");
    const other = await newUser(tx, "other2");
    const stranger = await newUser(tx, "stranger");
    const club = await gymFixture(tx, me, 1, other);
    await assert.rejects(
      svc.setClubSignalConsent(tx, stranger.id, club.id, true),
      (e) => e.name === "AccessDeniedError" || e.constructor.name === "AccessDeniedError"
    );
    await svc.setClubSignalConsent(tx, stranger.id, club.id, false);
    const row = await tx.personalClubSignalConsent.findFirst({ where: { userId: stranger.id } });
    assert.equal(row.enabled, false);
  });
});

test("activities replace the set, and delete-all erases personal data but keeps the account", async () => {
  const u = await newUser(db, "wipe");
  try {
    await svc.updateBio(db, u.id, { birthYear: 1990, goal: "STRENGTH", heightCm: 175 });
    await svc.logMeasurement(db, u.id, { kind: "WEIGHT", value: 70 }, NOW);
    await svc.setActivities(db, u.id, [
      { key: "yoga", sessionsPerWeek: 3 },
      { key: "running", sessionsPerWeek: 2 },
    ]);
    await svc.setActivities(db, u.id, [{ key: "yoga", sessionsPerWeek: 1 }]);
    const left = await db.personalActivity.findMany({ where: { userId: u.id } });
    assert.deepEqual(
      left.map((a) => [a.activityKey, a.sessionsPerWeek]),
      [["yoga", 1]]
    );

    await svc.deleteAllPersonalData(db, u.id);
    assert.equal(await db.personalMeasurement.count({ where: { userId: u.id } }), 0);
    assert.equal(await db.personalActivity.count({ where: { userId: u.id } }), 0);
    const profile = await db.personalProfile.findUnique({ where: { userId: u.id } });
    assert.equal(profile.birthYear, null);
    assert.equal(profile.heightMm, null);
    assert.equal(profile.goal, null);
    assert.ok(await db.user.findUnique({ where: { id: u.id } }), "the account must remain");
  } finally {
    await db.user.delete({ where: { id: u.id } }); // cascades any leftover Personal rows
  }
});

async function withWellness(value, task) {
  const before = process.env.PERSONAL_WELLNESS_ENABLED;
  process.env.PERSONAL_WELLNESS_ENABLED = value;
  try {
    await task();
  } finally {
    if (before === undefined) delete process.env.PERSONAL_WELLNESS_ENABLED;
    else process.env.PERSONAL_WELLNESS_ENABLED = before;
  }
}
const addWorkout = (tx, userId, daysAgo, exercises) =>
  tx.workoutSession.create({
    data: {
      userId,
      requestId: `ps-w-${randomUUID()}`,
      title: "Session",
      activityKey: "gym-lifting",
      startedAt: new Date(NOW.getTime() - daysAgo * 86_400_000 - 3_600_000),
      endedAt: new Date(NOW.getTime() - daysAgo * 86_400_000),
      durationMinutes: 60,
      exercises: {
        create: exercises.map((name, position) => ({
          name,
          position,
          sets: { create: [{ position: 0, reps: 8, weightGrams: 50000 }] },
        })),
      },
    },
  });

test("the muscle explorer stays dark while wellness is off and for non-adults", async () => {
  await inRolledBackTx(async (tx) => {
    const adult = await newUser(tx, "xa");
    const minor = await newUser(tx, "xm");
    await svc.updateBio(tx, adult.id, { birthYear: 1990 });
    await svc.updateBio(tx, minor.id, { birthYear: 2015 });
    await addWorkout(tx, adult.id, 1, ["Bench press"]);
    await addWorkout(tx, minor.id, 1, ["Bench press"]);

    await withWellness("false", async () => {
      assert.equal((await explorer.getMuscleExplorer(tx, adult.id, NOW)).logged, null);
    });
    await withWellness("true", async () => {
      assert.ok((await explorer.getMuscleExplorer(tx, adult.id, NOW)).logged);
      assert.equal((await explorer.getMuscleExplorer(tx, minor.id, NOW)).logged, null);
    });
  });
});

test("the muscle explorer maps only the signed-in user's own workouts", async () => {
  await inRolledBackTx(async (tx) => {
    const me = await newUser(tx, "xme");
    const other = await newUser(tx, "xother");
    for (const u of [me, other]) await svc.updateBio(tx, u.id, { birthYear: 1990 });
    await addWorkout(tx, me.id, 2, ["Back squat"]);
    await addWorkout(tx, me.id, 40, ["Bench press"]); // outside the 28 day window, inside 90
    for (let i = 1; i <= 10; i++) await addWorkout(tx, other.id, i, ["Pull-up"]); // never mine

    await withWellness("true", async () => {
      const { logged } = await explorer.getMuscleExplorer(tx, me.id, NOW);
      assert.equal(logged[28].workouts, 1);
      assert.equal(logged[90].workouts, 2);
      assert.equal(logged[28].setEquivalents.lats, 0); // the other user's pull-ups
      assert.ok(logged[28].setEquivalents.quadriceps > 0);
      assert.equal(logged[28].setEquivalents.pectorals, 0); // bench was 40 days ago
      assert.ok(logged[90].setEquivalents.pectorals > 0);
      assert.equal(logged[28].lastWorkedDaysAgo.quadriceps, 2);
      assert.deepEqual(logged[28].unmatchedExercises, []);
    });
  });
});

test("the replay timeline covers 28 days for the user's own workouts and is absent when gated off", async () => {
  await inRolledBackTx(async (tx) => {
    const me = await newUser(tx, "tl");
    const other = await newUser(tx, "tlo");
    for (const u of [me, other]) await svc.updateBio(tx, u.id, { birthYear: 1990 });
    await addWorkout(tx, me.id, 3, ["Bench press"]);
    for (let i = 0; i < 6; i++) await addWorkout(tx, other.id, i, ["Pull-up"]); // never mine

    await withWellness("false", async () => {
      assert.equal((await explorer.getMuscleExplorer(tx, me.id, NOW)).timeline, null);
    });
    await withWellness("true", async () => {
      const { timeline } = await explorer.getMuscleExplorer(tx, me.id, NOW);
      assert.equal(timeline.days.length, 28);
      assert.equal(timeline.days[27].date, "2026-11-18");
      assert.ok(timeline.max > 0);
      assert.ok(timeline.days.every((d) => d.setEquivalents.lats === 0)); // the other user's pull-ups
      assert.ok(timeline.days[27].setEquivalents.pectorals > 0);
    });
  });
});
