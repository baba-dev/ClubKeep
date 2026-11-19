import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { assertWellnessAdult } from "@/lib/personal/wellness-policy";

/** Use on every private wellness page; no page relies solely on the layout for authentication. */
export async function requireWellnessPage(): Promise<string> {
  if (process.env.PERSONAL_WELLNESS_ENABLED !== "true") notFound();
  const session = await requireSession();
  await assertWellnessAdult(prisma, session.user.id);
  return session.user.id;
}
