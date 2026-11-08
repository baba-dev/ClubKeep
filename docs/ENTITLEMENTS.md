# ClubKeep entitlements and monetization — Round 2 reconciliation

**As of 9 November 2026.** **LOCKED** means user-approved. **OPEN** means no entitlement quantity or operational policy has been authorized. No code has been implemented by this document. [BUSINESS_SPEC.md](BUSINESS_SPEC.md) is the binding decision register.

## Personal B2C — approved price/entitlement matrix

| Capability | Personal Free | Personal Pro | Personal Premium/AI |
| --- | --- | --- | --- |
| Monthly India / global target | **₹0 / $0** | **₹199 / $4** | **₹499 / $10** |
| Annual billing | Not applicable | Approximately 20% off monthly total; final checkout rounding OPEN | Approximately 20% off monthly total; final checkout rounding OPEN |
| AI requests per month | **5** | **50** | **250** |
| Manual health, body, workout and condition-related tracking | **Included, unlimited essential tracking** | Included | Included |
| Authorized Apple Health / Health Connect imports | **Included, with provider permissions** | Included | Included |
| Direct wearables | Progressive basic imports where supported; named launches OPEN | Basic + premium/advanced licensed connector capabilities, exact list OPEN | Pro capabilities |
| Existing synced data and raw historical records | **Available and retained; import all allowed history** | Same underlying data | Same underlying data |
| Charts & insights | **Basic graphs** | Advanced charts, custom dashboards, expanded history analysis, deeper insights | Pro + larger AI allowance |
| Goals, progress, community | Basic goals; optional friends, challenges, badges and achievements | Enhanced goals/programs/coaching | Pro + AI allowance |
| Personal medical documents and medications | **Included**, subject to storage/anti-abuse policies; unverified OCR results are drafts | Included | Included |
| Insurance policy records | In scope, stored privately; eligibility verification is separate | Included | Included |
| India ABHA consent-based exchange | Intended regional feature, contingent on ABDM approval | Same consent-based eligibility | Same consent-based eligibility |
| Export/delete of own health data | Must remain available | Included | Included |
| AI fitness conversational coaching | Up to 5 eligible requests/mo | Up to 50 requests/mo | Up to 250 requests/mo |
| Clinical decision support | **Not launched without independent medical validation** | No subscription-based bypass | No subscription-based bypass |
| Ads | Contextual/non-health-derived AdSense **only** on adult-eligible public education/guides/discovery web/PWA routes | No ads | No ads |

**Interpretive boundaries:** Free historical records and medical data must not be hidden, shortened or deleted upon downgrade; Pro "longer history" is **analytical lookback**, not stored-data retention. Free imports are not equal to every commercial premium vendor capability: contract-bound advanced connections may be premium. Enhanced features and which vendor capabilities are premium remain OPEN.

**Annual discount arithmetic (illustrative only, NOT approved price points):** ₹199 × 12 × 0.8 = ₹1,910.40; $4 × 12 × 0.8 = $38.40; ₹499 × 12 × 0.8 = ₹4,790.40; $10 × 12 × 0.8 = $96. Rounding and inclusive/exclusive taxes OPEN. App-store purchase requirements apply by region and app capability. Groq and NVIDIA NIM routing must respect privacy consent and each tier's 5/50/250 limits; cost-weighted accounting or top-ups are NOT approved.

## Business B2B — paid tiers preserved; Free added

| Capability | **Free** (new) | Starter | Growth | Pro |
| --- | --- | --- | --- | --- |
| Monthly India / global | **₹0 / $0** | **₹299 / $5** | **₹749 / $15** | **₹1,799 / $25** |
| Active club members | **25** | **75** | **300** | **Unlimited** (subject to fair use/capacity) |
| Staff | **1 staff account** (owner counting OPEN) | **2** | **10** | OPEN from existing pricing doc |
| Locations | OPEN | **1** | OPEN from existing pricing doc | **Multi-location** |
| Essential member/plans/renewals/dues and attendance | **Accessible with usage quotas** | Included | Included | Included |
| QR + manual check-in, payment recording, ID cards, club leaderboard | Core access with usage quotas (exact implementation OPEN) | Included | Included | Included |
| GPS | OPEN; no new entitlement granted | Not listed in Starter | Included | Existing higher-tier entitlement must be verified |
| City leaderboards, advanced insights | OPEN; no new entitlement granted | Not listed | Included | Existing higher-tier entitlement must be verified |
| WhatsApp AI daily messages | Not included as paid entitlement | Not listed | **50** | **200** |
| API export / priority support | OPEN / not promised | Not listed | Not listed | **Included** |
| Sponsored Personal Pro member seats | **0** | **0 bundled under #39** | **Included; exact count OPEN** | **Included; exact count OPEN** |
| Membership payment processing by ClubKeep | **Never** (records only) | Never | Never | Never |

