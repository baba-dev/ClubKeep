import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { listNutrition, recordMeal } from "@/lib/personal/wellness-nutrition";
import { mealInput } from "@/lib/validations/wellness";
export async function GET(request: NextRequest) { return wellnessRead(request, (db, userId) => listNutrition(db, userId).then(x => x.meals)); }
export async function POST(request: NextRequest) { return wellnessPost(request, "meals-create", 90, mealInput, (db, userId, input) => recordMeal(db, userId, input)); }
