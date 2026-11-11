import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/required-session";
import { prisma } from "@/lib/prisma";
import { platformAdmin, validatedPublic } from "@/lib/public-directory";
import { DirectoryReview } from "@/components/admin/directory-review";
export const metadata: Metadata = {
  title: "Directory moderation · ClubKeep Admin",
  robots: { index: false },
};
export default function DirectoryAdmin() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>}>
      <DirectoryAdminContent />
    </Suspense>
  );
}

async function DirectoryAdminContent() {
  const session = await requireSession();
  try {
    await platformAdmin(prisma, session.user.id);
  } catch {
    notFound();
  }
  const revisions = await prisma.clubPublicRevision.findMany({
    where: { status: "PENDING" },
    orderBy: { submittedAt: "asc" },
    take: 50,
    select: {
      id: true,
      clubId: true,
      content: true,
      submittedAt: true,
      club: { select: { name: true } },
    },
  });
  return (
    <main className="min-h-screen bg-[#0b0705] px-5 py-10 text-[#fff0de]">
      <div className="mx-auto max-w-4xl">
        <Link href="/home" className="text-sm text-[#d5a877]">
          ← ClubKeep
        </Link>
        <p className="mt-10 text-xs font-semibold tracking-widest text-[#e7b871] uppercase">
          Platform administration · Restricted
        </p>
        <h1 className="mt-3 text-4xl font-semibold">Public directory moderation</h1>
        <p className="mt-3 text-sm leading-7 text-[#bfa58f]">
          Approve only business-owned content suitable for publication. Approval is not a
          verification badge.
        </p>
        <DirectoryReview
          items={revisions.map((x) => ({
            id: x.id,
            clubId: x.clubId,
            clubName: x.club.name,
            content: validatedPublic(x.content),
            submittedAt: x.submittedAt.toISOString(),
          }))}
        />
      </div>
    </main>
  );
}
