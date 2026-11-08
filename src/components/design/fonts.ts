import {
  Barlow_Condensed,
  Bricolage_Grotesque,
  Caveat,
  Nunito,
  Figtree,
  Fraunces,
  Instrument_Serif,
  Sora,
  Space_Grotesk,
} from "next/font/google";

const sora = Sora({ subsets: ["latin"], variable: "--f-sora", display: "swap" });
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--f-bricolage",
  display: "swap",
});
const space = Space_Grotesk({ subsets: ["latin"], variable: "--f-space", display: "swap" });
const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--f-instrument",
  display: "swap",
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--f-barlow",
  display: "swap",
});
const fraunces = Fraunces({ subsets: ["latin"], variable: "--f-fraunces", display: "swap" });
const figtree = Figtree({ subsets: ["latin"], variable: "--f-figtree", display: "swap" });

const nunito = Nunito({ subsets: ["latin"], variable: "--f-nunito", display: "swap" });
const caveat = Caveat({ subsets: ["latin"], variable: "--f-caveat", display: "swap" });

export const designFontVars = [
  sora,
  bricolage,
  space,
  instrument,
  barlow,
  fraunces,
  figtree,
  nunito,
  caveat,
]
  .map((f) => f.variable)
  .join(" ");
