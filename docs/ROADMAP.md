# ClubKeep roadmap

Last updated: 7 Nov 2026. Agents pick work from the top unchecked item. Tick items as they ship and note anything that changes the plan.

## Phases

| Phase | When                | Goal                                                    | Gate to the next phase                       |
| ----- | ------------------- | ------------------------------------------------------- | -------------------------------------------- |
| 1     | Nov 2026            | Discover and design: interviews, scope lock             | 10 gym-owner interviews done                 |
| 2     | Dec 2026            | One-month solo build of the month-1 scope, 5 partner gyms live | 5 partner gyms using it every week     |
| 3     | Jan to Mar 2027     | Paid launch, pricing tiers live, WhatsApp AI beta       | 20 paying clubs, churn under 3% a month      |
| 4     | Apr to Sep 2027     | Scale: yoga, dance and sports templates, city leaderboards | Growth toward 100 clubs                   |

## Month-1 build order

Cut from the bottom of this list first if time runs short (order of cuts: ID card print layout, GPS check-in, leaderboard visuals). Protect onboarding, QR check-in and payment records.

1. [ ] **Foundations:** app shell, design tokens, mobile navigation, auth with phone OTP working end to end (including an SMS provider for production).
2. [ ] **Clubs and roles:** `Club`, `ClubMember`, role guards, create-a-club flow with vertical template and branding.
3. [ ] **Members and plans:** `Plan`, `Membership`, add or invite a member by phone (`Invite`), member list and renewal status.
4. [ ] **Check-in:** QR (signed rotating token), manual by staff, attendance history.
5. [ ] **Payment records:** record cash, UPI or card payments, dues, receipts.
6. [ ] **Member app:** profile, bio stats history, payment history, my clubs.
7. [ ] **ID card:** digital card page with QR to the member's profile, printable at credit-card size with one default layout.
8. [ ] **Leaderboards:** `Season`, `Activity`, `Kpi`, `Score` with approval, club leaderboard, shareable visual.
9. [ ] **Owner insights:** active vs lapsing members, revenue this month.
10. [ ] **Owner billing:** Razorpay and Stripe behind one interface, tiers and plan limits.
11. [ ] **GPS check-in** (cuttable).
12. [ ] **Polish and deploy:** empty states, errors, mobile QA, production deploy (see `docs/DEPLOYMENT.md`).

## After month 1

- WhatsApp AI messaging on Growth and Pro (channel interface, daily caps, approve-before-send).
- City leaderboards across clubs.
- Five ID card layouts for club admins to choose from.
- Yoga, dance and sports templates and their KPIs.
- AI assistant over club data; progress charts and goals.
