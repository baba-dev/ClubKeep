# HM2-B — Human Motion operations release guide

This PR targets **HM2-A** and must merge after it. It redesigns operational surfaces without modifying database schemas, auth, API contracts or business rules.

| Route | Experience | Retained functional contract |
| --- | --- | --- |
| `/members` | Editorial directory, compact roster metrics, search and accessible status filters | Tenant-scoped search, phone visibility and membership detail navigation |
| `/plans` | Premium offer cards, real active/archived counts and collapsible archive | Create/edit/archive APIs and immutable historical membership snapshots |
| `/attendance` | Scanner-first reception workspace, real check-in counters, manual fallback | Camera permission, signed QR validation, staff overrides and attendance records |
| `/renewals` | Attention timeline (expiring before expired/unassigned) and amber badges | No payments in renewal flow, member-specific renewal operations unchanged |
| `/finance` | Currency-separated totals, server-rendered real monthly net collection charts | Existing finance summaries, exclusions for reversed payments, authorized receipt access |
| `/competition` | Branded challenge landscape, real status metrics, verified-score action | Private leaderboards and server-side approval remain protected |
| `/settings` | Owner-only identity editor, approved editorial preview and actual publication status | Owner role gate and separate profile moderation flow |

The approved Human Motion 2.0 media remains under `public/media/human-motion/`. Editorial photography is illustrative and must not be represented as a photo of real members or the actual club. Award artwork is decorative, not evidence of earned credentials. None of the route pages introduces fictional KPI values.

## Visual review

- Desktop 1440 × 900, tablet 768 × 1024 and mobile 390 × 844.
- Light mode, dark mode and persisted theme after reload.
- Gym/Yoga/Dance clubs, and Sports/Other fallback.
- Empty and populated members, active/archived plans, expiring/expired/unassigned members, no attendance, camera denied, staff-assisted attendance, empty/filled payments, multi-currency payments, reversed receipts, no active season.
- Staff, manager and owner permissions. Staff must not see finance; settings must be owner only.
- Keyboard focus, touch target sizes, horizontal overflow, screen reader labels, reduced motion.
- Public profile status must reflect actual `ClubPublicProfile.status`, never an inferred approved listing.

The QR scanner, member actions, renewal decisions, and financial controls take priority over decorative media.

## CI

Run the repository checks for formatting, ESLint, TypeScript, unit/integration tests, PostgreSQL 17 and ARM64/x64 production builds. Screenshot acceptance remains a separate browser verification step.
