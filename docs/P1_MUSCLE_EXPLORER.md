# Personal interactive muscle map

**Status:** implemented on `/me/body`. No schema change, no new route, no new dependency.

## What it does
- **Planned** (default): the original map from declared activities plus club visits the user has allowed.
- **Logged**: the same map from the user's own completed workouts (`WorkoutSession` from P1-B), over 7, 28 or 90 days. Each muscle shows weighted set-equivalents, when it was last worked and which exercises contributed most.
- **Preview**: pick any catalogue activity and see which muscles it trains. It is a lens, not history.
- Tap or press Enter on a muscle for its detail; every value is also in the text list.

## How workouts become muscles
- Logged exercise names are free text, so `src/lib/personal/exercise-catalog.ts` maps keywords to muscles. Matching is lower-cased words, a keyword must start at a word boundary, and the longest keyword wins ("romanian deadlift" is not a plain deadlift, "leg curl" is not a biceps curl).
- A set counts 1; a primary muscle gets weight 1 and a secondary 0.4 (the same constants as `muscleLoad`). A timed set with no reps counts one set-equivalent per 10 minutes. Empty sets count nothing.
- A workout with no usable exercises falls back to its declared `activityKey`: one set-equivalent per 10 minutes, at least 3.
- Names the catalogue cannot place are **listed to the user as not counted**, never guessed.
- Load is relative to the most-worked muscle in the chosen window, so 100% means "most", not "a lot".

## Privacy and gating
- Reads only the signed-in user's rows. Nothing flows to clubs; the map never feeds leaderboards or club data.
- Logged data reuses P1-B's own gate (`assertWellnessEnabled`, `assertWellnessAdult` in `wellness-policy.ts`), so it is off unless `PERSONAL_WELLNESS_ENABLED=true` and the user is a clear adult. When off, "Logged" is disabled and the page says why.
- Descriptive only: no recovery score, readiness, injury or health claim.

## Files (all new unless noted)
`src/lib/personal/exercise-catalog.ts`, `muscle-training.ts`, `muscle-explorer-service.ts`; `src/components/personal/body-map/muscle-explorer.tsx`; `body-map.tsx` and `body-map.css` extended; `src/app/me/body/page.tsx` rewired. Tests: `tests/unit/personal-muscle-training.test.mjs`, two cases in `tests/integration/personal-service.test.mjs`.

## Coordination
Built to avoid Codex's in-flight work: it imports P1-B code but edits none of it, and adds no Prisma change, so it cannot conflict with the P1-C Health Connect schema branch.

## Known limits
- The exercise catalogue covers common lifts and cardio only; unusual names go to "not counted". A user-editable mapping is a possible follow-up.
- Set-equivalents are a descriptive volume count, not a validated training-load model.

## Illustration v2 (19 Nov 2026)
- **Art:** shaded, outlined front and back figure with fibre lines and anatomical landmarks. Five muscles added (neck, serratus, rhomboids, hip abductors, soleus), 25 in all. Existing ids are never renamed or split, and no stored data refers to muscle ids, so nothing needed migrating.
- **Colour coding:** five load bands (none, light, moderate, high, peak) with hatch patterns and text labels, so colour is never the only signal. A second mode colours by **last worked** (today, 1–2, 3–6, 7+ days, not in period). Both are descriptive; neither says anything about recovery or readiness. Pure rules: `src/lib/personal/load-bands.ts`.
- **Motion** (all inside `prefers-reduced-motion: no-preference`): muscles fill in head to feet; colour glides between bands; the figure turns in 3D between front and back (tap or swipe); the heaviest muscles breathe a slow warm glow; selecting a muscle pulses once; hover or focus shows a caption chip. With reduced motion everything is static and the turn is instant.
- **Replay:** a scrubbable, playable time-lapse of the last four weeks. Each day shows the trailing seven days of the user's own training, on one shared scale (`muscle-timeline.ts`). Dates are UTC.
- **Same privacy as before:** own rows only, behind P1-B's wellness gate and adult rule; absent when the gate is off. No schema change.

### Known limits
- Replay day labels are UTC calendar dates, so they can differ by a day from the user's local date.
- Hatch patterns and glow are tuned for the two shipped themes; a third theme would need re-tuning `--bm-*`.
- Saving or sharing the map as an image is not built (CSS-variable styling needs inlining first); a possible follow-up.
