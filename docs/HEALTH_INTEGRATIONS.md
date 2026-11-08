# ClubKeep health, wearable, AI and ABHA integration plan

**Status:** implementation design (recommended), constrained by owner-approved [BUSINESS_SPEC.md](BUSINESS_SPEC.md), 9 Nov 2026. Nothing here claims a provider partnership, deployed API or regulatory approval. See [ENTITLEMENTS.md](ENTITLEMENTS.md) for tier constraints.

## Boundaries and architecture

Build **one global identity**, but three independently protected data domains:

1. **Club tenancy** — club members, subscriptions, attendance, gym payment records, leaderboards, staff RBAC and branded club data. Every club record is `clubId` scoped.
2. **Personal health** — user-owned measurements/observations, workouts, sleep, nutrition, medications, medical documents, insurance policy entries, ABHA link consent and user-created care plans. Never treat `clubId` as an authorization path into this domain.
3. **Consent and integrations** — direct wearable provider tokens, platform read/write permissions, user-to-club metric share grants, external AI permissions, ABDM exchange consent artifacts, audit and synchronization state.

Recommended logical interfaces: `HealthObservation`, `ObservationSource`, `HealthDocument`, `MedicationEntry`, `InsurancePolicyRecord`, `UserCarePlan`, `UserAppointment`, `ConnectorAccount`, `SyncCursor`, `ConsentGrant`, `DataSharingGrant`, `AbhaLink`, `BillingEntitlement`, `SponsoredSeatAssignment`, `AiUsageLedger`, `AuditEvent`.

Do **not** immediately implement these as database tables without reviewing privacy threat model, medical semantics, schema migrations and intended minimum collection. Consider FHIR R4 interoperability for appropriate medical records and UCUM units / coding vocabularies. Keep original file and structured draft distinct and provenance immutable.

## 1. Platform health integration

### Apple Health / HealthKit (native iOS)

- HealthKit is accessed from an authorized native iOS application component, not arbitrary browser/PWA JavaScript. A native bridge/companion should securely synchronize the approved data types to ClubKeep.
- Users approve categories with system permissions. Read only what the feature needs. Import historical data only to the extent actually available and authorized; store per-record provider origin, unit, timestamps, timezone, device, deduplication key and deletion/tombstone logic.
- Write back only **ClubKeep user-created workouts/activity**, where explicit permission exists. Do not write spoofed clinical measurements or alter imported records.
- Apple HealthKit rules prohibit using its data for advertising or marketing and impose express consent and recipient-purpose limits on third-party disclosure. Ads may exist elsewhere in a compliant app but never depend on HealthKit data.
- iOS background reads/availability, user revocation and platform review must be tested on real devices.

### Android Health Connect (native Android)

- Use official Health Connect SDK for authorized read/write. PWA alone cannot stand in for native Health Connect permissions.
- Baseline record lookback is generally limited to 30 days before initial grant; use `PERMISSION_READ_HEALTH_DATA_HISTORY` and platform feature checks for permitted extended history. Access is limited by Android version, OS/SDK functionality and each user's actual grants.
- Write back only user-created ClubKeep activity/workouts with source identity and loop prevention; never falsely present imported data as ClubKeep generated.
- Respect Google Play's Health Connect Limited Use; do not use or disclose health data for advertising, creditworthiness, insurance eligibility or other prohibited purposes. Health-data-dependent medical-device features need applicable clearance and express consent.
- Users must be able to revoke Health Connect permissions and manage/delete ClubKeep's retained copies according to law.

### Shared adapter and sync design

- Implement contract `discoverCapabilities() / authorize() / listPermissionStatus() / importBackfill() / incrementalSync() / writeUserActivity() / disconnect()`. A provider can be read-only even if the common interface supports writes.
- Use queued per-user/per-provider jobs, encrypted credentials, refresh/retry with bounded backoff, pagination, rate-limit handling, source priorities, cursor checkpointing, deterministic deduplication and explicit tombstones.
- Maintain a **source-of-truth hierarchy**: user-verified medical record values > imported clinical originals with provenance > activity provider readings > self-entered health metrics, without automatically overwriting conflicting observations. Show conflicts.
- Cloud encrypted at rest and in transit; local encrypted cache for offline mobile, write queue with idempotency keys, conflict review, device sign-out and remote revoke. Avoid sensitive details in push content, crash reports, logs or analytics.
- For historical imports Free retains **all permitted** raw data and ongoing basic access; Pro extended-history analysis does **not** gate the underlying records.

