import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { validatedPublic } from "@/lib/public-directory";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { HM_MEDIA } from "@/components/human-motion/media";
import { Globe2, MapPin, Mail, ArrowLeft, ShieldCheck } from "lucide-react";
async function getClub(slug: string) {
  return prisma.club.findUnique({
    where: { slug },
    select: {
      name: true,
      slug: true,
      vertical: true,
      status: true,
      setupStatus: true,
      publicProfile: { select: { status: true, published: true } },
    },
  });
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClub(slug);
  if (
    !club ||
    club.status !== "ACTIVE" ||
    club.setupStatus === "IN_PROGRESS" ||
    !["LISTED", "UNLISTED"].includes(club.publicProfile?.status || "")
  )
    return { title: "Club not found", robots: { index: false } };
  const p = validatedPublic(club.publicProfile?.published);
  return {
    title: club.name + " · ClubKeep",
    description: p?.tagline || "Discover this club on ClubKeep",
    robots: {
      index: club.publicProfile?.status === "LISTED",
      follow: club.publicProfile?.status === "LISTED",
    },
  };
}
export default function ClubPublic({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>
      }
    >
      <ClubPublicContent params={params} />
    </Suspense>
  );
}

async function ClubPublicContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await getClub(slug);
  if (
    !club ||
    club.status !== "ACTIVE" ||
    club.setupStatus === "IN_PROGRESS" ||
    !["LISTED", "UNLISTED"].includes(club.publicProfile?.status || "")
  )
    notFound();
  const p = validatedPublic(club.publicProfile?.published);
  if (!p) notFound();
  return (
    <main className="hm-app hm-public">
      <div className="hm-public-container">
        <header className="hm-public-header">
          <Link href="/discover/clubs" className="hm-button hm-button-secondary">
            <ArrowLeft className="size-4" />
            Explore clubs
          </Link>
          <div className="flex items-center gap-3">
            <ClubKeepBrand />
            <ClubThemeToggle />
          </div>
        </header>
        <div className="hm-public-hero mt-9 grid min-h-[235px] place-items-center">
          <ThemeArtwork
            pair={HM_MEDIA.illustrations.challengeLandscape}
            className="hm-gallery-art"
          />
          <span className="relative flex flex-col items-center gap-4">
            <Globe2 className="size-14 text-[var(--hm-sage-deep)]" aria-hidden="true" />
            <span className="hm-kicker hm-muted">ClubKeep public profile · Brand illustration</span>
          </span>
        </div>
        <section className="max-w-3xl py-10">
          <p className="hm-kicker hm-page-eyebrow">
            {club.vertical.toLowerCase().replace("_", " ")}
          </p>
          <h1 className="hm-display mt-3 text-4xl sm:text-6xl">{club.name}</h1>
          <p className="mt-5 text-xl leading-8 text-[var(--hm-cocoa)]">{p.tagline}</p>
          <p className="hm-muted mt-6 text-base leading-8 whitespace-pre-wrap">{p.description}</p>
          <div className="hm-muted mt-8 flex flex-wrap items-center gap-4 border-t border-[var(--hm-line)] pt-7 text-sm">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" />
              {p.city}
            </span>
            {p.website && (
              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 font-semibold text-[var(--hm-terracotta)]"
              >
                <Globe2 className="size-4" />
                Website
              </a>
            )}
            {p.contactEmail && (
              <a
                href={"mailto:" + p.contactEmail}
                className="inline-flex items-center gap-2 text-[#f5bd80]"
              >
                <Mail className="size-4" />
                Email club
              </a>
            )}
          </div>
        </section>
        <p className="hm-public-disclaimer flex items-start gap-3 text-sm leading-6">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-[var(--hm-sage-deep)]" />
          This is a club-owned public profile, not a verified business identity or membership
          application. Club membership requires an independent invitation and verified account.
        </p>
        <footer className="hm-small mt-14 border-t border-[var(--hm-line)] py-8">
          Powered by ClubKeep · BabaBuilds
        </footer>
      </div>
    </main>
  );
}
