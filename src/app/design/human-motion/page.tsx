import Image from "next/image";
import Link from "next/link";
import { HM_MEDIA, type ThemePair } from "@/components/human-motion/media";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";

const photoSets = [
  { name: "Yoga owner hero", pair: HM_MEDIA.heroes.YOGA },
  { name: "Gym owner hero", pair: HM_MEDIA.heroes.GYM },
  { name: "Dance owner hero", pair: HM_MEDIA.heroes.DANCE },
  { name: "Community spotlight", pair: HM_MEDIA.photography.community },
  { name: "Club challenge", pair: HM_MEDIA.photography.challenge },
  { name: "Studio conversation", pair: HM_MEDIA.photography.lifestyle },
];
const illustrationSets = [
  { name: "Hero flow", pair: HM_MEDIA.illustrations.heroFlow },
  { name: "Landscape layers", pair: HM_MEDIA.illustrations.sidebarLandscape },
  { name: "Challenge landscape", pair: HM_MEDIA.illustrations.challengeLandscape },
  { name: "Botanical detail", pair: HM_MEDIA.illustrations.botanical },
  { name: "Botanical corner", pair: HM_MEDIA.illustrations.botanicalCorner },
  { name: "Members metric", pair: HM_MEDIA.illustrations.metrics.members },
  { name: "Attendance metric", pair: HM_MEDIA.illustrations.metrics.attendance },
  { name: "Memberships metric", pair: HM_MEDIA.illustrations.metrics.memberships },
  { name: "Revenue metric", pair: HM_MEDIA.illustrations.metrics.revenue },
];
const awards = [
  { name: "Medal", pair: HM_MEDIA.achievements.medal },
  { name: "Milestone", pair: HM_MEDIA.achievements.milestone },
  { name: "Trophy", pair: HM_MEDIA.achievements.trophy },
  { name: "Streak", pair: HM_MEDIA.achievements.streak },
];
const branding = [
  { name: "Horizontal wordmark", pair: HM_MEDIA.branding.primary },
  { name: "Stacked wordmark", pair: HM_MEDIA.branding.stacked },
];

function AssetSet({
  title,
  items,
  aspect = "wide",
}: {
  title: string;
  items: Array<{ name: string; pair: ThemePair }>;
  aspect?: "wide" | "square";
}) {
  return (
    <section className="hm-section">
      <h2 className="hm-section-title">{title}</h2>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {items.map(({ name, pair }) => (
          <article className="hm-surface overflow-hidden p-4" key={name}>
            <h3 className="mb-3 text-sm font-semibold">{name}</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["light", "dark"] as const).map((mode) => (
                <figure key={mode}>
                  <div
                    className="flex items-center justify-center overflow-hidden rounded-xl"
                    style={{
                      background: mode === "light" ? "#f9f5ea" : "#202622",
                      aspectRatio: aspect === "square" ? "1 / 1" : "3 / 1",
                    }}
                  >
                    <Image
                      src={pair[mode]}
                      alt={name + " — " + mode + " mode"}
                      width={600}
                      height={aspect === "square" ? 600 : 200}
                      unoptimized={pair[mode].endsWith(".svg")}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <figcaption className="hm-small mt-2 capitalize">{mode}</figcaption>
                </figure>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export const metadata = {
  title: "Human Motion 2.0 media audit · ClubKeep",
  robots: { index: false, follow: false },
};

export default function HumanMotionMediaGallery() {
  return (
    <main className="hm-app">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <Link href="/design" className="hm-button hm-button-secondary">
            ← Design studies
          </Link>
          <ClubThemeToggle />
        </div>
        <p className="hm-kicker hm-page-eyebrow mt-9">ClubKeep · Human Motion 2.0</p>
        <h1 className="hm-display mt-3 text-4xl sm:text-6xl">Approved media, in context.</h1>
        <p className="hm-section-subtitle mt-4 max-w-3xl">
          Visual audit of every approved Phase 1 asset. Both theme versions are displayed side by
          side. These are design references, not evidence of live club participation.
        </p>
        <AssetSet title="Brand wordmarks" items={branding} />
        <section className="hm-section">
          <h2 className="hm-section-title">Brand essentials</h2>
          <div
            className="mt-4 flex flex-wrap items-center gap-6 rounded-2xl border p-5"
            style={{ background: "var(--hm-surface)", borderColor: "var(--hm-line)" }}
          >
            <Image
              src={HM_MEDIA.branding.icon}
              alt="ClubKeep app icon"
              width={98}
              height={98}
              unoptimized
            />
            <Image
              src={HM_MEDIA.branding.monoCocoa}
              alt="ClubKeep cocoa monochrome"
              width={190}
              height={82}
              unoptimized
            />
            <Image
              src={HM_MEDIA.branding.monoIvory}
              alt="ClubKeep ivory monochrome"
              width={190}
              height={82}
              unoptimized
            />
          </div>
        </section>
        <AssetSet title="Editorial lifestyle photography" items={photoSets} />
        <AssetSet title="Custom vector illustrations" items={illustrationSets} />
        <AssetSet title="Milestone and challenge awards" items={awards} aspect="square" />
        <section className="hm-section hm-surface p-6">
          <h2 className="hm-section-title">Achievement SVG atlas</h2>
          <p className="hm-section-subtitle">
            Design/export sprite; runtime uses individual assets to preserve Chromium gradients.
          </p>
          <Image
            src={HM_MEDIA.achievements.sprite}
            alt="Achievement vector atlas"
            width={1000}
            height={600}
            unoptimized
            className="mt-4 h-auto max-w-full"
          />
        </section>
      </div>
    </main>
  );
}
