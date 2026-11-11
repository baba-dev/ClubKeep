import { Suspense } from "react";
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
export default function SetupStep({
  params,
}: {
  params: Promise<{ clubId: string; step: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>
      }
    >
      <SetupStepContent params={params} />
    </Suspense>
  );
}

async function SetupStepContent({ params }: { params: Promise<{ clubId: string; step: string }> }) {
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
