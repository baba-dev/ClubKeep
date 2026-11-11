import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { loadSetup } from "@/lib/club-setup";
import { SetupWizard } from "@/components/clubs/setup-wizard";
export const metadata: Metadata = {
  title: "Finish setting up your club · ClubKeep",
  robots: { index: false },
};
const steps = ["type", "details", "identity", "membership", "review"] as const;
export default async function SetupStep({
  params,
}: {
  params: Promise<{ clubId: string; step: string }>;
}) {
  const { clubId, step } = await params;
  if (!steps.some((s) => s === step)) notFound();
  const session = await requireSession();
  let initial;
  try {
    initial = await loadSetup(prisma, session.user.id, clubId);
  } catch {
    notFound();
  }
  if (initial.alreadyReady) redirect("/clubs/" + encodeURIComponent(clubId));
  return (
    <SetupWizard clubId={clubId} initial={initial} initialStep={step as (typeof steps)[number]} />
  );
}
