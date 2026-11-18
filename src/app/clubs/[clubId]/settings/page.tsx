import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/required-session";
import { requireClubRole } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import { BusinessShell } from "@/components/clubs/business-shell";
import { ClubSettingsEditor } from "@/components/clubs/club-settings-editor";
import { ShieldCheck, Globe2 } from "lucide-react";
import { OperationsBanner, OperationsSafetyNote } from "@/components/human-motion/operations-ui";
import { ThemeArtwork } from "@/components/human-motion/media-components";
import { HM_MEDIA, heroForVertical } from "@/components/human-motion/media";
export const metadata: Metadata = { title: "Club settings · ClubKeep", robots: { index: false } };
export default function ClubSettings({ params }: { params: Promise<{ clubId: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>
      }
    >
      <ClubSettingsContent params={params} />
    </Suspense>
  );
}

async function ClubSettingsContent({ params }: { params: Promise<{ clubId: string }> }) {
  const { clubId } = await params;
  const session = await requireSession();
  try {
    await requireClubRole(prisma, session.user.id, clubId, ["OWNER"]);
  } catch {
    notFound();
  }
  const club = await prisma.club.findFirst({
    where: { id: clubId, status: "ACTIVE", setupStatus: { in: ["READY", "LEGACY_ACTIVE"] } },
    select: {
      id: true,
      name: true,
      slug: true,
      vertical: true,
      timeZone: true,
      setupProgress: true,
      publicProfile: { select: { status: true } },
    },
  });
  if (!club) notFound();
  return (
    <BusinessShell
      clubId={clubId}
      clubName={club.name}
      active="settings"
      eyebrow="Club settings"
      title="Everything in its place."
      description="Review your club identity and take control of what appears publicly."
    >
      <OperationsBanner
        eyebrow="Home for your community"
        title="Your club, your character."
        description="Fine-tune your identity and manage what visitors can see—without changing the records that matter."
        art="botanical"
        compact
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.05fr_.95fr]">
        <ClubSettingsEditor
          clubId={clubId}
          initial={{
            vertical: club.vertical,
            countryCode: club.setupProgress?.countryCode ?? "",
            city: club.setupProgress?.city ?? "",
          }}
        />
        <div className="space-y-5">
          <section className="hm-ops-section mt-0" aria-label="Club identity preview">
            <p className="hm-kicker hm-page-eyebrow">Visual identity preview</p>
            <div className="hm-ops-settings-preview mt-4">
              <div
                className="relative h-36 overflow-hidden rounded-xl"
                style={{ background: "var(--hm-raised)" }}
              >
                <ThemeArtwork
                  pair={heroForVertical(club.vertical) ?? HM_MEDIA.illustrations.challengeLandscape}
                  className="hm-gallery-photo"
                />
              </div>
              <h2 className="hm-display mt-4 text-2xl">{club.name}</h2>
              <p className="hm-small mt-2">
                {club.vertical.toLowerCase().replaceAll("_", " ")} ·{" "}
                {club.setupProgress?.city || "Your city"}
              </p>
              <p className="hm-small mt-2">
                Editorial imagery preview, not an uploaded public club photo.
              </p>
            </div>
          </section>
          <section className="hm-ops-section mt-0">
            <div className="flex items-start gap-3">
              <span className="hm-ops-stat-icon">
                <Globe2 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="hm-section-title">Public presence</h2>
                <span className="hm-ops-pill mt-3">{club.publicProfile?.status ?? "HIDDEN"}</span>
              </div>
            </div>
            <p className="hm-small mt-4">
              Your club profile is visible only according to its publication status. Submissions and
              approvals are managed separately from operational settings.
            </p>
            <p className="hm-small mt-3">Directory handle: /c/{club.slug}</p>
            <Link
              href={`/clubs/${encodeURIComponent(clubId)}/settings/public-profile`}
              className="hm-button hm-button-primary mt-5"
            >
              Manage public profile
            </Link>
          </section>
          <section className="hm-ops-section mt-0">
            <h2 className="hm-section-title">Plan &amp; billing</h2>
            <p className="hm-small mt-3">
              See your plan, how close you are to the member limit, and change plans.
            </p>
            <Link
              href={`/clubs/${encodeURIComponent(clubId)}/settings/billing`}
              className="hm-button hm-button-primary mt-5"
            >
              Manage plan
            </Link>
          </section>
          <section className="hm-ops-section mt-0">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" />
              <h2 className="font-semibold">Owner-only controls</h2>
            </div>
            <p className="hm-small mt-3">
              This page requires the owner role. Managers and staff cannot change your identity or
              publication settings.
            </p>
            <p className="hm-small mt-2">Attendance timezone: {club.timeZone}</p>
          </section>
        </div>
      </div>
      <OperationsSafetyNote>
        Changing identity details never silently rewrites historical subscriptions, receipts, or
        club-local attendance records.
      </OperationsSafetyNote>
    </BusinessShell>
  );
}
