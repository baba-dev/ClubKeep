# ClubKeep Human Motion 2.0 — HM2-C

## Scope
Third phased PR, built against merged HM2-A and HM2-B. Updates Member Arena, five-step club onboarding, approved public discovery and public profiles, and safe nonpersistent demos.

### Member Arena
- Approved ClubKeep branding and semantic light/dark shell with focusable top navigation and mobile bottom tabs.
- Member landing uses approved community and challenge photographs **clearly labelled editorial/promo**. Personal details, dues and attendance are server-derived.
- Challenge landing uses approved `Fitness-Challenge` photo and warm landscape artwork.
- Award badge states **earned**, **in-progress** and **locked** are derived exclusively from each linked member's challenge participation and `myChallengeProgress`, which counts club-verified check-ins and approved performance scores. Neither seeded demo scores nor unapproved submissions can unlock them.
- The original 100 Sessions milestone icon is shown on member home **only when the verified visit count reaches at least 100**. The 21-day streak art isn't presented as earned without reliable consecutive-day data.
- Existing privacy consent, secure rotating QR pass, linked member guard, private receipts, renewal and score-review semantics are preserved.

### Onboarding
- Keep exact steps: `type → details → identity → membership → review`.
- Vertical cards show approved Gym, Yoga, Dance hero art with branded Sports/Other fallback.
- Existing PATCH endpoints, optimistic `expectedVersion` checks, client validation, plan creation and final completion are unchanged.
- New step progress indicator, helpful copy, responsive light/dark treatment and focus visibility.

### Public discovery
- Uses botanicals, original vector landscapes and ClubKeep wordmarks only. **No model/editorial photos are shown as real club facilities, staff or customers.**
- Public directory exposes only `LISTED` profiles, and the individual profile only `LISTED` or `UNLISTED` status, using sanitized published JSON.
- Unlisted profiles remain nonindexable; no rosters, scores or private payment data in public output.

### Demo QA
- Three deliberately fictional, resettable Gym/Yoga/Dance fixtures. All five existing role perspectives (owner, manager, staff, member, admin) and all existing feature simulations remain.
- Shareable route: `/demo?role=owner&view=overview&vertical=YOGA` (GYM/DANCE also supported). All fixtures are in-memory only; selecting vertical resets local demo data, never invokes backend APIs.
- Role switcher continues to restrict simulated data contexts without granting real permissions. Visible disclaimer and clear editorial-photo label.

## Acceptance gates
- Pass formatting, lint, TypeScript, unit suite, PostgreSQL 17, ARM64 and x64 production builds.
- Browser QA: 390×844, 768×1024, 1440×900 in light/dark for all five member tabs and secondary pages, each onboarding step, both public routes, and demo role × vertical combinations.
- Mobile: no bottom-nav overlap with QR, actions or receipts, tap targets ≥44px, reduced-motion support.
- Security: no stored passwords, persistent demo mutations, public real member portraits without owner publication, or unauthorised score/rank visibility.
- Verify no achievement is labelled earned unless backend progress criteria confirm it. Remember badges here are **derived UI**, not a separate immutable award issuance ledger.
- Do not merge without a browser pass against original media/design expectations.

No database schema migration or new backend routes are required by this visual phase.
