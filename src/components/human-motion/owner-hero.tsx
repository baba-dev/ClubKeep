import Link from "next/link";
import { ArrowUpRight, UsersRound, ScanLine, Sparkles } from "lucide-react";
import { HM_MEDIA, heroForVertical } from "./media";
import { ThemeArtwork } from "./media-components";

const text = {
  YOGA: {
    kicker: "Wellness, with belonging",
    heading: "Grow a community that feels like home.",
    body: "A little more space for people, practice, and meaningful progress. Every membership and every visit matters.",
  },
  GYM: {
    kicker: "Built for moving forward",
    heading: "Stronger clubs. Stronger together.",
    body: "Welcome members, celebrate showing up, and keep your gym moving with confidence.",
  },
  DANCE: {
    kicker: "Every movement matters",
    heading: "Make room for every beautiful move.",
    body: "A vibrant home for dancers, inspiration, and the shared joy of showing up.",
  },
  SPORTS: {
    kicker: "Make the team feel at home",
    heading: "Build something worth showing up for.",
    body: "Keep your athletes, memberships and club operations connected in one place.",
  },
  OTHER: {
    kicker: "Your people, one place",
    heading: "Move together. Belong together.",
    body: "Welcome to a thoughtful way to manage your club and bring the community closer.",
  },
} as const;

export function OwnerHero({
  clubId,
  clubName,
  vertical,
  canInvite,
}: {
  clubId: string;
  clubName: string;
  vertical: string;
  canInvite: boolean;
}) {
  const kind = vertical in text ? (vertical as keyof typeof text) : "OTHER";
  const copy = text[kind];
  const photo = heroForVertical(kind);
  const base = "/clubs/" + encodeURIComponent(clubId);
  return (
    <section className="hm-owner-hero" aria-labelledby="hm-hero-heading">
      {photo ? (
        <ThemeArtwork pair={photo} className="hm-owner-photo" />
      ) : (
        <ThemeArtwork pair={HM_MEDIA.illustrations.challengeLandscape} className="hm-owner-photo" />
      )}
      <ThemeArtwork pair={HM_MEDIA.illustrations.heroFlow} className="hm-hero-flow" />
      <div className="hm-owner-hero-content">
        <p className="hm-kicker" style={{color: "#f4d5bc", margin: 0}}>
          <Sparkles className="mr-2 inline size-4" aria-hidden="true" />{copy.kicker}
        </p>
        <h2 id="hm-hero-heading" className="hm-display mt-5">{copy.heading}</h2>
        <p>{copy.body}</p>
        <p className="hm-kicker mt-5" style={{fontSize: ".62rem", color: "#f2dbc4"}}>
          {clubName}
        </p>
        <div className="hm-hero-actions">
          {canInvite && (
            <Link href="#hm-operations" className="hm-button hm-button-primary" style={{background: "#e1e7d5", color: "#2e4937"}}>
              <UsersRound className="size-4" aria-hidden="true" /> Invite members <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
          )}
          <Link href={base + "/attendance"} className="hm-button" style={{border: "1px solid #ffffff8c", color: "#fffaf0", background: "#241d1960"}}>
            <ScanLine className="size-4" aria-hidden="true" /> Open check-in
          </Link>
        </div>
      </div>
    </section>
  );
}
