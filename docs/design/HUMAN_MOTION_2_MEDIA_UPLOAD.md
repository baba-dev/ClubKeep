# Human Motion 2.0 — Media Phase 1 Audit & Upload Map

**Repository:** `baba-dev/ClubKeep` — **PR #28 branch:** `chore/human-motion-2-media-phase1-scaffold`

## Corrections applied

1. Moved all downloaded media from `src/components/human-motion/` to `public/media/human-motion/`. SVG and WebP content was moved by Git blob identity, not re-encoded.
2. Saved all seven UI screenshot mockups under `docs/design/human-motion/references/` (design references are **not** runtime public assets).
3. Preserved four reusable React kit files directly under `src/components/human-motion/`.
4. Deleted exact duplicate medal SVGs and the redundant `achievements/individual/achievement-sprite.svg`.
5. Corrected unique SVG gradient IDs in the remaining `achievements/achievement-sprite.svg` atlas, avoiding conflicting paint-server names.
6. Moved the ClubKeep app icon out of the metrics folder; removed obsolete `.gitkeep` placeholders from populated directories.

## File mapping

| Source upload | Correct destination |
| --- | --- |
| `branding/ClubKeep-Logo.svg` | `public/media/human-motion/brand/logos/clubkeep-logo-light.svg` |
| `branding/ClubKeep-Logo-dark.svg` | `public/media/human-motion/brand/logos/clubkeep-logo-dark.svg` |
| `branding/ClubKeep-Stacked-Web*.svg` | `public/media/human-motion/brand/logos/clubkeep-stacked-{light,dark}.svg` |
| `branding/ClubKeep-Mono-*.svg` | `public/media/human-motion/brand/logos/clubkeep-mono-{cocoa,ivory}.svg` |
| `metrics/ClubKeep-App-Icon.svg` | `public/media/human-motion/brand/icons/clubkeep-app-icon.svg` |
| `models/Hero-*.webp` | `public/media/human-motion/photography/heroes/{yoga,gym,dance}/owner-*-{light,dark}.webp` |
| `models/Community-*.webp` | `public/media/human-motion/photography/community/community-spotlight-{light,dark}.webp` |
| `models/Fitness-Challenge-*.webp` | `public/media/human-motion/photography/challenges/challenge-banner-{light,dark}.webp` |
| `models/additional-*.webp` | `public/media/human-motion/photography/lifestyle/studio-conversation-{light,dark}.webp` |
| `decorations/*.svg` | `public/media/human-motion/illustrations/{botanical-detail,hero-flow,landscape-layers,challenge-landscape}/` |
| `metrics/metric-*.svg` | `public/media/human-motion/illustrations/metric-waves/` |
| `medals/*.svg` | `public/media/human-motion/achievements/individual/` |
| `concepts/*.png` | `docs/design/human-motion/references/` |
| React achievement files | `src/components/human-motion/` |

## Audited formats and limitations

- Six owner-hero images: **2172 × 724 px** each, light/dark matched. These were originally requested at 2400 × 800, but they preserve the exact 3:1 ratio; do not enlarge without purpose.
- Community pair: **1659 × 948**; Club Challenge pair: **1774 × 887**; studio lifestyle pair: **1586 × 992**. All have valid RIFF / WEBP / VP8X signatures.
- All 18 illustration SVGs are valid structured SVG text with matching mode viewBoxes, resolved local paint references, no script / foreignObject, and reduced-motion styles.
- The seven logo/app icon files have valid SVG containers but **contain embedded raster imagery**. They are not master vectors. Some contain baked backgrounds. Treat them as approved display artwork until exact native-vector source is made.
- Missing from this Phase 1 upload: three planned class thumbnails, eight demo profile photos, and future motion clips. Their folders are intentionally empty.
- Use the four original achievement badges only with truthful earned-status data. Some contain static labels like 100 sessions or a 21-day streak.
- The atlas now has unique paint-server IDs; React should continue using the standalone SVG versions because external SVG sprite rendering is inconsistent in Chromium.

## Verification

Run `npm test` (includes `tests/unit/human-motion-media.test.mjs`) and inspect real browser screenshots on light, dark, mobile and desktop prior to merging. No original application routes, data models, or authentication flows are changed in this media PR.
