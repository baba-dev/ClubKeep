# ClubKeep design system: Human Motion 2.0 (HM2)

Status: **HM2 is the approved design system** for all authenticated club workspaces (owner, manager, staff, member) and for onboarding, public club discovery and the demo. Owner decision, 17 Nov 2026. It replaces **Luxe** (orange and gold), which was the earlier direction and is kept only as history.

Source of truth for tokens is `src/app/human-motion.css` (plus `human-motion-operations.css`, `human-motion-community.css`, `human-motion-demo.css`, `human-motion-motion.css`). When this file and the CSS disagree, fix the CSS or this file in the same change.

Phase notes and acceptance gates live in `docs/design/` (`HM2A_OWNER_DASHBOARD.md`, `HM2B_OPERATIONS.md`, `HM2C_MEMBER_PUBLIC_DEMO.md`, `HUMAN_MOTION_2_MEDIA_UPLOAD.md`).

## Principles

- Warm, calm and human: earthy sage, terracotta and cocoa on warm cream (light) or deep green-charcoal (dark). Not neon, not cartoonish, no hard offset shadows.
- Operational controls come first. The QR scanner, member actions, renewal decisions and financial controls take priority over decorative media.
- Mobile first and one-handed. Light and dark are both first class.
- Honest data: real numbers only, no fabricated KPIs, never sum across currencies, and clear empty states.
- Editorial photography is illustrative. Never present it as real members, staff or the actual club. Achievement art is decorative, not evidence of an earned credential.
- Never sacrifice contrast, keyboard navigation, fast server rendering or reduced-motion support for ornament.

## Colour tokens

Defined on `.hm-app` (light) and `html.dark .hm-app` (dark). Use the variables, never raw hex, in components.

| Variable           | Role                             | Light     | Dark      |
| ------------------ | -------------------------------- | --------- | --------- |
| `--hm-bg`          | Page background                  | `#f9f5ea` | `#1b201e` |
| `--hm-surface`     | Cards and panels                 | `#fffdf8` | `#272b27` |
| `--hm-raised`      | Hover and raised areas           | `#f3eadc` | `#32372f` |
| `--hm-text`        | Body text                        | `#382a24` | `#f5eddf` |
| `--hm-muted`       | Secondary text                   | `#7c6a5e` | `#c0b7a8` |
| `--hm-line`        | Hairline borders                 | `#e7dacf` | `#4b5046` |
| `--hm-sage`        | Decorative accent                | `#8a9b7a` | `#9fac88` |
| `--hm-sage-deep`   | Icons, chart fills, active marks | `#4d664b` | `#a4b596` |
| `--hm-terracotta`  | Warnings and attention           | `#c16643` | `#e09a77` |
| `--hm-cocoa`       | Warm secondary accent            | `#6b4a3b` | `#e2b599` |
| `--hm-action`      | Primary button fill              | `#456044` | `#9cac8f` |
| `--hm-action-text` | Text on primary button           | `#fffaf1` | `#1b231d` |
| `--hm-shadow`      | Soft panel shadow                | see CSS   | see CSS   |

Rules:

- Sage is the primary brand and action colour; terracotta signals attention (expiring, overdue, destructive); cocoa is a quiet secondary.
- Charts use `--hm-sage-deep` fills on `--hm-line` tracks, scaled within one currency only.
- Do not hard-code dark-only colours in shared components (several older finance and settings pages still do; migrate them to the variables when touched).

## Typography

- Display, headlines and large numerals: **Playfair Display** (`--font-hm-playfair`).
- UI and body: **Inter** (`--font-hm-inter`).
- Both are loaded in `src/app/layout.tsx`. Keep the type scale small and consistent.

## Surface, shape and elevation

- Panels: `.hm-surface` (`--hm-surface`, 1px `--hm-line` border, 22px radius, `--hm-shadow`). Buttons and inputs use a 14px radius.
- Primary actions: `.hm-button .hm-button-primary`; secondary: `.hm-button-secondary`. Status chips: `.hm-ops-pill` (with `--active`, `--urgent`, `--expired`).
- Operations surfaces use the `hm-ops-*` classes (`hm-ops-section`, `hm-ops-stat`, `hm-ops-row`, `hm-ops-chart*`, `hm-ops-empty`). Prefer these over new one-off styles.
- Icons: `lucide-react`, decorative ones `aria-hidden`.