## 2. Direct wearables — progressive, not an exhaustive first-day claim

Owner-selected approach is **integrate every commercially available provider progressively**, based on reachable APIs, licensing, customer demand, data quality and long-term maintenance. No fixed short list is locked.

Suggested evaluation candidates (examples, **not approved release commitments**): Garmin, Fitbit, Oura, WHOOP, Polar, COROS, Zepp/Amazfit, Samsung Health, Xiaomi, Withings, Ultrahuman and connected BP/glucose device vendors.

Provider checklist:

| Criterion | Requirement |
| --- | --- |
| API access | Published API/SDK/OAuth and actual approval; no scraping or credential sharing |
| Data quality | Units, sample granularity, provenance, timestamp offsets, update/deletion semantics |
| Health permissions | Visible source-specific user grants; withdrawal honored |
| Backfill | Import actual supported history; avoid promising unsupported years |
| Pricing | Vendor licensing/API cost; define which advanced capabilities are Pro |
| Reliability | Retry budget, monitoring, reconciliation and duplicates when wearable also syncs to HealthKit/Health Connect |
| Medical devices | Separate health/medical compliance validation; do not claim clinical grade based solely on sensor output |

Initial engineering delivers the connector framework **plus** platform integrations and reachable direct vendors, even though the catalog expands progressively. Platform-owned imports and baseline permitted vendor imports remain free. Enhanced/commercially restricted connector features may be Pro, with exact mapping **OPEN**.

## 3. Medical document import, insurance and FHIR

### Personal medical record ingestion

1. Upload private PDF/image or manually enter observations, medications and document metadata.
2. Malware scan, verify actual content type and size, encrypt, then store in **private** non-public object storage with least-privilege temporary access.
3. Run OCR/extraction and generate a **draft**: document type, dates, tests, units, observations, medical context and confidence. Preserve source file and field provenance.
4. Show side-by-side source and extracted draft to the user; **require confirmation or corrections** before promoting fields to authoritative Personal history. Never infer diagnoses as fact.
5. Support FHIR-compatible import/export only after validation and stable coding/mapping; start with resources such as Observation, DiagnosticReport, DocumentReference, MedicationStatement and CarePlan as appropriate.
6. Track user correction history and audit. Export/delete per law and provider contracts; encrypted backups need specified retention/deletion processes.

### Insurance details (additional owner scope)

- Allow user-controlled records: provider name, policy/member identifier, beneficiaries (subject to dependent/guardian authority), cover period, plan type, support contacts, uploaded card/schedule/policy PDFs, renewal reminder, optional coverage notes and claims documents (after separate approval).
- Encrypt and mask identifiers; no policy lookup via ABHA by assumption. No use of imported health/Health Connect data to determine eligibility, premiums, underwriting, financing, ad targeting or insurer risk scoring.
- Claims, eligibility status, payer integration and insurer-side payouts are **separate future connectors** with agreements, consent and specific user authorization. NHCX is a distinct claims-exchange pathway, not a default ABHA health-record feed.

## 4. India ABHA / ABDM path

**Approved scope:** user can voluntarily link ABHA identity and, when permitted by ABDM onboarding and patient consent, synchronize relevant health records.

### Phased approach

