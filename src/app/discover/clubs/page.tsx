import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { HM_MEDIA } from "@/components/human-motion/media";
import { validatedPublic } from "@/lib/public-directory";
import {
  Dumbbell,
  Flower2,
  Music2,
  Trophy,
  Building2,
  Search,
  MapPin,
  ArrowRight,
} from "lucide-react";
export const metadata: Metadata = {
  title: "Discover clubs · ClubKeep",
  description: "Discover gyms, yoga and dance studios, sports academies and local clubs.",
};
type Query = { q?: string; type?: string; cursor?: string; city?: string };
const icons = {
  GYM: Dumbbell,
  YOGA: Flower2,
  DANCE: Music2,
  SPORTS: Trophy,
  OTHER: Building2,
} as const;
const categories = ["GYM", "YOGA", "DANCE", "SPORTS", "OTHER"] as const;
export default function Discover({ searchParams }: { searchParams: Promise<Query> }) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0b0705] p-8 text-[#fbf1e6]">Loading ClubKeep…</main>
      }
    >
      <DiscoverContent searchParams={searchParams} />
    </Suspense>
  );
}

async function DiscoverContent({ searchParams }: { searchParams: Promise<Query> }) {
  const input = await searchParams;
  const q = (input.q || "").trim().slice(0, 80);
  const city = (input.city || "").trim().slice(0, 100);
  const type = categories.find((x) => x === input.type);
  const cursor =
    input.cursor && /^[a-zA-Z0-9_-]{10,128}$/.test(input.cursor) ? input.cursor : undefined;
  const base: Prisma.ClubPublicProfileWhereInput = {
    status: "LISTED",
    ...(city ? { city: { contains: city, mode: "insensitive" } } : {}),
    club: {
      status: "ACTIVE",
      setupStatus: { in: ["READY", "LEGACY_ACTIVE"] },
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      ...(type ? { vertical: type } : {}),
    },
  };
  const items = await prisma.clubPublicProfile.findMany({
    where: base,
    orderBy: [{ publishedAt: "desc" }, { clubId: "desc" }],
    take: 13,
    ...(cursor ? { cursor: { clubId: cursor }, skip: 1 } : {}),
    select: {
      clubId: true,
      published: true,
      publishedAt: true,
      club: { select: { name: true, slug: true, vertical: true } },
    },
  });
  const more = items.length > 12;
  const list = items.slice(0, 12);
  const next = list[list.length - 1]?.clubId;
  return (
    <main className="hm-app hm-public">
      <div className="hm-public-container">
        <header className="hm-public-header">
          <ClubKeepBrand />
          <div className="flex items-center gap-2">
            <ClubThemeToggle />
            <Link href="/auth/sign-in" className="hm-button hm-button-secondary">
              Sign in
            </Link>
          </div>
        </header>
        <section className="hm-public-hero mt-8">
          <ThemeArtwork pair={HM_MEDIA.illustrations.botanical} className="hm-gallery-art" />
          <div className="relative z-10">
            <p className="hm-kicker hm-page-eyebrow">Find your people</p>
            <h1 className="mt-4">Every community starts somewhere.</h1>
            <p className="hm-small mt-5 max-w-2xl">
              Explore gyms, yoga studios, dance academies, sports clubs and more. Only
              owner-submitted and approved public profiles appear in search results.
            </p>
          </div>
        </section>
        <form
          method="get"
          className="hm-public-card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:p-5"
        >
          <label className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4">
            <Search className="size-4 text-[var(--hm-sage-deep)]" />
            <span className="sr-only">Search club name</span>
            <input
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder="Search a club by name"
              className="min-w-0 flex-1 bg-transparent outline-none"
            />
          </label>
          <label className="sr-only" htmlFor="category">
            Club category
          </label>
          <select id="category" name="type" defaultValue={type || ""} className="hm-public-field">
            <option value="">All categories</option>
            {categories.map((x) => (
              <option key={x} value={x}>
                {x === "GYM"
                  ? "Gym & Fitness"
                  : x === "YOGA"
                    ? "Yoga & Wellness"
                    : x === "DANCE"
                      ? "Dance Academy"
                      : x === "SPORTS"
                        ? "Sports Academy"
                        : "General Club"}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="city">
            City
          </label>
          <input
            id="city"
            name="city"
            maxLength={100}
            defaultValue={city}
            placeholder="City (optional)"
            className="min-h-12 rounded-xl border border-[#f6dc9b]/20 bg-[#0b0807] px-4 text-sm"
          />
          <button className="hm-button hm-button-primary">Discover</button>
        </form>
        {list.length ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => {
              const data = validatedPublic(item.published);
              const Icon = icons[item.club.vertical];
              return (
                <Link
                  key={item.clubId}
                  href={"/c/" + encodeURIComponent(item.club.slug)}
                  className="hm-public-card group"
                >
                  <div className="hm-public-card-art">
                    <ThemeArtwork
                      pair={HM_MEDIA.illustrations.botanicalCorner}
                      className="hm-gallery-art"
                    />
                    <Icon
                      className="relative size-12 text-[var(--hm-sage-deep)]"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="p-6">
                    <p className="hm-kicker hm-page-eyebrow">{item.club.vertical.toLowerCase()}</p>
                    <h2 className="mt-2 text-xl font-semibold">{item.club.name}</h2>
                    <p className="hm-small mt-2 line-clamp-2 min-h-10">
                      {data?.tagline || "A place to belong."}
                    </p>
                    <p className="hm-small mt-5 flex items-center gap-2">
                      <MapPin className="size-4" />
                      {data?.city || "Location not published"}
                      <ArrowRight className="ml-auto size-4" />
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <section className="hm-ops-empty mt-8 text-center">
            <Search className="mx-auto size-9 text-[var(--hm-sage-deep)]" />
            <h2 className="mt-4 text-xl font-semibold">No clubs found</h2>
            <p className="hm-small mt-2">
              Try another name or category. New clubs appear only after approval.
            </p>
          </section>
        )}
        {more && next && (
          <Link
            className="hm-button hm-button-secondary mt-8"
            href={
              "/discover/clubs?" +
              new URLSearchParams({
                ...(q ? { q } : {}),
                ...(type ? { type } : {}),
                ...(city ? { city } : {}),
                cursor: next,
              }).toString()
            }
          >
            Explore more clubs <ArrowRight className="ml-2 size-4" />
          </Link>
        )}
        <footer className="hm-small mt-16 border-t border-[var(--hm-line)] py-8">
          ClubKeep by BabaBuilds · Discover a community, keep your membership private.
        </footer>
      </div>
    </main>
  );
}
