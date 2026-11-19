import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";
assert.ok(process.env.DATABASE_URL, "Run against migrated disposable PostgreSQL only");
register("./helpers/src-alias-hook.mjs", import.meta.url);
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const [profile, goals, workouts, sleep, diet, recovery, insights] = await Promise.all([
  import("../../src/lib/personal/personal-service.ts"),
  import("../../src/lib/personal/wellness-goals.ts"),
  import("../../src/lib/personal/wellness-workouts.ts"),
  import("../../src/lib/personal/wellness-sleep.ts"),
  import("../../src/lib/personal/wellness-nutrition.ts"),
  import("../../src/lib/personal/wellness-recovery.ts"),
  import("../../src/lib/personal/wellness-insights.ts"),
]);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
test.after(() => pool.end());
const now = new Date();
const uid = () => randomUUID();
const mk = async (name) =>
  db.user.create({ data: { name, email: "wellness-" + uid() + "@example.invalid" } });

test("P1-B private wellness records are isolated, idempotent, counted and erased", async () => {
  const a = await mk("Adult A"),
    b = await mk("Adult B");
  try {
    await profile.updateBio(db, a.id, { birthYear: 1990 });
    await profile.updateBio(db, b.id, { birthYear: 1990 });
    const g = await goals.createGoal(db, a.id, {
      title: "Move weekly",
      metric: "WORKOUT_SESSIONS",
      target: 3,
      cadence: "WEEKLY",
    });
    const ending = new Date(now.getTime() - 3600000);
    const starting = new Date(ending.getTime() - 30 * 60000);
    const requestId = uid();
    const w = {
      requestId,
      title: "Run",
      activityKey: "running",
      startedAt: starting.toISOString(),
      endedAt: ending.toISOString(),
      durationMinutes: 30,
      exercises: [],
    };
    const first = await workouts.createWorkout(db, a.id, w);
    const replay = await workouts.createWorkout(db, a.id, w);
    assert.equal(first.id, replay.id);
    assert.equal(await db.workoutSession.count({ where: { userId: a.id } }), 1);
    await assert.rejects(workouts.removeWorkout(db, b.id, first.id), (e) => e.status === 404);
    await assert.rejects(
      goals.changeGoal(db, b.id, { id: g.id, status: "ARCHIVED" }),
      (e) => e.status === 404
    );
    const s = await sleep.recordSleep(db, a.id, {
      requestId: uid(),
      startedAt: new Date(now.getTime() - 9 * 3600000).toISOString(),
      endedAt: new Date(now.getTime() - 3600000).toISOString(),
      isNap: false,
    });
    assert.ok(s.id);
    await diet.recordMeal(db, a.id, {
      requestId: uid(),
      mealType: "LUNCH",
      eatenAt: ending.toISOString(),
      items: [{ name: "Rice" }],
    });
    await diet.recordHydration(db, a.id, {
      requestId: uid(),
      takenAt: ending.toISOString(),
      volumeMl: 300,
    });
    await recovery.saveRecovery(db, a.id, { localDate: now.toISOString().slice(0, 10), energy: 4 });
    const view = await insights.wellnessInsights(db, a.id, now);
    assert.equal(view.thisWeek.workouts, 1);
    assert.equal(view.thisWeek.activityMinutes, 30);
    assert.equal(view.goals.find((x) => x.id === g.id).achieved, 1);
    const other = await insights.wellnessInsights(db, b.id, now);
    assert.equal(other.thisWeek.workouts, 0);
    assert.equal(other.goals.length, 0);
    const exported = await profile.exportPersonalData(db, a.id);
    assert.equal(exported.wellness.workouts.length, 1);
    assert.equal(exported.wellness.meals.length, 1);
    await profile.deleteAllPersonalData(db, a.id);
    assert.equal(await db.workoutSession.count({ where: { userId: a.id } }), 0);
    assert.equal(await db.workoutExercise.count({ where: { workoutId: first.id } }), 0);
    assert.equal(await db.personalGoalInstance.count({ where: { userId: a.id } }), 0);
    assert.equal(await db.mealEntry.count({ where: { userId: a.id } }), 0);
    assert.equal(await db.recoveryCheckIn.count({ where: { userId: a.id } }), 0);
    assert.ok(await db.user.findUnique({ where: { id: a.id } }));
  } finally {
    await db.user.deleteMany({ where: { id: { in: [a.id, b.id] } } });
  }
});
