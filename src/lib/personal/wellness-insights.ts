import type { PrismaClient } from "@/generated/prisma/client";
import { localDate, mondayUtc, safeRate, sleepMinutes } from "./wellness-rules";

export async function wellnessInsights(db: PrismaClient, userId: string, now = new Date()) {
  const since = new Date(now.getTime() - 90 * 86400000);
  const [profile, workouts, sleeps, waters, meals, recovery, goals, imports] = await Promise.all([
    db.personalProfile.findUnique({ where: { userId }, select: { timezone: true } }),
    db.workoutSession.findMany({
      where: { userId, endedAt: { gte: since, lte: now } },
      select: { endedAt: true, durationMinutes: true },
      orderBy: { endedAt: "asc" },
      take: 5000,
    }),
    db.sleepSession.findMany({
      where: { userId, endedAt: { gte: since, lte: now } },
      select: { startedAt: true, endedAt: true, isNap: true },
      take: 5000,
    }),
    db.hydrationEntry.findMany({
      where: { userId, takenAt: { gte: since, lte: now } },
      select: { takenAt: true, volumeMl: true },
      take: 10000,
    }),
    db.mealEntry.findMany({
      where: { userId, eatenAt: { gte: since, lte: now } },
      select: { eatenAt: true },
      take: 5000,
    }),
    db.recoveryCheckIn.findMany({
      where: { userId, localDate: { gte: since.toISOString().slice(0, 10) } },
      select: { localDate: true, energy: true, soreness: true, stress: true, satisfaction: true },
    }),
    db.personalGoalInstance.findMany({ where: { userId, status: "ACTIVE" }, take: 20 }),
    db.healthConnectRecord.findMany({
      where: { userId, deletedAt: null, endedAt: { gte: since, lte: now } },
      select: { recordType: true, externalId: true, endedAt: true, value: true },
      take: 15000,
    }),
  ]);
  const zone = profile?.timezone ?? "UTC";
  const days = new Map<
    string,
    {
      date: string;
      workouts: number;
      minutes: number;
      sleepMinutes: number | null;
      hydrationMl: number | null;
      meals: number;
      energy: number | null;
      importedSteps: number | null;
      importedWorkouts: number;
      importedSleepMinutes: number | null;
      importedWaterMl: number | null;
    }
  >();
  const day = (d: string) => {
    let entry = days.get(d);
    if (!entry) {
      entry = {
        date: d,
        workouts: 0,
        minutes: 0,
        sleepMinutes: null,
        hydrationMl: null,
        meals: 0,
        energy: null,
        importedSteps: null,
        importedWorkouts: 0,
        importedSleepMinutes: null,
        importedWaterMl: null,
      };
      days.set(d, entry);
    }
    return entry;
  };
  for (const w of workouts) {
    const d = day(localDate(w.endedAt, zone));
    d.workouts += 1;
    d.minutes += w.durationMinutes;
  }
  for (const s of sleeps) {
    if (s.isNap) continue; // Main sleep only; naps remain accessible in sleep history.
    const d = day(localDate(s.endedAt, zone));
    d.sleepMinutes = (d.sleepMinutes ?? 0) + sleepMinutes(s.startedAt, s.endedAt);
  }
  for (const w of waters) {
    const d = day(localDate(w.takenAt, zone));
    d.hydrationMl = (d.hydrationMl ?? 0) + w.volumeMl;
  }
  for (const m of meals) day(localDate(m.eatenAt, zone)).meals += 1;
  for (const r of recovery) day(r.localDate).energy = r.energy;
  // Raw imported sources remain separate from manual metrics to avoid pretending
  // that mirrored device workouts are necessarily distinct sessions.
  for (const r of imports) {
    const date = r.recordType === "STEPS_DAILY" ? r.externalId : localDate(r.endedAt, zone);
    const d = day(date);
    if (r.recordType === "STEPS_DAILY") d.importedSteps = r.value;
    if (r.recordType === "WORKOUT") d.importedWorkouts += 1;
    if (r.recordType === "SLEEP") {
      // Duration for imported sleep is deliberately shown only in Connection history
      // until source-comparability and nap semantics are fully reconciled.
      d.importedSleepMinutes = null;
    }
    if (r.recordType === "HYDRATION") d.importedWaterMl = (d.importedWaterMl ?? 0) + (r.value ?? 0);
  }

  const today = localDate(now, zone);
  const weekStart = mondayUtc(new Date(today + "T12:00:00Z"))
    .toISOString()
    .slice(0, 10);
  const weekly = [...days.values()].filter((x) => x.date >= weekStart && x.date <= today);
  const thisWeek = weekly.reduce(
    (a, x) => ({
      workouts: a.workouts + x.workouts,
      activityMinutes: a.activityMinutes + x.minutes,
      sleepMinutes: a.sleepMinutes + (x.sleepMinutes ?? 0),
      hydrationMl: a.hydrationMl + (x.hydrationMl ?? 0),
    }),
    { workouts: 0, activityMinutes: 0, sleepMinutes: 0, hydrationMl: 0 }
  );
  const importedThisWeek = weekly.reduce((a, d) => ({
    steps: a.steps + (d.importedSteps ?? 0),
    workoutRecords: a.workoutRecords + d.importedWorkouts,
    waterMl: a.waterMl + (d.importedWaterMl ?? 0),
  }), { steps: 0, workoutRecords: 0, waterMl: 0 });
  const goalProgress = await Promise.all(
    goals.map(async (goal) => {
      // TOTAL goals must not silently truncate to the 90-day chart horizon.
      const start = goal.cadence === "WEEKLY" ? weekStart : localDate(goal.startsAt, zone);
      const end = goal.endsAt && goal.endsAt < now ? goal.endsAt : now;
      const from = new Date(start + "T00:00:00Z");
      let achieved = 0;
      if (goal.metric === "WORKOUT_SESSIONS") {
        achieved = await db.workoutSession.count({
          where: { userId, endedAt: { gte: from, lte: end } },
        });
      } else if (goal.metric === "ACTIVITY_MINUTES") {
        const a = await db.workoutSession.aggregate({
          where: { userId, endedAt: { gte: from, lte: end } },
          _sum: { durationMinutes: true },
        });
        achieved = a._sum.durationMinutes ?? 0;
      } else if (goal.metric === "HYDRATION_ML") {
        const a = await db.hydrationEntry.aggregate({
          where: { userId, takenAt: { gte: from, lte: end } },
          _sum: { volumeMl: true },
        });
        achieved = a._sum.volumeMl ?? 0;
      } else {
        const records = await db.sleepSession.findMany({
          where: { userId, endedAt: { gte: from, lte: end }, isNap: false },
          select: { startedAt: true, endedAt: true },
        });
        achieved = records.reduce((sum, s) => sum + sleepMinutes(s.startedAt, s.endedAt), 0);
      }
      return {
        id: goal.id,
        title: goal.title,
        metric: goal.metric,
        cadence: goal.cadence,
        target: goal.target,
        achieved,
        percentage: safeRate(achieved, goal.target),
      };
    })
  );
  return {
    today,
    timezone: zone,
    thisWeek,
    importedThisWeek,
    goals: goalProgress,
    days: [...days.values()]
      .filter((x) => x.date <= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-90),
    disclosure:
      "Manual goal progress is kept separate from imported device observations to prevent unverified double counts. Missing data is not zero. No clinical recovery score.",
  };
}
