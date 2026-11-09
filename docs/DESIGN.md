# ClubKeep design tokens and theme

Status: **approved direction is "Luxe"** (BabaBuilds orange and gold, sleek and premium). Live reference: `/design/luxe`. Earlier explorations (`/design`, `/design/sketch`) are kept only as history and are not the product theme.

The token values below are generated from `src/components/luxe/tokens.ts`. When the two disagree, fix the code or this file in the same change. When these tokens move into the real app, port them into `src/app/globals.css` (and map them to the shadcn/ui variables) instead of importing from the mockup folder.

## Principles

- Sleek and quietly luxurious, not cartoonish: 1px hairlines, fine line art, soft glow, no hard offset shadows or sticker outlines.
- Orange is the brand colour. Gold is an accent only (hairline borders, active markers, flags, ID card, primary-button sheen, premium icons). Never use gold for large fills or body text.
- Warm neutrals only; no cool greys.
- Mobile first and one-handed. The shell is a left rail on desktop, icon rail on tablets, and a floating bottom tab bar under 760px.
- Light and dark must both be first class. Dark mode is a glossy warm near-black with gold gradient borders and orange glow.

## Colour

Brand orange ramp (same in both modes):

| Step | Hex       |
| ---- | --------- |
| 50   | `#fff3e6` |
| 100  | `#ffe2c2` |
| 200  | `#ffc78a` |
| 300  | `#ffa451` |
| 400  | `#ff8a24` |
| 500  | `#f26b00` |
| 600  | `#cc5200` |
| 700  | `#9c3d00` |
| 800  | `#6b2900` |
| 900  | `#3d1700` |

Note: the orange hex values are our own interpretation of the BabaBuilds orange. If the brand supplies official values, change `orangeRamp` and the roles below.

Semantic roles (CSS variables are `--lx-<kebab-name>` in the mockup):

| Role     | Light                   | Dark        |
| -------- | ----------------------- | ----------- |
| bg       | `#fff8f1`               | `#0b0705`   |
| surface  | `#ffffff`               | `#17100b`   |
| surface2 | `#fff1e3`               | `#211710`   |
| fg       | `#2a1608`               | `#fbf1e6`   |
| muted    | `#7a5a45`               | `#b8a08c`   |
| line     | `#2a160820`             | `#f6dc9b24` |
| accent   | `#f26b00`               | `#ff7a1a`   |
| accentFg | `#2a1608`               | `#2a1608`   |
| ink      | `#b84a00` (orange text) | `#ffa451`   |
| goldA    | `#f1d58b`               | `#f6dc9b`   |
| goldB    | `#c99a2e`               | `#d4a84a`   |
| goldC    | `#8a6416`               | `#8a6416`   |
| good     | `#2f7d4f`               | `#7fd6a0`   |

Rules:

- Orange text on light backgrounds uses `ink`, not `accent`, to keep contrast.
- Gold gradient is `goldA -> goldB -> accent` (diagonal) for strokes and hairlines, `goldB -> accent` (horizontal) for fills such as the primary button.
- Charts: line and area use `accent`, area fades from 38% to 0% opacity, the peak point is highlighted with a larger dot and a tag.

## Typography

- Display and big numbers: **Fraunces** (soft serif). Emphasised words in headlines use the gold-to-orange gradient text.
- UI and body: **Nunito**.
- Keep the scale small and consistent; numerals in KPIs and the leaderboard use the display face.

## Surface, shape and elevation

- Panels: `surface` background, 1px `line` border, generous radius, `shadowMd`. Hero or featured elements use `shadowLg`.
- Dark mode panels get a gold gradient hairline border (CSS mask) and a faint orange glow on featured items.
- Icons: lucide, thin stroke, gold gradient stroke for premium or featured icons.
- Illustrations: technical line drawings (construction circles, tick ring, dimension lines, callouts) rather than filled cartoons.

## Motion

- Scroll reveal: fade and rise through an IntersectionObserver (`data-in`).
- Count-up for KPIs, stroke draw-on for chart lines and art (`pathLength=1`), slow sheen on gold surfaces, slow orbit on the tick ring.
- Theme switch crossfades with the View Transitions API.
- Everything is disabled under `prefers-reduced-motion`.

## Theme switching

- Dark mode is a `.dark` class on `<html>`. The root layout sets `suppressHydrationWarning` because an inline script applies the stored choice before paint.
- Preference is stored in `localStorage["ck-theme"]`; with no stored value it follows the system setting.

## Layout (app shell)

- Desktop: left rail (brand, nav with scroll tracking, club card), top bar (search, notifications, theme toggle), content in a 12-column grid.
- Tablet (under 1100px): rail collapses to icons.
- Phone (under 760px): rail hidden, floating bottom tab bar.
- Member app is shown in a phone mockup: compact gold ID card, streak, one-tap check-in with a progress ring.

## Where the reference lives

- `src/app/design/luxe/page.tsx` and `luxe.css`: full page and styling.
- `src/components/luxe/`: `tokens.ts`, `art.tsx` (hero art, chart, gauge, sparkline, QR), `luxe-client.tsx` (check-in, scroll spy).
- Shared helpers (theme toggle, reveal, count-up, demo data) are in `src/components/design/`.

## Gotchas

- Prettier's Tailwind plugin strips leading spaces inside template-literal class strings; use explicit ternaries for conditional classes.
- CSS custom property names are case-sensitive; generated names are kebab-case (`--lx-gold-a`).
- SVG gradients using `objectBoundingBox` fail on zero-height paths; give those a solid stroke.
- The mockups use fictional demo data only (masked phone numbers, integer minor-unit money).
