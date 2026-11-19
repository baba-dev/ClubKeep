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
