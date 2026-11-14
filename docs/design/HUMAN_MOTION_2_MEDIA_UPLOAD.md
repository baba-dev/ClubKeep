# ClubKeep — Human Motion 2.0 Phase 1 Media Upload Guide

**Repository:** `baba-dev/ClubKeep`  
**Upload root:** `public/media/human-motion/`  
**Current PR branch:** `chore/human-motion-2-media-phase1-scaffold`

This PR establishes the directories without changing UI, authentication, databases, routes, or build dependencies. Add the approved media files in a separate upload commit (on this branch while the PR is open, or on a follow-up branch after merge).

## Procedure

1. Open the branch in GitHub, then browse to `public/media/human-motion/`. Each leaf directory has a `.gitkeep` so it appears even before media arrives.
2. Upload extracted assets into their matching category subdirectories. Keep both light and dark variations, and use consistent `-light`/`-dark` suffixes.
3. Prefer Git for bulk uploads:
   ```bash
   git clone https://github.com/baba-dev/ClubKeep.git
   cd ClubKeep
   git fetch origin
   git switch chore/human-motion-2-media-phase1-scaffold
   # Copy your approved files into the appropriate folders.
   git add public/media/human-motion src/components/human-motion
   git status --short
   git commit -m "assets: add Human Motion 2.0 phase 1 media"
   git push origin chore/human-motion-2-media-phase1-scaffold
   ```
4. Or in GitHub's repository browser use **Add file → Upload files** from the correct folder. Avoid committing ZIP archives in place of extracted assets.

## Phase 1 file routing

- Approved Concept 1 logos and icon → `brand/logos/`, `brand/icons/`
- Yoga/Gym/Dance hero photos, including dark variants → `photography/heroes/yoga/`, `photography/heroes/gym/`, `photography/heroes/dance/`
- Community portraits → `photography/community/`
- Club Challenge photographic banner → `photography/challenges/`
- Two-woman studio conversation → `photography/lifestyle/`
- Classes/avatars → `photography/classes/`, `photography/avatars/`
- Hero flow, landscape layers, KPI metric waves, challenge landscape, botanical artwork → five matching `illustrations/` directories
- Achievement SVG originals → `achievements/individual/`; consolidated SVG atlas → `achievements/achievement-sprite.svg`
- Companion React source files → `src/components/human-motion/`

## Quality gates

- Only approved designs. Do not substitute earlier rejected ClubKeep logo concepts.
- Check that both modes use the same intended subject/crop, geometry, and correct design tokens.
- SVGs should contain trusted vector paths, not raster images embedded as base64. Review for script/event handlers or external references.
- Preserve `prefers-reduced-motion`; decorative illustrations must not obscure functional UI.
- Convert or optimize photographs to WebP/AVIF and remove EXIF/geolocation metadata; supply desktop/mobile art-directed crops as needed.
- Never commit private photos, identification documents, access credentials, or source files not licensed for distribution.
- The source achievement art contains fixed artwork labels such as "100 SESSIONS" and "21 DAY STREAK"; display them only when that achievement is actually earned.
- The achievement React kit deliberately loads individual SVG files instead of external `<use>` references because gradient paint servers rendered black in Chromium tests. The unified SVG atlas is for design/export.
- Inspect actual UI rendering at mobile/tablet/desktop and in both themes **before** a later dashboard integration PR.

**Public URL example:** `/media/human-motion/photography/heroes/gym/owner-gym-light.webp`. The `public/` path prefix is not part of the URL.

No media is uploaded in this scaffold PR. The artwork/React kit is available as a separate downloadable package for placement into the reserved directories.
