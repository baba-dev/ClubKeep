# Personal P1-C — Android Health Connect native companion

**Status:** implementation PR, **NOT** an activated, approved, deployed mobile health integration.
Base: merged Personal P1-A/B. Server launch requires both
`PERSONAL_WELLNESS_ENABLED=true` and `PERSONAL_HEALTH_CONNECT_ENABLED=true`.
Both remain off in the repository sample environment. Production flags MUST
remain disabled until release acceptance, legal review and real device tests.

## Native application
- `android-health-connect/` is a new, deliberately small Android app. Build:
  `gradle :app:assembleDebug :app:testDebugUnitTest -PclubkeepBaseUrl=https://REVIEWED-CLUBKEEP-ORIGIN`.
  Gradle 8.13, JDK 17, Android SDK 36; AGP 8.13.2, stable Health Connect 1.1.0.
- The placeholder `https://invalid.clubkeep.example` refuses pairing. Before
  a Play release, confirm actual package ID, Play ownership, upload signing,
  website origin and approved privacy statement. A merge never uploads an APK.
- Foreground-only user-initiated sync. **NO** background permission, full-history
  permission, writes, heart rate, medication, blood glucose, clinical data, ads
  SDK, analytics SDK or external AI transmission.
- Read permissions: steps, workout sessions, sleep, active energy; hydration
  must be checked separately. Android/Health Connect may grant partial subsets.
  System grants are checked immediately before each sync. The server sees
  **device-reported categories**, never a claim of OS-attested permissions.

## Secure account pairing
1. Verified adult signs in through Better Auth at `/me/connections`, then
   explicitly requests a single-use 256-bit pairing code (10 minutes).
2. Enters code in the native app, which transmits the code over the operator-
   configured HTTPS origin. No web cookies or password are stored on Android.
3. Server atomically redeems one code for a 256-bit 30-day device bearer
   capability scoped to its user's **Personal** fitness-only routes.
4. Android stores token, installation ID, HC change cursor and deletion index
   encrypted using Android Keystore AES-GCM; Android auto-backup is off.
   Credentials are **encrypted at rest** but are still bearer credentials, not
   hardware-attested cryptographic device signatures. Treat rooted devices
   and device compromise as material residual risks.
5. The user may revoke from either device or web. Re-pairing rotates the
   secret; expiration requires new pairing. No club role authorizes access.

## Data flow and source correctness
- Aggregated daily steps use `StepsRecord.COUNT_TOTAL`, not summed raw samples.
- Session/energy/hydration data are read with paginated, bounded queries.
- Snapshots import up to 29 days of authorized history. The connector does
  not request Health Connect's extended history permission. Actual readable
  history depends on the user's OS and grants.
- Source IDs are user+record-kind+package+external-ID unique, retaining exact
  source provenance. Each upload is an atomic, size-limited, retry-safe batch;
  source tombstones prevent accidental resurrection.
- Device-side Changes tokens advance **only after server acknowledgement**.
  Deletion changes contain no record type: encrypted local source indexing is
  used. Unknown deleted IDs are not guessed. Expired tokens trigger bounded
  re-snapshot. Daily steps are refreshed with aggregate queries. This does not
  promise perfect deletion reconciliation for unavailable historical records;
  a device/source reconciliation workflow is a follow-up.
- Imported activity is displayed separately from manual workout goals. Mirrored
  fitness apps may describe the same workout: do not sum blindly or infer
  clinical readiness. Reconciliation and canonical cross-source goal counting
  are separate hardening tasks.

## Privacy and operations
- Sources live only under the global Personal User. No club join, sponsor,
  Business admin, leaderboard, advertisement or insurance integration has
  access to the imported content.
- `/api/me/data/export` includes normalized imported data and non-secret
  connection metadata; never exports connection token hashes or pairing codes.
- `/api/me/data/delete` invalidates connections and deletes their imported
  data and batches as part of Personal erasure. User may instead disconnect
  devices without deleting prior copies, or explicitly purge imported copies
  (which also revokes connections to prevent immediate re-import).
- Retain only private `no-store` HTTP responses. Do not log tokens, raw
  payloads, exercise/sleep record IDs, personal health metrics or data in
  third-party crash/analytics products.
- Server-side rollback: set `PERSONAL_HEALTH_CONNECT_ENABLED=false` in
  protected ClubKeep environment, restart only `clubkeep-web`. Never delete
  the additive schema as part of a rollback, never touch ERP/MenuMinute.

## Mandatory acceptance before launch
1. PG17 migration, drift check, legacy preservation, export/erase/cross-user,
   two-device duplicate and revoked-device tests green.
2. x64 and ARM64 builds green with existing Business/Personal smoke tests;
   Android JDK17, Gradle, SDK 36 `assembleDebug` and unit tests green.
3. On real Android 13 and Android 14+ devices: missing Health Connect,
   unavailable SDK, partial grant, denial/revoke during sync, token expiry,
   disconnected account and repeated pairing.
4. Steps from multiple original apps must not double count, imported workouts
   retain package identity, duplicate batch retry is safe; interrupted sync
   does not skip changes; deleted local data is reconciled to tombstones.
5. Validate permission rationale, Play Console Health app + per-type HC
   declarations, a public monitored privacy contact, consent, data safety,
   data deletion and target API policies. Check legal minimum account age
   versus conservative 19+ Personal wellness rule.
6. Physical UI checks at mobile font scaling, light/dark, TalkBack.
   Confirm no signed Play release is made without owner approval.

**Open / explicitly deferred:** Health Connect extended-history/background
permissions, WorkManager schedule, push reminders, native read-to-HealthKit,
source conflict review UX, canonical combined goal metrics, encrypted offline
upload queue beyond the local cursor, Play Integrity attestation, advanced
analytics entitlements, medical/clinical features, signed production APK.
