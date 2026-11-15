# HM2-A · Human Motion 2.0 Owner Dashboard

## Scope
Eight logical commits implementing the approved visual system on the existing club owner/manager/staff overview at `/clubs/[clubId]`.

1. Scoped design tokens, Playfair/Inter typography, responsive layout and visual surfaces
2. Typed registry for every approved Phase 1 image/SVG, persistent class-based theme selection and reusable media primitives
3. Redesigned business shell, approved logo, sidebar organic landscape, accessible mobile navigation
4. Vertical-specific Yoga/Gym/Dance editorials with original Hero Flow; branded illustrated fallback for Sports/Other
5. Real, tenant-scoped dashboard metrics backed by existing Prisma models
6. Recent membership activity, editorial community photo, live challenge promotion, lifestyle and achievement preview
7. Subtle motion with reduced-motion support, theme-safe invite/member control styling, active membership count restricted to active member records
8. Complete media inspection gallery, regression tests and implementation notes

## Assets
**Original approved media only.** All 46 public visual assets are accessible through the typed registry. The flagship dashboard directly uses three hero pairs, hero-flow, sidebar landscape, four KPI waves, community, challenge, lifestyle, botanical details and all four standalone achievement artworks. The design gallery at `/design/human-motion` shows light/dark pairs, additional branding and the unified sprite without forcing all artwork into the operational page.

## Data fidelity and access
- Members: active ClubMemberRecord count, club-scoped.
- Attendance: ClubAttendance count by tenant and **club-local calendar date**.
- Active memberships: distinct member record IDs with current, uncancelled subscriptions **and active member records**.
- Revenue: grouped by currency, for the **club-local month**, with reversed payments excluded. No FX conversions or fabricated totals. Large sums beyond JS safe integer use a nonnumeric ledger fallback.
- Challenges: currently active recorded ClubChallenge entries only. When none exist, the UI offers to create one.
- Staff do not execute revenue queries, and business finance navigation remains role-restricted.
- Existing ClubManager invitation/revocation handlers, onboarding redirect, role guards and member redirect are unchanged.

## Visual QA checklist
- Desktop 1440, tablet 768 and mobile 390, at 100% and 200% text zoom
- Light and dark mode, fresh private session, saved theme and page refresh
- Yoga, Gym, Dance and Sports/Other fallback; verify matching photographic subjects and headline contrast
- Empty/new club, legacy setup, staff access, active challenge, multi-currency revenue, reversed payment, large payment total
- Keyboard focus, skip to main content, reduced-motion OS preference, mobile bottom safe area
- Sanitize any user-provided club name via React normal text rendering; never interpolate club text into CSS URLs or HTML
- Validate links for owner, manager and staff; verify restricted data never appears for staff

## Known media limitations
Brand logo/icon SVGs contain raster pixels (approved artwork, not pure vectors). The owner photos are 2172×724 rather than requested 2400×800, retaining 3:1 ratio. Dedicated class scheduling is out of scope; no mock classes are shown as real data.

## Release
This PR makes **no database migrations and no new API routes**. Keep it unmerged until x64, ARM64, PostgreSQL CI and browser screenshots pass. Deploy behind the existing release process; production verification and real-role E2E walkthrough are recommended before promoting.
