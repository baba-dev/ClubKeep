// Single source of truth for the design-direction mockups.
// The CSS custom properties are generated from this file, and the token
// sheets on each page read from it, so docs and visuals cannot drift apart.

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  line: string;
  accent: string;
  accentFg: string;
  accent2: string;
  /** Accent tuned to be readable as text/links on `bg`. */
  ink: string;
  good: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
};

export type Theme = {
  id: string;
  name: string;
  tagline: string;
  blurb: string;
  headline: string;
  highlight: string;
  tags: string[];
  bestFor: string;
  fonts: {
    display: {
      name: string;
      cssVar: string;
      weight: string;
      size: string;
      track: string;
      style: string;
    };
    body: { name: string; cssVar: string };
  };
  radius: { sm: string; md: string; lg: string };
  borderWidth: string;
  motion: {
    easeName: string;
    ease: string;
    dur: string;
    durFast: string;
    rise: string;
    signature: string;
  };
  light: Palette;
  dark: Palette;
};

export const themes: Theme[] = [
  {
    id: "aurora",
    name: "Aurora Glass",
    tagline: "Frosted glass over drifting gradient light.",
    blurb:
      "Translucent surfaces, soft glow and slow ambient motion. Feels premium and modern; great for the owner dashboard and share cards.",
    headline: "Run your club from your phone.",
    highlight: "your phone",
    tags: ["Glassmorphism", "Mesh gradients", "Glow", "Ambient motion"],
    bestFor: "Premium gyms, boutique studios",
    fonts: {
      display: {
        name: "Sora",
        cssVar: "--f-sora",
        weight: "700",
        size: "clamp(2.5rem, 7vw, 4.75rem)",
        track: "-0.035em",
        style: "normal",
      },
      body: { name: "Geist", cssVar: "--font-geist-sans" },
    },
    radius: { sm: "10px", md: "16px", lg: "26px" },
    borderWidth: "1px",
    motion: {
      easeName: "Smooth out",
      ease: "cubic-bezier(0.22, 1, 0.36, 1)",
      dur: "700ms",
      durFast: "260ms",
      rise: "28px",
      signature: "Drifting aurora blobs, shimmer sweep, glow pulse",
    },
    light: {
      bg: "#f4f3ff",
      surface: "#ffffffb3",
      surface2: "#ffffff80",
      fg: "#1b1840",
      muted: "#6a678f",
      line: "#1b184024",
      accent: "#6d4aff",
      accentFg: "#ffffff",
      accent2: "#ff5fb7",
      ink: "#5a37e8",
      good: "#0f7a55",
      shadowSm: "0 1px 2px #1b184014",
      shadowMd: "0 10px 34px -10px #6d4aff40",
      shadowLg: "0 36px 90px -24px #6d4aff66",
    },
    dark: {
      bg: "#0b0a1f",
      surface: "#ffffff0f",
      surface2: "#ffffff18",
      fg: "#f2f1ff",
      muted: "#a5a2cf",
      line: "#ffffff22",
      accent: "#8f7bff",
      accentFg: "#0b0a1f",
      accent2: "#ff7ad1",
      ink: "#b3a6ff",
      good: "#4be0a0",
      shadowSm: "0 1px 2px #00000066",
      shadowMd: "0 10px 34px -10px #000000b3",
      shadowLg: "0 36px 100px -24px #8f7bff66",
    },
  },
  {
    id: "bento",
    name: "Calm Bento",
    tagline: "Warm neutrals in a tidy, rounded tile grid.",
    blurb:
      "Modular bento tiles, generous radius, layered soft shadows and quiet colour. The calmest option, and the easiest to scale across verticals.",
    headline: "Everything your club needs, in one calm place.",
    highlight: "calm",
    tags: ["Bento grid", "Soft shadows", "Warm neutrals", "Big radius"],
    bestFor: "All-round default, multi-vertical",
    fonts: {
      display: {
        name: "Bricolage Grotesque",
        cssVar: "--f-bricolage",
        weight: "700",
        size: "clamp(2.4rem, 6.4vw, 4.3rem)",
        track: "-0.03em",
        style: "normal",
      },
      body: { name: "Geist", cssVar: "--font-geist-sans" },
    },
    radius: { sm: "12px", md: "20px", lg: "30px" },
    borderWidth: "1px",
    motion: {
      easeName: "Gentle ease-out",
      ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      dur: "600ms",
      durFast: "220ms",
      rise: "20px",
      signature: "Staggered tile reveal, hover lift, bar fills",
    },
    light: {
      bg: "#f5f2ec",
      surface: "#fffdf9",
      surface2: "#efe9de",
      fg: "#1f1d19",
      muted: "#6f6a5f",
      line: "#1f1d1917",
      accent: "#2f6f4f",
      accentFg: "#ffffff",
      accent2: "#e9b44c",
      ink: "#2f6f4f",
      good: "#2f6f4f",
      shadowSm: "0 1px 2px #1f1d1910",
      shadowMd: "0 2px 4px #1f1d1908, 0 14px 28px -10px #1f1d1920",
      shadowLg: "0 4px 8px #1f1d1908, 0 36px 64px -18px #1f1d1930",
    },
    dark: {
      bg: "#12110f",
      surface: "#1b1a17",
      surface2: "#25231f",
      fg: "#f3efe6",
      muted: "#a39d8f",
      line: "#ffffff14",
      accent: "#6fcf9a",
      accentFg: "#0f1f17",
      accent2: "#f0c36a",
      ink: "#6fcf9a",
      good: "#6fcf9a",
      shadowSm: "0 1px 2px #00000080",
      shadowMd: "0 2px 4px #00000040, 0 14px 28px -10px #000000b3",
      shadowLg: "0 4px 8px #00000040, 0 36px 64px -18px #000000cc",
    },
  },
  {
    id: "brutal",
    name: "Neo-Brutal Pop",
    tagline: "Thick outlines, hard shadows, loud confident colour.",
    blurb:
      "Playful and impossible to ignore. Hard offset shadows and snappy stepped motion give a gym-poster energy that stands out from SaaS sameness.",
    headline: "Lift. Check in. Get ranked.",
    highlight: "ranked",
    tags: ["Neo-brutalism", "Hard shadows", "Sticker UI", "Bold colour"],
    bestFor: "Youth gyms, crossfit, community clubs",
    fonts: {
      display: {
        name: "Space Grotesk",
        cssVar: "--f-space",
        weight: "700",
        size: "clamp(2.6rem, 8vw, 5.4rem)",
        track: "-0.04em",
        style: "normal",
      },
      body: { name: "Space Grotesk", cssVar: "--f-space" },
    },
    radius: { sm: "6px", md: "12px", lg: "18px" },
    borderWidth: "2.5px",
    motion: {
      easeName: "Snap",
      ease: "cubic-bezier(0.2, 0.9, 0.3, 1.2)",
      dur: "420ms",
      durFast: "120ms",
      rise: "14px",
      signature: "Press-down shadows, stepped marquee, sticker wiggle",
    },
    light: {
      bg: "#fff4d6",
      surface: "#ffffff",
      surface2: "#ffe27a",
      fg: "#111111",
      muted: "#4a4a4a",
      line: "#111111",
      accent: "#ff5c39",
      accentFg: "#111111",
      accent2: "#5b7cff",
      ink: "#c2310f",
      good: "#0f7a55",
      shadowSm: "3px 3px 0 #111111",
      shadowMd: "6px 6px 0 #111111",
      shadowLg: "10px 10px 0 #111111",
    },
    dark: {
      bg: "#14110c",
      surface: "#1f1b14",
      surface2: "#4a3a10",
      fg: "#fff4d6",
      muted: "#cfc3a0",
      line: "#fff4d6",
      accent: "#ff7a59",
      accentFg: "#14110c",
      accent2: "#8ea2ff",
      ink: "#ff7a59",
      good: "#4be0a0",
      shadowSm: "3px 3px 0 #fff4d6",
      shadowMd: "6px 6px 0 #fff4d6",
      shadowLg: "10px 10px 0 #fff4d6",
    },
  },
  {
    id: "editorial",
    name: "Editorial Mono",
    tagline: "Magazine serif, hairlines and generous whitespace.",
    blurb:
      "Restrained and confident: large serif numerals, thin rules, one sharp accent. Makes member stats feel like a feature story.",
    headline: "The quiet art of keeping members for life.",
    highlight: "for life",
    tags: ["Serif display", "Hairlines", "Whitespace", "Mono + 1 accent"],
    bestFor: "Premium clubs, yoga, wellness",
    fonts: {
      display: {
        name: "Instrument Serif",
        cssVar: "--f-instrument",
        weight: "400",
        size: "clamp(2.8rem, 8vw, 5.6rem)",
        track: "-0.02em",
        style: "normal",
      },
      body: { name: "Geist", cssVar: "--font-geist-sans" },
    },
    radius: { sm: "0px", md: "2px", lg: "4px" },
    borderWidth: "1px",
    motion: {
      easeName: "Editorial ease",
      ease: "cubic-bezier(0.65, 0, 0.35, 1)",
      dur: "900ms",
      durFast: "300ms",
      rise: "16px",
      signature: "Slow fades, underline draw, calm marquee",
    },
    light: {
      bg: "#faf9f6",
      surface: "#faf9f6",
      surface2: "#f0eee8",
      fg: "#151515",
      muted: "#6b6b66",
      line: "#15151526",
      accent: "#b4262b",
      accentFg: "#ffffff",
      accent2: "#151515",
      ink: "#b4262b",
      good: "#2d6a4f",
      shadowSm: "none",
      shadowMd: "0 1px 0 #15151514",
      shadowLg: "0 24px 48px -32px #15151540",
    },
    dark: {
      bg: "#0f0f0e",
      surface: "#0f0f0e",
      surface2: "#1a1a18",
      fg: "#f1efe9",
      muted: "#9a978e",
      line: "#f1efe933",
      accent: "#ff6b5e",
      accentFg: "#0f0f0e",
      accent2: "#f1efe9",
      ink: "#ff6b5e",
      good: "#6fd0a0",
      shadowSm: "none",
      shadowMd: "0 1px 0 #f1efe91a",
      shadowLg: "0 24px 48px -32px #000000",
    },
  },
  {
    id: "neon",
    name: "Neon Pulse",
    tagline: "High-voltage athletic energy, built for the leaderboard.",
    blurb:
      "Condensed italic caps, electric lime and a performance-tracker feel. Rankings and streaks look like a broadcast scoreboard.",
    headline: "Train hard. Rank harder.",
    highlight: "Rank harder.",
    tags: ["Condensed type", "Electric lime", "Glow", "Scoreboard"],
    bestFor: "Strength gyms, sports clubs, competitions",
    fonts: {
      display: {
        name: "Barlow Condensed",
        cssVar: "--f-barlow",
        weight: "800",
        size: "clamp(3rem, 9vw, 6.2rem)",
        track: "-0.01em",
        style: "italic",
      },
      body: { name: "Geist", cssVar: "--font-geist-sans" },
    },
    radius: { sm: "4px", md: "10px", lg: "16px" },
    borderWidth: "1px",
    motion: {
      easeName: "Sprint",
      ease: "cubic-bezier(0.7, 0, 0.2, 1)",
      dur: "520ms",
      durFast: "160ms",
      rise: "22px",
      signature: "Fast marquee, glow pulse, scan line, skewed buttons",
    },
    light: {
      bg: "#f1f5ee",
      surface: "#ffffff",
      surface2: "#e4ebdd",
      fg: "#0d1409",
      muted: "#55624d",
      line: "#0d140924",
      accent: "#c6f432",
      accentFg: "#0d1409",
      accent2: "#ff3d71",
      ink: "#3f6b00",
      good: "#2f7d0b",
      shadowSm: "0 1px 2px #0d140914",
      shadowMd: "0 12px 30px -12px #3f6b0050",
      shadowLg: "0 36px 70px -24px #3f6b0070",
    },
    dark: {
      bg: "#070a05",
      surface: "#10150c",
      surface2: "#1a2213",
      fg: "#eef5e6",
      muted: "#9aa88c",
      line: "#c6f43233",
      accent: "#c6f432",
      accentFg: "#0d1409",
      accent2: "#ff3d71",
      ink: "#c6f432",
      good: "#c6f432",
      shadowSm: "0 0 0 1px #c6f43222",
      shadowMd: "0 0 0 1px #c6f43233, 0 0 34px -6px #c6f43255",
      shadowLg: "0 0 0 1px #c6f43244, 0 0 70px -8px #c6f43266",
    },
  },
  {
    id: "clay",
    name: "Studio Clay",
    tagline: "Soft, puffy, tactile, with springy motion.",
    blurb:
      "Claymorphic surfaces with inset highlights, terracotta and sage. Friendly and warm, tuned for yoga and dance studios and the member app.",
    headline: "A softer way to run your studio.",
    highlight: "softer",
    tags: ["Claymorphism", "Spring motion", "Earthy palette", "Organic shapes"],
    bestFor: "Yoga, dance, pilates, member app",
    fonts: {
      display: {
        name: "Fraunces",
        cssVar: "--f-fraunces",
        weight: "650",
        size: "clamp(2.5rem, 6.8vw, 4.6rem)",
        track: "-0.025em",
        style: "normal",
      },
      body: { name: "Figtree", cssVar: "--f-figtree" },
    },
    radius: { sm: "14px", md: "24px", lg: "36px" },
    borderWidth: "0px",
    motion: {
      easeName: "Spring",
      ease: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      dur: "750ms",
      durFast: "320ms",
      rise: "26px",
      signature: "Spring bounce, morphing blob, squish on press",
    },
    light: {
      bg: "#f7ece6",
      surface: "#fff7f2",
      surface2: "#f1ddd3",
      fg: "#3a2a2a",
      muted: "#7a625c",
      line: "#3a2a2a1a",
      accent: "#c4513a",
      accentFg: "#ffffff",
      accent2: "#8aa67b",
      ink: "#b0432d",
      good: "#4f7a40",
      shadowSm: "inset 0 2px 0 #ffffffcc, inset 0 -3px 6px #c4513a1f, 0 6px 14px -6px #c4513a40",
      shadowMd: "inset 0 3px 0 #ffffffd9, inset 0 -7px 14px #c4513a22, 0 18px 32px -12px #c4513a55",
      shadowLg:
        "inset 0 4px 0 #ffffffe6, inset 0 -10px 20px #c4513a26, 0 34px 60px -20px #c4513a66",
    },
    dark: {
      bg: "#1d1514",
      surface: "#2a1e1c",
      surface2: "#36272a",
      fg: "#f8e9e1",
      muted: "#c0a49b",
      line: "#f8e9e11f",
      accent: "#f08a6e",
      accentFg: "#2a1410",
      accent2: "#a9c39a",
      ink: "#f08a6e",
      good: "#a9c39a",
      shadowSm: "inset 0 2px 0 #ffffff14, inset 0 -3px 6px #00000050, 0 6px 14px -6px #000000aa",
      shadowMd: "inset 0 3px 0 #ffffff18, inset 0 -7px 14px #00000055, 0 18px 32px -12px #000000bb",
      shadowLg:
        "inset 0 4px 0 #ffffff1c, inset 0 -10px 20px #0000005c, 0 34px 60px -20px #000000cc",
    },
  },
];

