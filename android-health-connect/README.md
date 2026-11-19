# ClubKeep Personal — Android Health Connect companion

This is a dedicated, native **read-only** Android companion for authorized
fitness sync. The main HM2 Personal experience stays in Next.js. No clinical
records, advertising/analytics SDKs, background-reading or write-back
permissions are requested. minSdk 28, targetSdk 36.

Requires Android Studio with JDK 17, Android SDK 36 and Gradle 8.13. Use
`gradle :app:assembleDebug -PclubkeepBaseUrl=https://YOUR_REVIEWED_CLUBKEEP_ORIGIN`.
A local `gradle` install or CI-provisioned Gradle is required; no unsigned
Gradle wrapper JAR is committed. The placeholder `invalid.clubkeep.example`
intentionally refuses pairing. Before publishing, verify the real
applicationId, Play app ownership, signing keys, Privacy Policy and Health
Connect declarations.

**No APK is released by merging this source PR.** Device tests and platform
approval must precede enabling the server-side connector gate.
