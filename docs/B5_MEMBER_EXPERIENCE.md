# B5 — Member Arena: digital identity and self-service

B5 delivers a member-only, mobile-first club space for Gym, Yoga, Dance, Sports and General clubs. Preserve Luxe's ink, gold and energetic orange, with restrained sport-inspired scoreboards, typography, motion and meaningful micro-interactions. Never sacrifice contrast, keyboard navigation, fast server rendering or reduced-motion support for ornament.

## Security contract
- One Better Auth verified account can be affiliated with many clubs; `ClubMembership` status ACTIVE, role MEMBER, club ACTIVE/READY or LEGACY_ACTIVE, and explicit ACTIVE `ClubMemberRecord.membershipId` linkage are required for member data.
- Unlinked members receive only a help state. No roster lookups by phone/name/email. A walk-in without a linked account remains staff-assisted.
- PersonalProfile and any sensitive health information are not queried; owner, manager, staff and platform admin permissions are not inherited by the member surface.
- Server determines the linked roster ID from verified session. Every private query uses clubId **and** memberRecordId; membership terms, B2 attendance, B4 receipts and renewal requests never expose another member.
- Rotating QR admission remains B2's existing short-lived token; printable B5 membership card **never** includes a reusable admission QR or credential.
- Financial details are a sanitized projection: no internal staff notes, recorder, bank references or reversal reasons. Payments are **staff-recorded externally** and not bank-settled or statutory invoices.
- Member renewal requests are informational, not payment transactions or automatically-created subscriptions. Only owner/manager may acknowledge/resolve; a unique pending request per club/linked roster is enforced by the database.
- All mutations require exact-origin CSRF, verified session, bounded JSON, Redis fail-closed rate limiting, tenant-specific authorization and audit. Paginate all historical lists and never return unbounded records.

## Planned member routes
- `/clubs/[clubId]/my` member arena
- `/clubs/[clubId]/my/card` own identity-only pass; link to existing `/my-attendance` for real check-in
- `/clubs/[clubId]/my/attendance` own paged attendance history
- `/clubs/[clubId]/my/payments` own paged recorded payment history
- `/clubs/[clubId]/my/receipts/[paymentId]` private sanitized printable receipt
- `/clubs/[clubId]/my/renewal` member request history and submit
- `/clubs/[clubId]/renewal-requests` owner/manager triage

## Release evidence
A green PR CI is necessary but not sufficient. Verify x64+ARM64 standalone runtime, PG17 fresh/legacy/no-op migrations, B1–B4 regression, member role and cross-club isolation, printed ID/receipts and mobile widths 360/390/768. Stage a linked and an unlinked account, run authenticated flows and an isolated off-host restore rehearsal before promotion. Automatic production release is *not* part of this PR.