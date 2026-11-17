# B7: Owner insights

Status: implemented on a feature branch, not released. Read-only analytics over existing B1, B2 and B4 data. **No schema change and no migration.**

## Decisions (owner-confirmed, 17 Nov 2026)

- **Everything for everyone for now.** ENTITLEMENTS.md lists "basic graphs" for Free and "advanced charts, custom dashboards" for Growth/Pro. Billing (B8) does not exist yet, so B7 ships ungated. Tier gating, and the exact advanced feature list, are decided in B8. Do not read this as a decision that these are free long term.
- **Lapsing and lapsed windows are fixed:** lapsing = covered by a term that ends within 7 days; lapsed = not covered and the last term ended in the past 30 days. Per-club configuration is deferred (it would need a schema change).
- **Placement:** `/clubs/[clubId]/insights`, with a one-line lapsing summary on the overview.
- **Design system:** Human Motion 2.0, matching the live owner dashboard. `DESIGN.md` still names Luxe; reconciling it is a separate owner decision.

## What it shows

| Insight                                           | Source                                            | Rule                                                       |
| ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------- |
| Active, lapsing, lapsed counts and member lists   | `MemberSubscription` of ACTIVE `ClubMemberRecord` | Non-cancelled terms only; see `src/lib/insights-policy.ts` |
| Renewal rate (terms ended in last 30 days)        | `MemberSubscription`                              | Renewed = a later non-cancelled term exists for the member |
| Attendance, 28 days; unique members 7 and 28 days | `ClubAttendance.localDate`                        | Club-local calendar days, zero-filled                      |
| Busiest weekdays, 8 weeks                         | `ClubAttendance.localDate`                        | Monday first                                               |
| New members per month, 6 months                   | `ClubMemberRecord.joinedAt`                       | Club-local months                                          |
| Members by plan                                   | current terms, snapshot `planName`                | Top 8                                                      |
| Collections over time                             | existing `financeMonthlyTrend`                    | Per currency, never summed across currencies               |

## Rules and boundaries

- Access: OWNER and MANAGER only (same gate as finance, because the page includes revenue). STAFF and MEMBER get no insights route or nav item.
- Every query is scoped by `clubId`; callers verify the role first (`requireClubActive`). Membership health reads at most 5,000 roster rows and shows a notice if that is hit.
- Money stays in minor units per currency. No health, bio-stat or Personal data is read.
- Renewal rate counts terms, not people: back-to-back terms that both end inside the window are each judged on their own.

## Verification

- Unit tests: `tests/unit/owner-insights-policy.test.mjs`.
- The raw SQL was checked by hand against a throwaway PostgreSQL 16 database with seeded clubs (counts, renewal rate, attendance, growth and cross-club isolation). **There is no committed PG17 integration test for it yet**; add one to the native-services CI before release.
- Not yet done: `next build` on Node 26, device QA at 360/390px, screen-reader pass on the charts.