1. **Readiness:** review ABDM/NHA official developer enrollment, partner eligibility, sandbox and current API version; distinguish ABHA number, ABHA address, health-information user/provider and personal health record application roles. Never store Aadhaar credentials or assume ABHA is account authentication.
2. **Opt-in identity linking:** explicit user action, official ABHA verification/registration where authorized, region-gated India availability, clear separate ClubKeep and ABDM permissions. Minors/guardians subject to current ABDM rules.
3. **Health information exchange:** if approved for applicable role (e.g., HIU), request records from participating HIP through ABDM HIE-CM consent workflow. Honor scope, purpose, expiry and revocation of every consent artefact. Do not fetch data from merely knowing an ABHA number.
4. **FHIR validation:** parse ABDM-supported FHIR profiles, retain provenance/consent metadata and record data categories. Offer correction/verification for non-clinically validated imports.
5. **Go-live:** sandbox tests, security review, certification/production credentials where mandated, NHA partner terms, consent traceability and regional incident runbooks. No marketing claim of *live ABHA sync* before it actually works.

**Separation from insurance:** ABHA relates to digital-health identity and consented health-record exchange. NHCX / insurers / TPAs concern insurance policy and claim processes; any insurance verification/claims connection is an additional independently gated product integration.

**Verification sources:**
- NHA/ABDM overview: https://abdm.gov.in/
- ABDM FHIR implementation guide: https://www.nrces.in/ndhm/fhir/r4/
- ABDM HIU consent workflow (developer reference): https://abdm-docs.dev.eka.care/docs/hiecm/v3/milestones/m3
- NHA/IRDAI insurance/NHCX overview: https://www.pib.gov.in/PressReleasePage.aspx?PRID=1948522

## 5. Groq + NVIDIA NIM AI data plane

- Route each request only to an approved model whose data terms, geographic processing constraints and privacy status allow the requested task; consider quality, latency, cost and reliability. Maintain `provider`, `model`, `task`, `privacyClass`, `allowedRegions`, `tokenBudget` and immutable usage records.
- Owner-approved **explicit one-time consent per provider** before submitting identifiable medical data; visible scopes, versioned disclosure and a withdrawal interface. Purpose expansion may require renewed consent under law. No consent or provider failure = **no silent fallback containing sensitive data**.
- Default to de-identified aggregates/measurements for ordinary wellness explanations when feasible, and no raw PDFs in prompts unless specifically needed and authorized. Require vendor agreements/processing terms that fit health-data use; do not assume free model APIs imply permission to send medical data.
- Monthly request caps: 5 / 50 / 250 for Free / Pro / Premium. Usage ledger must be atomic and tenant-safe. Define whether failed/aborted/complex requests count and whether rollover exists (**OPEN**); don't invent tokens-based overages.
- Conversational coaching can offer educational lifestyle and fitness guidance. Medication modifications, diagnoses, emergency assessments and treatment decisions are **not** part of the wellness launch. Clinical decision support is separate and validated by jurisdiction.

## 6. Consent, teenagers, security and emergency boundaries

- Individually grant Personal metric shares to a named club for a defined purpose and duration; revoke any time; audit access. Club subscriptions and sponsored seats do not entitle staff to medical records.
- Respect local rules for teenage accounts and guardian consent; under Indian DPDP frameworks persons below 18 are children, subject to relevant provisions and commencement/exemptions. Age bands and allowed features differ by country; create a policy engine rather than one global switch.
- Default teenagers to private profiles, no public discovery, ads or data resale, restricted third-party AI and clinical features until fully reviewed, and no uncontrolled direct clinician messaging.
- No third-party ad pixels inside authenticated or health-related routes; public educational page ad eligibility is reviewed separately. No health-derived ad signals at all.
- Concerning readings may show **clearly qualified prompts** and advise professional follow-up. Never claim to monitor emergencies, diagnose, prescribe, or notify a clinician automatically.
- Security gates: encryption, least privilege, threat modeling, RBAC/ABAC, row ownership isolation, provenance, breach response, backups/restore, deletion/export, abuse limits, privacy review, and platform-specific consent revocation tests.

## 7. Outstanding work not authorized by this plan

Direct vendor order/contract terms, paid connector list, dependent proxy rights, insurance carrier sync, ABDM live credentials, clinician identity and messaging design (#22/#24 conflict), clinical clearance, AI request accounting, data-retention durations, and per-country release list are **OPEN**.
