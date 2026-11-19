// Colour coding for the muscle map. Colour is never the only signal: every band also has a text label
// and a pattern in the SVG, so the map stays readable for colour-blind users and in print.

export type Band = 0 | 1 | 2 | 3 | 4;
export type ColorMode = "volume" | "recent";

export interface BandInfo {
  band: Band;
  key: string;
  label: string;
  /** Short range text for the legend. */
  range: string;
}

/** How much work a muscle got, relative to the most-worked muscle in the period. */
export const VOLUME_BANDS: readonly BandInfo[] = [
  { band: 0, key: "none", label: "Not worked", range: "0%" },
  { band: 1, key: "light", label: "Light", range: "up to 25%" },
  { band: 2, key: "moderate", label: "Moderate", range: "26–50%" },
  { band: 3, key: "high", label: "High", range: "51–75%" },
  { band: 4, key: "peak", label: "Peak", range: "over 75%" },
];

/** How long ago a muscle last got work. Descriptive only; it says nothing about readiness or recovery. */
export const RECENCY_BANDS: readonly BandInfo[] = [
  { band: 0, key: "never", label: "Not in this period", range: "" },
  { band: 1, key: "old", label: "7+ days ago", range: "" },
  { band: 2, key: "mid", label: "3–6 days ago", range: "" },
  { band: 3, key: "recent", label: "1–2 days ago", range: "" },
  { band: 4, key: "today", label: "Today", range: "" },
];

export function loadBand(load: number): Band {
  if (!(load > 0)) return 0;
  if (load <= 0.25) return 1;
  if (load <= 0.5) return 2;
  if (load <= 0.75) return 3;
  return 4;
}

export function recencyBand(daysAgo: number | undefined): Band {
  if (daysAgo === undefined || !Number.isFinite(daysAgo)) return 0;
  if (daysAgo <= 0) return 4;
  if (daysAgo <= 2) return 3;
  if (daysAgo <= 6) return 2;
  return 1;
}

export function bandInfo(mode: ColorMode, band: Band): BandInfo {
  return (mode === "volume" ? VOLUME_BANDS : RECENCY_BANDS)[band];
}