export function getTheme(id: string) {
  return themes.find((t) => t.id === id);
}

function paletteVars(p: Palette) {
  return [
    `--dk-bg:${p.bg}`,
    `--dk-surface:${p.surface}`,
    `--dk-surface-2:${p.surface2}`,
    `--dk-fg:${p.fg}`,
    `--dk-muted:${p.muted}`,
    `--dk-line:${p.line}`,
    `--dk-accent:${p.accent}`,
    `--dk-accent-fg:${p.accentFg}`,
    `--dk-accent-2:${p.accent2}`,
    `--dk-ink:${p.ink}`,
    `--dk-good:${p.good}`,
    `--dk-shadow-sm:${p.shadowSm}`,
    `--dk-shadow-md:${p.shadowMd}`,
    `--dk-shadow-lg:${p.shadowLg}`,
  ].join(";");
}

/** Emits scoped CSS variables for every theme in both colour modes. */
export function themeCss() {
  return themes
    .map((t) => {
      const base = [
        `--dk-r-sm:${t.radius.sm}`,
        `--dk-r:${t.radius.md}`,
        `--dk-r-lg:${t.radius.lg}`,
        `--dk-bw:${t.borderWidth}`,
        `--dk-ease:${t.motion.ease}`,
        `--dk-dur:${t.motion.dur}`,
        `--dk-dur-fast:${t.motion.durFast}`,
        `--dk-rise:${t.motion.rise}`,
        `--dk-f-display:var(${t.fonts.display.cssVar})`,
        `--dk-f-body:var(${t.fonts.body.cssVar})`,
        `--dk-w-display:${t.fonts.display.weight}`,
        `--dk-track:${t.fonts.display.track}`,
        `--dk-fs-display:${t.fonts.display.size}`,
        `--dk-style-display:${t.fonts.display.style}`,
      ].join(";");
      return `[data-dk="${t.id}"]{color-scheme:light;${base};${paletteVars(t.light)}}\n.dark [data-dk="${t.id}"]{color-scheme:dark;${paletteVars(t.dark)}}`;
    })
    .join("\n");
}
