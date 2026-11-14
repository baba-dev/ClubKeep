# ClubKeep Human Motion 2.0 — Asset Upload Root

This is the permanent public asset directory for the approved **Human Motion 2.0** design. This PR contains placeholders, not finished media. Copy approved light/dark originals into the matching subdirectories; do not upload ZIP files in place of extracted media.

## Destinations
| Media family | Subdirectory | File examples |
| --- | --- | --- |
| Logos and wordmarks (Concept 1) | `brand/logos/` | `clubkeep-wordmark-light.svg`, `clubkeep-wordmark-dark.svg` |
| App icon/favicon | `brand/icons/` | `clubkeep-icon.svg` |
| Yoga hero | `photography/heroes/yoga/` | `owner-yoga-light.webp`, `owner-yoga-dark.webp` |
| Gym hero | `photography/heroes/gym/` | `owner-gym-light.webp`, `owner-gym-dark.webp` |
| Dance hero | `photography/heroes/dance/` | `owner-dance-light.webp`, `owner-dance-dark.webp` |
| Three-woman community portraits | `photography/community/` | `community-spotlight-light.webp`, `community-spotlight-dark.webp` |
| Club Challenge photos | `photography/challenges/` | `challenge-banner-light.webp`, `challenge-banner-dark.webp` |
| Two-person studio lifestyle | `photography/lifestyle/` | `studio-conversation-light.webp`, `studio-conversation-dark.webp` |
| Classes and demo avatars | `photography/classes/`, `photography/avatars/` | `vinyasa-flow.webp`, `demo-person-01.webp` |
| Hero flow SVG | `illustrations/hero-flow/` | `hero-flow-light.svg`, `hero-flow-dark.svg` |
| Sidebar landscape SVG | `illustrations/landscape-layers/` | `landscape-layers-light.svg`, `landscape-layers-dark.svg` |
| All KPI waves | `illustrations/metric-waves/` | `metric-members-light.svg`, `metric-attendance-dark.svg`, `metric-memberships-light.svg`, `metric-revenue-dark.svg` |
| Challenge background SVG | `illustrations/challenge-landscape/` | `challenge-landscape-light.svg`, `challenge-landscape-dark.svg` |
| Botanical accents | `illustrations/botanical-detail/` | `botanical-detail-light.svg`, `botanical-detail-corner-dark.svg` |
| Eight original achievement SVGs | `achievements/individual/` | `achievement-medal-light.svg`, `streak-badge-dark.svg` |
| Achievement SVG atlas | `achievements/` | `achievement-sprite.svg` |
| Other optional web motion files | `motion/` | optimized `.webm` or SVG |

React kit destination: `src/components/human-motion/`.

## URL mapping
A file committed at `public/media/human-motion/photography/heroes/gym/owner-gym-light.webp` is served at `/media/human-motion/photography/heroes/gym/owner-gym-light.webp`.

Use lowercase hyphenated names and `-light`/`-dark` siblings. Preserve SVG viewBoxes and reduced-motion behavior. WebP/AVIF for photography, actual SVG vectors for illustrations, no embedded UI text/metrics in photography. Do not commit raw unoptimized masters, unlicensed or private photos, EXIF location data, or sensitive customer information.

These assets are **publicly accessible**. The scaffold introduces no runtime imports or route changes, so empty placeholders cannot break the existing application.

Full upload guide: `docs/design/HUMAN_MOTION_2_MEDIA_UPLOAD.md`.
