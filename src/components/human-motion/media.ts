/** Approved Human Motion 2.0 public media. No remote URLs or untrusted user paths. */
const root = "/media/human-motion";
const art = (directory: string, name: string) => ({
  light: root + "/" + directory + "/" + name + "-light.svg",
  dark: root + "/" + directory + "/" + name + "-dark.svg",
});
const photo = (directory: string, name: string) => ({
  light: root + "/" + directory + "/" + name + "-light.webp",
  dark: root + "/" + directory + "/" + name + "-dark.webp",
});
export const HM_MEDIA = {
  branding: {
    primary: art("brand/logos", "clubkeep-logo"),
    stacked: art("brand/logos", "clubkeep-stacked"),
    monoCocoa: root + "/brand/logos/clubkeep-mono-cocoa.svg",
    monoIvory: root + "/brand/logos/clubkeep-mono-ivory.svg",
    icon: root + "/brand/icons/clubkeep-app-icon.svg",
  },
  heroes: {
    YOGA: photo("photography/heroes/yoga", "owner-yoga"),
    GYM: photo("photography/heroes/gym", "owner-gym"),
    DANCE: photo("photography/heroes/dance", "owner-dance"),
  },
  photography: {
    community: photo("photography/community", "community-spotlight"),
    challenge: photo("photography/challenges", "challenge-banner"),
    lifestyle: photo("photography/lifestyle", "studio-conversation"),
  },
  illustrations: {
    heroFlow: art("illustrations/hero-flow", "hero-flow"),
    sidebarLandscape: art("illustrations/landscape-layers", "landscape-layers"),
    challengeLandscape: art("illustrations/challenge-landscape", "challenge-landscape"),
    botanical: art("illustrations/botanical-detail", "botanical-detail"),
    botanicalCorner: art("illustrations/botanical-detail", "botanical-detail-corner"),
    metrics: {
      members: art("illustrations/metric-waves", "metric-members"),
      attendance: art("illustrations/metric-waves", "metric-attendance"),
      memberships: art("illustrations/metric-waves", "metric-memberships"),
      revenue: art("illustrations/metric-waves", "metric-revenue"),
    },
  },
  achievements: {
    sprite: root + "/achievements/achievement-sprite.svg",
    medal: art("achievements/individual", "achievement-medal"),
    milestone: art("achievements/individual", "milestone-badge"),
    trophy: art("achievements/individual", "challenge-trophy"),
    streak: art("achievements/individual", "streak-badge"),
  },
} as const;

export type ThemePair = { readonly light: string; readonly dark: string };
export type OwnerVertical = "YOGA" | "GYM" | "DANCE" | "SPORTS" | "OTHER";

export function heroForVertical(vertical: string): ThemePair | null {
  if (vertical === "YOGA" || vertical === "GYM" || vertical === "DANCE")
    return HM_MEDIA.heroes[vertical];
  return null;
}
