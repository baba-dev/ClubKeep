# Personal P1-B — Wellness Engine

**Status:** stacked implementation PR on top of draft Personal P1-A (#44). Feature disabled by default. Native integrations and medical features are NOT shipped.

## Scope
- User-owned active/archived goals, completed workout log (with structured exercise/sets), manual sleep, meals, hydration and optional recovery journal.
- Private 90-day descriptive insights and goal progress based on completed records. No AI-generated score, diagnosis, emergency monitoring, or inferred nutrient values.
- Limited completed-workout form: one optional strength exercise/set per submission, no running/pause/offline-draft engine in this PR. Broader exercise editor is follow-up.
- No provider credentials, HealthKit, Health Connect, medical-history tables, medications, BP, glucose or insurer/ABHA routes.
- `PERSONAL_WELLNESS_ENABLED=false` until adult policy, privacy, stage and backup/restore acceptance. The flag protects all new writes, reads and routes; existing P1-A remains separately accessible.

## Ownership and privacy
- Authenticated, verified-email Better Auth session required; POST same-origin and fail-closed Redis guards inherited from Personal P1-A; adult rule is conservative birth-year threshold 19 until jurisdiction-aware DOB/guardian policy exists.
- All wellness rows bind directly to global user ID and never to Club tenancy. Club attendance may affect a Personal-only muscle estimate solely under existing consent; there is **no reverse health-to-club access**.
- Workout, sleep, meal and water writes use per-user UUID idempotency keys. Source metadata is reserved for a future native adapter and not used to authorize any import.
- Personal export/erase includes new rows and their children, leaving the login and club memberships intact. Retention/backups must follow separately reviewed privacy policy. The existing P1-A measurement-count guard is unchanged, and the owner must reconcile it with Free unlimited essential fitness history.

## Rollout gate
1. Merge PR #44 and reconcile branch onto the reviewed main; recheck current HM2 login, billing and Personal API changes before merging this PR.
2. Native PG17 fresh/upgrade/redeploy and restore drill; ensure MenuMinute and ERP unaffected. Never roll back additive schema with drop tables.
3. x64 and ARM64 CI green, 360/390/768/1440px light/dark responsive browser QA, manual time-zone and cross-user QA.
4. Confirm legal/age handling by target country; this gate deliberately keeps under-age accounts out.
5. Set flag only in protected ClubKeep web environment and restart only ClubKeep. Verify api rejection with flag off, and permissions after flag on.
6. Roll back by setting flag false and restarting ClubKeep; do not delete user records.

## Known limits
- Goals are weekly/total; for long periods timezone boundary queries may need a stronger zone-aware indexed aggregation model.
- Recent-days analytics reads capped to avoid an unbounded query; current explicit 90-day view, with total goal progress separately queried.
- No Personal billing entitlement engine exists yet; essential tracking is free, with advanced Pro analytics deferred rather than granting unapproved access.
- Recovery is self-reported only. Food macros are optional user-supplied numbers, never inferred.
- Native HealthKit/Health Connect permissions, per-provider cursors, offline encrypted queue and writeback are separate PRs P1-C/P1-D.
