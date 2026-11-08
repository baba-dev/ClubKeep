// "Pen & Pencil" tokens. One source for the generated CSS and the token sheet.

export const sketchLight = {
  paper: "#f4f3ff",
  paper2: "#ffffff",
  ink: "#1b1840",
  fg: "#1b1840",
  muted: "#6a678f",
  grid: "#1b184012",
  c1: "#ff7ac6",
  c2: "#a99bff",
  c3: "#6ee7c3",
  c4: "#8fb4ff",
  c5: "#b79fff",
  c6: "#ffb3e1",
  n1: "#6d4aff",
  n2: "#e0309a",
  n3: "#0f7a55",
  goldA: "#1b1840",
  goldB: "#1b1840",
  goldC: "#1b1840",
} as const;

export const sketchDark = {
  paper: "#0b0a1f",
  paper2: "#14122e",
  ink: "#b3a6ff",
  fg: "#f2f1ff",
  muted: "#a5a2cf",
  grid: "#8f7bff12",
  c1: "#ff7ad1",
  c2: "#8f7bff",
  c3: "#4be0a0",
  c4: "#6aa8ff",
  c5: "#b3a6ff",
  c6: "#ff9ae0",
  n1: "#9ad0ff",
  n2: "#ff7ad1",
  n3: "#4be0a0",
  goldA: "#e6e0ff",
  goldB: "#8f7bff",
  goldC: "#4b3aa8",
} as const;

export type SketchKey = keyof typeof sketchLight;

const kebab = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function vars(p: Record<string, string>) {
  return Object.entries(p)
    .map(([k, v]) => `--${kebab(k)}:${v}`)
    .join(";");
}

export function sketchCss() {
  return `.sk-root{color-scheme:light;${vars(sketchLight)}}\n.dark .sk-root{color-scheme:dark;${vars(sketchDark)}}`;
}

export const paletteGroups: { label: string; keys: SketchKey[] }[] = [
  { label: "Paper and ink", keys: ["paper", "paper2", "ink", "muted"] },
  { label: "Vivid fills", keys: ["c1", "c2", "c3", "c4", "c5", "c6"] },
  { label: "Highlights", keys: ["n1", "n2", "n3"] },
  { label: "Glow ramp (dark mode)", keys: ["goldA", "goldB", "goldC"] },
];

export const tokenNames: Record<SketchKey, string> = {
  paper: "Paper",
  paper2: "Card",
  ink: "Ink / line",
  fg: "Text",
  muted: "Muted",
  grid: "Grid",
  c1: "Orchid pink",
  c2: "Violet",
  c3: "Aurora mint",
  c4: "Periwinkle",
  c5: "Lilac",
  c6: "Blush",
  n1: "Highlight 1",
  n2: "Highlight 2",
  n3: "Highlight 3",
  goldA: "Glow light",
  goldB: "Glow mid",
  goldC: "Glow deep",
};