**No new tier guarantees** are silently inferred from generic names like Pro. Where the original PRODUCT.md has a clear feature commitment, preserve it. Its Starter/Growth/Pro prices, member limits and named features stand; unlisted quantities remain OPEN. Free Club monthly activity/attendance/record quotas are **OPEN**, not to be guessed.

### Free club limit handling — design requirements, not selected numbers

- Default to access to the essential modules rather than feature blackouts; enforce defined counts/quotas server-side in central entitlement middleware, with a readable usage meter.
- Do not silently delete members or past attendance on an upgrade/downgrade. When over limit, retain read-only historical records and disable **new over-quota** actions, subject to a future explicit approval.
- Clearly show whether the 25-member count includes inactive and pending members, and whether owner consumes the single staff account; both **OPEN**.
- Free clubs cannot sponsor premium Personal benefits. Sponsored seats are limited to paid Growth/Pro tier, based on Round 2 #39; quantities and reclaim behavior **OPEN**.

## Cross-product benefit model

- A user's **Personal subscription** and access are keyed to their global user identity, never club-scoped. The user's Club membership is keyed to club tenant + identity.
- A paid Growth/Pro club can assign its finite sponsored **Personal Pro** seats to consenting eligible members. **Sponsorship changes feature entitlement only**: it never permits club staff to view private health metrics.
- A member's effective Pro entitlement may come from their own subscription or a club sponsorship. Upgrading to Premium/AI is a separate personal action; sponsored Pro is not Premium.
- When sponsorship ends, the user loses only the sponsored premium tools (unless another entitlement exists), keeps data and Free features, and is offered a personal upgrade. Handling overlapping paid subscriptions, proration and simultaneous club sponsorships remains **OPEN**.
- Clubs can request specific fitness metrics via a revocable, metric-scoped share grant. Medical records, insurance, ABHA and other highly sensitive fields are **never automatically shared**. A share grant is not an enrollment requirement.
- Teen club enrollment must respect guardian controls, privacy and regional restrictions. Club-sponsored Pro does not waive age gates.

## Coach/marketplace economics

- **15% commission per completed booking** is LOCKED. For illustration, if the commission base is ₹1,000, a 15% fee is ₹150; actual commission base (pre/post tax/discount), payment processor fees and whether commission is deducted from provider payment are OPEN.
- Provider onboarding, verification, refunds, disputes, payouts and country availability are OPEN; do not call the platform a licensed medical marketplace. Fitness trainers/coaches may be offered, but health/clinical provider workflows require separate identity and regulatory design.
- Original gym member fee transactions remain **outside ClubKeep**; the SaaS records them only. Marketplace payment routing is a **separate** business/technical ledger and product.

## Advertising isolation and youth entitlement

- Existing AdSense account covers the intended **web** model, not automatically native-app monetization.
- Advertising placement only on eligible **public/non-sensitive education, fitness-guide and discovery web/PWA pages**. Never render ad SDK or third-party tracking in logged-in medical, wearable, insurance, ABHA, condition, or clinician routes.
- Do not use biometric data, conditions, visits, device import, inferred health profile, ABHA, insurance or medical context for ad selection. Even public health-related content may trigger sensitive-content ad policy restrictions and should be reviewed before enabling ad inventory.
- Teen profiles receive **no authenticated product ads**, and no personalized tracking or social discovery by default. Implement appropriate age/guardian gating for the user's region.
- Business tier sponsorship and Personal subscription plan never override legal/clinical restrictions.

## Not decided, by design

Exact monthly Free club quotas, 1 staff owner counting, Growth/Pro sponsored seat quantities, Premium-exclusive non-AI benefits, premium wearable vendor list, offline conflict policy, full-storage abuse policy, AI request retry/refund, payment region/currency taxes, annual rounding, App Store/Play billing crossgrades, and family permissions remain **OPEN**. Do not silently invent values in implementation.
