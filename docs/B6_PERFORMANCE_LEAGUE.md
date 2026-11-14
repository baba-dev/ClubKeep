# B6 — ClubKeep Performance League, Challenge Season & Engagement

Status: feature PR under review, not released. Built on B5 (#24) and existing B1–B4. **All five club verticals**, no auto-enabled public profiles.

## Locked safety and design principles

- Club-verified, nonclinical activity scores only. Club scores are **not** individual medical/biometric data or a proxy for health.
- Members **explicitly opt into private club rankings**. Opt-out hides all rows and revocation is immediate on the next read; history is retained for lawful audit, not exposed in rankings. Only active, explicitly linked MEMBERS of the same ACTIVE/READY club can opt in. No PUBLIC, citywide or cross-tenant leaderboard.
- Owners configure **three-month seasons**, starting on the first day of a club-selected month. Exact global quarter anchors were unapproved, so they remain owner-selectable. Seasons cannot overlap.
- Five curated KPI units: whole-kilogram strength lift (GYM), match points (SPORTS), judged routine score (DANCE), guided practice minutes (YOGA), training minutes (all). Bounds are server validated and database constrained. No body composition, body-fat, heart rate, clinical or Personal metrics.
- Member or staff may propose a score; **OWNER/MANAGER approve or reject** only after the source is verified. Submitter cannot approve their own score. Approvals and rejections are auditable and one-way; no edits to verified values. Only APPROVED score per linked, opted-in, active member appears.
- Ranking uses **best APPROVED score per member per metric per season**, descending numeric value; ties resolve by earliest approval and then immutable ID. Stable ranks never combine different units.
- Challenges are private, club-scoped and member opt-in; progress calculated from authoritative B2 visits or approved B6 scores. Attendance challenges rely solely on recorded club check-ins; never self-asserted GPS, heart rate or health tracking. Badges are *computed*, not cash prizes.
- Club staff can assist submissions and view queues as appropriate. Challenges never charge, automatically extend a term, or modify B4 finances. Owners retain moderation control.
- No ads, teen public discovery, public names, social sharing endpoint, Personal clinical data, AI scoring, leaderboards across clubs, or marketplace.
- Privacy and mobile safety: no third-party image URLs, no personal scores in metadata, no analytics event payloads with names, no screenshots exported from server, no unverified external connections.

## Acceptance gate

- PG17 fresh/legacy/no-op migration and drift; native FK/uniqueness/check/isolation tests; concurrency/idempotency and no cross-tenant score approvals.
- Unit tests for metric gating, 3-month seasons, ranking tie-breaking, challenge/consent policy.
- x64 + ARM64 Next standalone, fail-closed route guards, bounded queries, keyboard and screen-reader labels, small viewport 360/390px, reduced motion.
- Staging-linked/unlinked/suspended/walk-in accounts, opt-in/opt-out, duplicate score submissions, unauthorized self-approval, cross-club cursor and challenge join refusal, real scoreboard and staff workflows.
- Release only after operator backup/restore rehearsal and MenuMinute isolation smoke; PR doesn't deploy automatically.
