import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { GoalInput } from "@/lib/validations/wellness";
import { checkedDate } from "./wellness-policy";

export async function listGoals(db: PrismaClient, userId: string) {
  return db.personalGoalInstance.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
}

export async function createGoal(db: PrismaClient, userId: string, input: GoalInput) {
  const now = new Date();
  const endsAt = input.endsAt
    ? checkedDate(input.endsAt, new Date(now.getTime() + 10 * 365 * 86400000))
    : null;
  if (endsAt && endsAt <= now)
    throw new OnboardingError(400, "Goal end date must be in the future.");
  const current = await db.personalGoalInstance.count({ where: { userId, status: "ACTIVE" } });
  if (current >= 20) throw new OnboardingError(409, "Archive an existing goal before adding more.");
  const goal = await db.personalGoalInstance.create({
    data: {
      userId,
      title: input.title,
      metric: input.metric,
      cadence: input.cadence,
      target: input.target,
      endsAt,
    },
    select: { id: true },
  });
  return { id: goal.id };
}

export async function changeGoal(
  db: PrismaClient,
  userId: string,
  input: {
    id: string;
    title?: string;
    target?: number;
    status?: "ACTIVE" | "PAUSED" | "ARCHIVED";
  }
) {
  const changed = await db.personalGoalInstance.updateMany({
    where: { id: input.id, userId },
    data: { title: input.title, target: input.target, status: input.status },
  });
  if (!changed.count) throw new OnboardingError(404, "Goal not found.");
}

export async function removeGoal(db: PrismaClient, userId: string, id: string) {
  const result = await db.personalGoalInstance.deleteMany({ where: { id, userId } });
  if (!result.count) throw new OnboardingError(404, "Goal not found.");
}
