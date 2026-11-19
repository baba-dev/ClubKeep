import type { PrismaClient } from "@/generated/prisma/client";
import { OnboardingError } from "@/lib/club-onboarding";
import type { HydrationInput, MealInput } from "@/lib/validations/wellness";
import { checkedDate } from "./wellness-policy";

export async function listNutrition(db: PrismaClient, userId: string) {
  const [meals, hydration] = await Promise.all([
    db.mealEntry.findMany({ where: { userId }, orderBy: { eatenAt: "desc" }, take: 100,
      include: { items: { orderBy: { position: "asc" } } } }),
    db.hydrationEntry.findMany({ where: { userId }, orderBy: { takenAt: "desc" }, take: 100 }),
  ]);
  return { meals, hydration };
}

export async function recordMeal(db: PrismaClient, userId: string, input: MealInput) {
  const eatenAt = checkedDate(input.eatenAt);
  const existing = await db.mealEntry.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
  if (existing) return { id: existing.id, replayed: true };
  try {
    const meal = await db.mealEntry.create({
      data: {
        userId, requestId: input.requestId, mealType: input.mealType,
        eatenAt, notes: input.notes,
        items: { create: input.items.map((item, position) => ({ ...item, position })) },
      },
      select: { id: true },
    });
    return { id: meal.id, replayed: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const row = await db.mealEntry.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
      if (row) return { id: row.id, replayed: true };
    }
    throw error;
  }
}

export async function recordHydration(db: PrismaClient, userId: string, input: HydrationInput) {
  const takenAt = checkedDate(input.takenAt);
  const existing = await db.hydrationEntry.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
  if (existing) return { id: existing.id, replayed: true };
  try {
    const row = await db.hydrationEntry.create({
      data: { userId, requestId: input.requestId, volumeMl: input.volumeMl, takenAt },
      select: { id: true },
    });
    return { id: row.id, replayed: false };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const row = await db.hydrationEntry.findUnique({ where: { userId_requestId: { userId, requestId: input.requestId } } });
      if (row) return { id: row.id, replayed: true };
    }
    throw error;
  }
}

export async function removeMeal(db: PrismaClient, userId: string, id: string) {
  const removed = await db.mealEntry.deleteMany({ where: { id, userId } });
  if (!removed.count) throw new OnboardingError(404, "Meal not found.");
}
export async function removeHydration(db: PrismaClient, userId: string, id: string) {
  const removed = await db.hydrationEntry.deleteMany({ where: { id, userId } });
  if (!removed.count) throw new OnboardingError(404, "Water entry not found.");
}
