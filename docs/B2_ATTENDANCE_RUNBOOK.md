# B2 — Attendance and Check-in release contract

**Scope:** eight commits B2-A through B2-H on top of merged Phase 0D and B1. This runbook is not evidence of live deployment, physical camera verification or approved commercial Free quotas.

## Tenant-scoped data

- `ClubAttendance` is an append-only private club register, unique `(clubId, memberRecordId, localDate)`, with composite roster FK, UTC timestamp, event method, authenticated staff actor and optional manager exception.
- `Club.timeZone` is an OWNER-controlled IANA timezone (default UTC). Entry captures a club-local YYYY-MM-DD *snapshot*, never rewriting history when the timezone changes. B1 membership start/end remain UTC midnight boundaries; this release does **not** quietly reinterpret them as local-time expirations.
- Every check-in transaction validates the caller's verified session, active club membership, roster status and current membership term, and locks the roster row to serialize with B1 archives/renewals. Duplicate submissions are rejected by PostgreSQL uniqueness, not an in-memory cache.
- A member's short-lived QR is HMAC-SHA256 domain-separated from invitations. The token binds club ID + roster ID + 30-second bucket and is accepted for the current or immediately previous bucket (~30–60s max). It is delivered via a private no-store JSON GET, rendered locally into QR without external APIs, never placed in URLs or logs.
- Only a verified **MEMBER** with an explicitly linked, ACTIVE roster record and currently valid plan can issue their QR. Only verified OWNER/MANAGER/STAFF may redeem a QR, look up roster candidates or write attendance; a member sees only their own pass and recent visits.
- Walk-ins without a global identity use receptionist **manual** check-in. If no current plan exists, QR and staff entry fail closed. OWNER/MANAGER may permit exactly one manual exception with an 8–240-character reason. STAFF cannot override expiry. Expired plans must never be extended or paid automatically by check-in.
- POST protection: exact-origin CSRF + Fetch Metadata, Better Auth verified session, isolated non-evicting Redis rate limits, bounded 4KiB Zod JSON. Export is OWNER/MANAGER only, date-scoped to 31 days and at most 5,000 rows with CSV formula-neutralization; no phone, medical, or Personal records.
- Browser QR scanning uses on-device BarcodeDetector and opt-in getUserMedia where supported, with explicit fallback to USB/Bluetooth keyboard-emulating readers and manual search; no camera frames are uploaded. Camera tracks stop on pause/unmount.

## Owner/member journeys

- `/clubs/[clubId]/attendance`: accessible Luxe reception screen with signed QR scan, HID fallback, manual member search, clear membership status, daily KPIs, live refreshed arrivals and owner-only timezone configuration.
- `/clubs/[clubId]/attendance/history`: cursor-paginated 25-rows-per-page date/member/method filter and scoped CSV export. Fixed-size indexed queries, no unbounded client list.
- `/clubs/[clubId]/my-attendance`: member-facing private rotating QR pass and the last 15 own check-ins. Unlinked people are directed to reception without creating a fake auth account.
- `/clubs/[clubId]/members/[memberId]`: reception staff can view a member's four most recent check-ins and filtered history. Personal health data remains inaccessible.
- One recorded check-in per club-local day is the **MVP operational policy**. Multiple daily visits / exits / attendance edits are deferred. A photographed live QR could still be used within its ~60s signing window, so continue staff supervision.

## Mandatory release and device checks

1. **CI:** x64 lint/Prettier/typecheck/unit/Next build, ARM64 standalone build, PG17 fresh/upgrade/no-op migrations and diff, and the existing Phase 0 identity and B1 tests.
2. **Security:** HMAC tamper/expiry/future/cross-club tests, SQL unique and composite-FK isolation, fail-closed unauthenticated or inactive member, manager-only override, CSV injection, rate limits and exact-origin CSRF.
3. **Human staging/device QA:** Android Chrome and reception tablet camera permission allow/deny, orientation/front-camera fallback, browser without BarcodeDetector, hardware USB/Bluetooth QR scanner, 360/390px layouts, keyboard focus, voiceover, reduced motion, weak Wi-Fi, double scans and tab background/foreground.
4. **Staging workflow:** walk-in registration → plan assignment → manual entry → next club day → verified account link → live QR scan → expired rejected → manager documented exception → history/export.
5. **Ops:** separate ClubKeep backup and verified restore drill, isolated PostgreSQL DB/role, dry-run migration and release, auth proxy trust review. Do not migrate/restart MenuMinute or touch its Redis, database or deployment.
6. **Unapproved commercial policy:** Free-tier monthly attendance/usage quotas remain OPEN; this code does not invent numeric limits. Verify any negotiated limits before production commercial activation.

## Explicit non-goals

No GPS, offline attendance sync, printable/static ID cards, payment capture or recording, API to personal medical data, public self-service kiosk, autonomous facial identification or SMS. Physical device QA and live staging use are **not** implied by CI green.
