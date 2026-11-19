import type { PrismaClient } from "@/generated/prisma/client";
import { AccessDeniedError } from "@/lib/club-access";
import { OnboardingError } from "@/lib/club-onboarding";
import { memberSelfContext } from "@/lib/member-self-service";
import {
  ACTIVITY_KEYS,
  VERTICAL_DEFAULTS,
  mergeFrequencies,
  muscleLoad,
  type ActivityFrequency,
  type ActivityKey,
} from "@/lib/personal/muscle-map";
import {
  canLogBodyMeasurements,
  fromStored,
  toStored,
  type MeasurementKind,
  type Units,
} from "@/lib/personal/measurements";

// Every function here takes the verified session user id. Personal data is user-owned: no function
// accepts an owner id from a client, and none is reachable from club-role code paths.

const MAX_MEASUREMENTS_PER_USER = 5000;
const ATTENDANCE_WINDOW_DAYS = 28;

export interface BioPatch {
  displayName?: string | null;
  birthYear?: number | null;
  heightCm?: number | null;
  units?: Units;
  goal?: "STRENGTH" | "ENDURANCE" | "FLEXIBILITY" | "WEIGHT_MANAGEMENT" | "GENERAL_FITNESS" | null;
}

export async function ensureProfile(db: PrismaClient, userId: string) {
  return db.personalProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function derivedFrequency(db: PrismaClient, userId: string, clubId: string, now: Date) {
  try {
    const ctx = await memberSelfContext(db, userId, clubId);
    if (!ctx.member) return null;
    const since = new Date(now.getTime() - ATTENDANCE_WINDOW_DAYS * 86_400_000);
    const visits = await db.clubAttendance.count({
      where: { clubId, memberRecordId: ctx.member.id, checkedInAt: { gte: since } },
    });
    return {
      vertical: ctx.club.vertical as string,
      visits,
      perWeek: Math.round((visits / (ATTENDANCE_WINDOW_DAYS / 7)) * 10) / 10,
    };
  } catch (error) {
    if (error instanceof AccessDeniedError) return null;
    throw error;
  }
}

export async function getOverview(db: PrismaClient, userId: string, now = new Date()) {
  const profile = await ensureProfile(db, userId);
  const [measurements, activities, consents, memberships] = await Promise.all([
    db.personalMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: "desc" },
      take: 500,
      select: { id: true, kind: true, value: true, measuredAt: true },
    }),
    db.personalActivity.findMany({
      where: { userId },
      select: { activityKey: true, sessionsPerWeek: true },
    }),
    db.personalClubSignalConsent.findMany({
      where: { userId, enabled: true },
      select: { clubId: true },
    }),
    db.clubMembership.findMany({
      where: { userId, role: "MEMBER", status: "ACTIVE", club: { status: "ACTIVE" } },
      select: { club: { select: { id: true, name: true, vertical: true } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  const enabled = new Set(consents.map((c) => c.clubId));
  const clubs = await Promise.all(
    memberships.map(async ({ club }) => {
      const on = enabled.has(club.id);
      const derived = on ? await derivedFrequency(db, userId, club.id, now) : null;
      return {
        clubId: club.id,
        name: club.name,
        vertical: club.vertical as string,
        enabled: on,
        visits28d: derived?.visits ?? null,
        perWeek: derived?.perWeek ?? null,
        mapsTo: (VERTICAL_DEFAULTS[club.vertical as string] ?? []) as readonly ActivityKey[],
      };
    })
  );

  const declared: ActivityFrequency[] = activities
    .filter((a) => (ACTIVITY_KEYS as readonly string[]).includes(a.activityKey))
    .map((a) => ({ key: a.activityKey as ActivityKey, sessionsPerWeek: a.sessionsPerWeek }));
  const derived: ActivityFrequency[] = clubs.flatMap((c) =>
    c.enabled && c.perWeek
      ? c.mapsTo.map((key) => ({ key, sessionsPerWeek: c.perWeek as number }))
      : []
  );

  const units = profile.units as Units;
  const history = {} as Record<string, { id: string; value: number; measuredAt: string }[]>;
  for (const m of measurements) {
    (history[m.kind] ??= []).push({
      id: m.id,
      value: fromStored(m.kind as MeasurementKind, m.value, units),
      measuredAt: m.measuredAt.toISOString(),
    });
  }

  return {
    profile: {
      displayName: profile.displayName,
      birthYear: profile.birthYear,
      heightCm: profile.heightMm === null ? null : Math.round(profile.heightMm / 10),
      units,
      goal: profile.goal,
    },
    canLogMeasurements: canLogBodyMeasurements(profile.birthYear, now),
    measurements: history,
    activities: declared,
    clubs,
    load: muscleLoad(mergeFrequencies(declared, derived)),
  };
}

export async function updateBio(db: PrismaClient, userId: string, patch: BioPatch) {
  const data: Record<string, unknown> = {};
  if (patch.displayName !== undefined) data.displayName = patch.displayName;
  if (patch.birthYear !== undefined) data.birthYear = patch.birthYear;
  if (patch.heightCm !== undefined)
    data.heightMm = patch.heightCm === null ? null : Math.round(patch.heightCm * 10);
  if (patch.units !== undefined) data.units = patch.units;
  if (patch.goal !== undefined) data.goal = patch.goal;
  await db.personalProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

export async function logMeasurement(
  db: PrismaClient,
  userId: string,
  input: { kind: MeasurementKind; value: number; measuredAt?: string },
  now = new Date()
) {
  const profile = await ensureProfile(db, userId);
  if (profile.birthYear === null)
    throw new OnboardingError(403, "Add your birth year in Profile before logging measurements.");
  if (!canLogBodyMeasurements(profile.birthYear, now))
    throw new OnboardingError(403, "Body measurements are only available to adults for now.");
  const stored = toStored(input.kind, input.value, profile.units as Units);
  if (stored === null)
    throw new OnboardingError(400, "That value looks out of range for this measurement.");
  const measuredAt = input.measuredAt ? new Date(input.measuredAt) : now;
  if (measuredAt.getTime() > now.getTime() + 5 * 60_000 || measuredAt.getUTCFullYear() < 2000)
    throw new OnboardingError(400, "Choose a date that is not in the future.");
  const count = await db.personalMeasurement.count({ where: { userId } });
  if (count >= MAX_MEASUREMENTS_PER_USER)
    throw new OnboardingError(409, "You have reached the measurement limit. Delete older entries.");
  const row = await db.personalMeasurement.create({
    data: { userId, kind: input.kind, value: stored, measuredAt },
    select: { id: true },
  });
  return { id: row.id };
}

export async function deleteMeasurement(db: PrismaClient, userId: string, id: string) {
  const removed = await db.personalMeasurement.deleteMany({ where: { id, userId } });
  if (removed.count === 0) throw new OnboardingError(404, "Measurement not found");
}

export async function setActivities(
  db: PrismaClient,
  userId: string,
  activities: { key: string; sessionsPerWeek: number }[]
) {
  await ensureProfile(db, userId);
  await db.$transaction([
    db.personalActivity.deleteMany({
      where: { userId, activityKey: { notIn: activities.map((a) => a.key) } },
    }),
    ...activities.map((a) =>
      db.personalActivity.upsert({
        where: { userId_activityKey: { userId, activityKey: a.key } },
        create: { userId, activityKey: a.key, sessionsPerWeek: a.sessionsPerWeek },
        update: { sessionsPerWeek: a.sessionsPerWeek },
      })
    ),
  ]);
}

/** Turning the signal on requires an active membership; turning it off is always allowed. */
export async function setClubSignalConsent(
  db: PrismaClient,
  userId: string,
  clubId: string,
  enabled: boolean
) {
  if (enabled) await memberSelfContext(db, userId, clubId);
  await db.personalClubSignalConsent.upsert({
    where: { userId_clubId: { userId, clubId } },
    create: { userId, clubId, enabled },
    update: { enabled },
  });
}

export async function exportPersonalData(db: PrismaClient, userId: string, now = new Date()) {
  const profile = await ensureProfile(db, userId);
  const [
    measurements,
    activities,
    consents,
    goals,
    workouts,
    sleep,
    meals,
    hydration,
    recovery,
    sources,
    importedFitness,
    connectedDevices,
  ] = await Promise.all([
    db.personalMeasurement.findMany({
      where: { userId },
      orderBy: { measuredAt: "asc" },
      select: { kind: true, value: true, measuredAt: true },
    }),
    db.personalActivity.findMany({
      where: { userId },
      select: { activityKey: true, sessionsPerWeek: true },
    }),
    db.personalClubSignalConsent.findMany({
      where: { userId },
      select: { clubId: true, enabled: true },
    }),
    db.personalGoalInstance.findMany({ where: { userId } }),
    db.workoutSession.findMany({
      where: { userId },
      include: { exercises: { include: { sets: true } } },
    }),
    db.sleepSession.findMany({ where: { userId } }),
    db.mealEntry.findMany({ where: { userId }, include: { items: true } }),
    db.hydrationEntry.findMany({ where: { userId } }),
    db.recoveryCheckIn.findMany({ where: { userId } }),
    db.wellnessSourceRecord.findMany({ where: { userId } }),
    db.healthConnectRecord.findMany({ where: { userId }, orderBy: { endedAt: "asc" } }),
    db.healthConnectConnection.findMany({
      where: { userId }, select: {
        id: true, label: true, installationId: true, grantedTypes: true, lastSyncAt: true,
        revokedAt: true, createdAt: true,
      },
    }),
  ]);
  const units = profile.units as Units;
  return {
    exportedAt: now.toISOString(),
    profile: {
      displayName: profile.displayName,
      birthYear: profile.birthYear,
      heightMm: profile.heightMm,
      units,
      goal: profile.goal,
    },
    measurements: measurements.map((m) => ({
      kind: m.kind,
      storedValue: m.value,
      storedUnit: m.kind === "WEIGHT" ? "g" : m.kind === "BODY_FAT" ? "basis points" : "mm",
      value: fromStored(m.kind as MeasurementKind, m.value, units),
      measuredAt: m.measuredAt.toISOString(),
    })),
    activities,
    clubSignalConsents: consents,
    wellness: { goals, workouts, sleep, meals, hydration, recovery, sources },
    healthConnect: { importedFitness, connectedDevices },
  };
}

/** Erases bio, measurements, activities and consents. The account and sign-in stay. */
export async function deleteAllPersonalData(db: PrismaClient, userId: string) {
  await db.$transaction([
    db.personalMeasurement.deleteMany({ where: { userId } }),
    db.personalActivity.deleteMany({ where: { userId } }),
    db.personalClubSignalConsent.deleteMany({ where: { userId } }),
    // Child exercise/meal rows cascade; keep account and club membership intact.
    db.personalGoalInstance.deleteMany({ where: { userId } }),
    db.workoutSession.deleteMany({ where: { userId } }),
    db.sleepSession.deleteMany({ where: { userId } }),
    db.mealEntry.deleteMany({ where: { userId } }),
    db.hydrationEntry.deleteMany({ where: { userId } }),
    db.recoveryCheckIn.deleteMany({ where: { userId } }),
    db.wellnessSourceRecord.deleteMany({ where: { userId } }),
    // Erasure also invalidates native credentials; related batches cascade.
    db.healthConnectRecord.deleteMany({ where: { userId } }),
    db.healthConnectPairing.deleteMany({ where: { userId } }),
    db.healthConnectConnection.deleteMany({ where: { userId } }),
    db.personalProfile.updateMany({
      where: { userId },
      data: {
        displayName: null,
        birthYear: null,
        heightMm: null,
        goal: null,
        units: "METRIC",
        locale: "en",
        timezone: "UTC",
      },
    }),
  ]);
}
