# Terms of Use and Privacy Notice: review checklist

Status: **live, written by an engineer, not reviewed by a lawyer.** `/legal/terms` and `/legal/privacy` are linked from the sign-in page, which says that by continuing a user agrees to them and confirms they are 13 or older (owner decisions, 18 Nov 2026: age 13, a visible notice with no checkbox, no "draft" banner on the pages). Neither page claims compliance with any law. This file is the checklist for the owner and a lawyer; it replaces the banner as the safety net.

The text lives in `src/app/legal/terms/page.tsx` and `src/app/legal/privacy/page.tsx`; the shared facts (age, operator, paths, last-updated date, contact) live in `src/lib/legal.ts`. **Update `LEGAL_LAST_UPDATED` with every edit.**

## Owner action: contact address

The pages show a contact line, and the Privacy Notice shows a "Questions and requests" section, **only when `LEGAL_SETTINGS.contactEmail` is set** in `src/lib/legal.ts`. It is `null` today because no monitored mailbox has been supplied, and a published address that bounces is worse than none. Until it is set, users have no stated way to ask about, correct or delete their information. Set it to a real, monitored address and update the date.

## Clauses deliberately left out (needs a lawyer or an owner decision)

- **Liability and warranties:** limits, disclaimers, indemnity.
- **Disputes:** courts or arbitration, jurisdiction beyond "laws of India". No city or court is named.
- **Termination:** notice, grounds, effect on a club's data (the Terms only say access may be suspended for misuse).
- **Data retention:** how long account, club and security records are kept, and what happens after a club closes.
- **Access, correction, deletion and export:** the process, timelines and who handles them. The product has no self-service export or delete, so the pages promise none and only point to the contact address once it exists.
- **Children and under-18s:** the pages state age 13 or older, nothing more. `docs/HEALTH_INTEGRATIONS.md` notes that people under 18 are children under India's DPDP framework, and there is no guardian or teen flow. This is an **accepted risk**: reconsider before any marketing push, teen-facing features or Personal health data.
- **Regulatory notices:** any grievance officer, data-protection officer, or statutory notice the operator is required to publish.
- **International transfers:** Google and Stripe process data outside India.
- **Processors:** data-processing terms with Google, Razorpay, Stripe and the hosting provider.
- **Intellectual property and content:** ownership and licences for what clubs upload.
- **Refunds and cancellation of owner plans** beyond "cancel any time, active until the end of the paid period".
- **Cookies law:** only a session cookie and a theme preference are used (see below), but whether any notice is required is a legal question.

## Facts to confirm before relying on the pages

Each statement below was checked against the code or docs on 18 Nov 2026. Re-check after relevant changes.

| Statement                                                                                                                                                                                           | Where it was checked                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| No advertising, third-party analytics or tracking tools                                                                                                                                             | No such package in `package.json` and no such code in `src`; guarded by `tests/unit/legal-notice.test.mjs` |
| Browser storage: session cookie, theme choice (`ck-theme`), invite link in `sessionStorage` until joined                                                                                            | `src/components/human-motion/theme-provider.tsx`, `src/components/clubs/join-club-client.tsx`              |
| Google asked only for `openid email profile`                                                                                                                                                        | `src/lib/oauth-policy.ts`                                                                                  |
| Sessions record IP address and browser type; passkeys store only a public credential                                                                                                                | `prisma/schema.prisma` (`session`, `passkey`)                                                              |
| Short-lived IP-keyed abuse counters; audit records of sensitive actions                                                                                                                             | `src/lib/auth-rate-limit.ts`, `SecurityEvent`                                                              |
| Club records: name, member number, join date, plans, check-ins, recorded fees, renewal requests, opt-in scores                                                                                      | B1 to B6 runbooks; `ClubMemberRecord` and related models                                                   |
| Phone numbers are optional, entered by clubs, unverified, never used to sign in                                                                                                                     | `docs/PRODUCT.md`, `ClubContact`                                                                           |
| No SMS or phone verification                                                                                                                                                                        | Phase 0 decisions; no SMS code exists                                                                      |
| Email links are sent from the operator's own mail server                                                                                                                                            | `docs/PHASE_0C_RUNBOOK.md`                                                                                 |
| Owner subscriptions are billed by Razorpay (India) or Stripe, on their hosted pages                                                                                                                 | `docs/B8_BILLING.md`                                                                                       |
| Failed renewal: plan active 7 days, then Free; nothing deleted                                                                                                                                      | `docs/B8_BILLING.md`, `src/lib/billing/policy.ts`                                                          |
| **Owner statements, not verifiable from code:** "we do not sell personal information"; "we may suspend access to accounts that misuse ClubKeep"; the operator is BabaBuilds; governing law is India | Confirm these are the owner's policy                                                                       |
| Not mentioned, to confirm: whether traffic passes through a CDN or security proxy such as Cloudflare (docs say "if configured")                                                                     | `docs/BAREMETAL_DEPLOYMENT.md`                                                                             |

## Changing the pages

Edit the page, update `LEGAL_LAST_UPDATED`, run `npm run test` (the guard tests check the age, the operator, the sign-in wording, and that no page promises an unbuilt feature or claims legal compliance), and update this file if a clause is added or a fact changes. The Terms apply from the moment a change is deployed.
