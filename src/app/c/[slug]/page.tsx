import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { validatedPublic } from "@/lib/public-directory";
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
    <Suspense fallback={<main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>}>
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
    <main className="min-h-screen bg-[#0b0705] px-5 text-[#fcefe1] sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-[#f6dc9b]/15 py-6">
          <Link
            href="/discover/clubs"
            className="inline-flex items-center gap-2 text-sm text-[#edbd8a]"
          >
            <ArrowLeft className="size-4" />
            Explore clubs
          </Link>
          <span className="font-semibold">ClubKeep</span>
        </header>
        <div className="mt-9 grid min-h-64 place-items-center rounded-3xl border border-[#f6dc9b]/20 bg-gradient-to-br from-[#58321d] via-[#332014] to-[#120c09]">
          <Globe2 className="size-20 text-[#f6bd78]" aria-hidden="true" />
        </div>
        <section className="max-w-3xl py-10">
          <p className="text-xs font-semibold tracking-widest text-[#ecb970] uppercase">
            {club.vertical.toLowerCase().replace("_", " ")}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{club.name}</h1>
          <p className="mt-5 text-xl leading-8 text-[#e2c19d]">{p.tagline}</p>
          <p className="mt-6 text-base leading-8 whitespace-pre-wrap text-[#c8ae95]">
            {p.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-[#f6dc9b]/15 pt-7 text-sm text-[#e0c2a4]">
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" />
              {p.city}
            </span>
            {p.website && (
              <a
                href={p.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-2 text-[#f5bd80]"
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
        <p className="flex items-start gap-3 rounded-2xl border border-[#f6dc9b]/15 bg-[#1a130d] p-5 text-sm leading-6 text-[#bfa78f]">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-[#e7b675]" />
          This is a club-owned public profile, not a verified business identity or membership
          application. Club membership requires an independent invitation and verified account.
        </p>
        <footer className="mt-14 border-t border-[#f6dc9b]/10 py-8 text-xs text-[#ae9480]">
          Powered by ClubKeep · BabaBuilds
        </footer>
      </div>
    </main>
  );
}
