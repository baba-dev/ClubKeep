import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { readOwnerProfile } from "@/lib/public-directory";
import { BusinessShell } from "@/components/clubs/business-shell";
import { PublicProfileEditor } from "@/components/clubs/public-profile-editor";
export const metadata: Metadata = {
  title: "Public club profile · ClubKeep",
  robots: { index: false },
};
export default async function OwnerPublicProfile({
  params,
}: {
  params: Promise<{ clubId: string }>;
}) {
  const { clubId } = await params;
  const session = await requireSession();
  let data;
  try {
    data = await readOwnerProfile(prisma, session.user.id, clubId);
  } catch {
    notFound();
  }
  return (
    <BusinessShell
      clubId={clubId}
      clubName={data.club.name}
      active="overview"
      eyebrow="Your public presence"
      title="Make your club discoverable."
      description="Create a beautiful public introduction to your club, reviewed before it appears in search."
    >
      <PublicProfileEditor
        clubId={clubId}
        slug={data.club.slug}
        initial={data.profile.draft}
        status={data.profile.status}
      />
    </BusinessShell>
  );
}
