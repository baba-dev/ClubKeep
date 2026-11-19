import type { NextRequest } from "next/server";
import { wellnessPost, wellnessRead } from "@/lib/personal/wellness-http";
import { listNutrition, recordHydration } from "@/lib/personal/wellness-nutrition";
import { hydrationInput } from "@/lib/validations/wellness";
export async function GET(request: NextRequest) { return wellnessRead(request, (db, userId) => listNutrition(db, userId).then(x => x.hydration)); }
export async function POST(request: NextRequest) { return wellnessPost(request, "hydration-create", 120, hydrationInput, (db, userId, input) => recordHydration(db, userId, input)); }
