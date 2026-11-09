// "Luxe" tokens: BabaBuilds orange + gold, sleek and premium.
// One source for the generated CSS and the token sheet.

export const orangeRamp = [
  { step: "50", hex: "#fff3e6" },
  { step: "100", hex: "#ffe2c2" },
  { step: "200", hex: "#ffc78a" },
  { step: "300", hex: "#ffa451" },
  { step: "400", hex: "#ff8a24" },
  { step: "500", hex: "#f26b00" },
  { step: "600", hex: "#cc5200" },
  { step: "700", hex: "#9c3d00" },
  { step: "800", hex: "#6b2900" },
  { step: "900", hex: "#3d1700" },
] as const;

export const luxeLight = {
  bg: "#fff8f1",
  surface: "#ffffff",
  surface2: "#fff1e3",
  fg: "#2a1608",
  muted: "#7a5a45",
  line: "#2a160820",
  accent: "#f26b00",
  accentFg: "#2a1608",
  ink: "#b84a00",
  goldA: "#f1d58b",
  goldB: "#c99a2e",
  goldC: "#8a6416",
  good: "#2f7d4f",
  shadowMd: "0 1px 0 #ffffff inset, 0 14px 32px -16px #b84a0040",
  shadowLg: "0 1px 0 #ffffff inset, 0 34px 64px -28px #b84a0066",
} as const;

export const luxeDark = {
  bg: "#0b0705",
  surface: "#17100b",
  surface2: "#211710",
  fg: "#fbf1e6",
  muted: "#b8a08c",
  line: "#f6dc9b24",
  accent: "#ff7a1a",
  accentFg: "#2a1608",
  ink: "#ffa451",
  goldA: "#f6dc9b",
  goldB: "#d4a84a",
  goldC: "#8a6416",
  good: "#7fd6a0",
  shadowMd: "0 1px 0 #ffffff14 inset, 0 24px 40px -24px #000",
  shadowLg: "0 1px 0 #ffffff1c inset, 0 40px 70px -28px #000, 0 0 60px -26px #ff7a1a",
} as const;

export type LuxeKey = keyof typeof luxeLight;

const kebab = (k: string) => k.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

function vars(p: Record<string, string>) {
  return Object.entries(p)
    .map(([k, v]) => `--lx-${kebab(k)}:${v}`)
    .join(";");
}

export function luxeCss() {
  return `.lx-root{color-scheme:light;${vars(luxeLight)}}\n.dark .lx-root{color-scheme:dark;${vars(luxeDark)}}`;
}

export const roleGroups: { label: string; keys: LuxeKey[] }[] = [
  { label: "Surfaces and text", keys: ["bg", "surface", "surface2", "fg", "muted", "line"] },
  { label: "Brand orange", keys: ["accent", "ink", "accentFg"] },
  { label: "Gold accents", keys: ["goldA", "goldB", "goldC"] },
];

export const roleNames: Record<LuxeKey, string> = {
  bg: "Background",
  surface: "Surface",
  surface2: "Surface 2",
  fg: "Text",
  muted: "Muted",
  line: "Hairline",
  accent: "Orange",
  accentFg: "On orange",
  ink: "Orange text",
  goldA: "Gold light",
  goldB: "Gold",
  goldC: "Gold deep",
  good: "Positive",
  shadowMd: "Shadow md",
  shadowLg: "Shadow lg",
};