## Media and illustration

- Every approved image or SVG is registered in `src/components/human-motion/media.ts` (`HM_MEDIA`) and rendered through `media-components.tsx` (`ThemeArtwork`, `ClubKeepBrand`), which picks the light or dark variant. Do not reference media files by raw path.
- Vertical editorials: Yoga, Gym and Dance use matching photography; Sports and Other use branded illustrated artwork.
- Public pages use botanicals, vector landscapes and wordmarks only, never photos implying real facilities, staff or customers.
- Never interpolate club-supplied text into CSS URLs or HTML.

## Motion

- Subtle only (`human-motion-motion.css`). Everything is disabled under `prefers-reduced-motion` (see the media query at the end of `human-motion.css`).

## Theme switching

- `next-themes` with the `class` attribute: dark mode is `.dark` on `<html>`. Default is **dark**, system preference is not followed (`ClubKeepThemeProvider`).
- The choice is stored in `localStorage["ck-theme"]`. The toggle is `ClubThemeToggle`.

## Layout (workspace shell)

- `BusinessShell` (owner, manager, staff) and `MemberArenaShell` (members) wrap every workspace route. Do not build page chrome by hand.
- Desktop: left sidebar (brand, club switcher, navigation grouped under "Club operations", account security). Breakpoints in the CSS: 1500, 1100, 860 and 540px.
- Phone: sidebar becomes a floating bottom navigation (`.hm-mobile-nav`, safe-area aware) with the five primary destinations; the remaining destinations stay reachable from the header menu.
- Every shell has a skip-to-content link and a visible focus ring. Touch targets are at least 44px.
- Navigation is role-aware: staff never see finance or insights; settings and public profile are owner only. Add a destination by extending the `nav` list and the `Active` union in `business-shell.tsx`.

## Where the reference lives

- `src/app/human-motion*.css`: tokens and component classes.
- `src/components/human-motion/`: media registry, owner dashboard pieces, shared charts (`collections-trend.tsx`, `insights-charts.tsx`), operations UI, achievement art.
- `src/components/clubs/business-shell.tsx`, `member-arena-shell.tsx`: shells.
- `/design/human-motion`: media inspection gallery (light and dark pairs).

## Visual QA checklist

- Desktop 1440, tablet 768 and mobile 390 (and 360 for narrow Android), at 100% and 200% text zoom.
- Light and dark mode, fresh private session, saved theme after reload.
- Gym, Yoga, Dance and the Sports/Other fallback.
- Empty and new club, legacy setup, staff access, multi-currency revenue, reversed payment, very large totals.
- Keyboard focus order, skip link, screen-reader labels (charts must expose their numbers as text), reduced motion, no horizontal overflow, bottom navigation not overlapping actions.
- Verify restricted data never appears for staff.

## Known media limitations

Brand logo and icon SVGs contain raster pixels (approved artwork, not pure vectors). Owner photos are 2172×724 rather than the requested 2400×800 (3:1 kept). Dedicated class scheduling is out of scope; never show mock classes as real data.

## Personal product

The separate Personal health experience (see [DELIVERY_PLAN.md](DELIVERY_PLAN.md)) should share these tokens and components but present a distinct health-focused layout rather than a copy of the club dashboard. Its detailed design is not yet specified.

## History: Luxe (superseded)

Luxe (BabaBuilds orange `#f26b00` and gold accents, Fraunces and Nunito, gold hairline borders, left rail / icon rail / floating tab bar) was the first approved direction. Its mockups remain at `/design/luxe` (`src/app/design/luxe/`, `src/components/luxe/`) and earlier delivery docs (B2–B5, Phase 0C) still say "Luxe"; read those as meaning the current HM2 system. Do not build new screens in Luxe.
