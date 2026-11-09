# Phase 0C — Real Google Sign-In, passkeys and Mail-in-a-Box email links

**Status: implementation specification, not implemented.** Prepared 9 November 2026 after Phase 0B implementation PR #9 was merged into `main` (squash `d8b6395b2b42b353e38b97b734b537b011cbba97`). The user requested **planning**, so this document changes no runtime code, sends no email, creates no OAuth clients and applies no database migrations.

**Goal:** replace ClubKeep's holding page with a real, accessible and secure authentication experience for independently registered **Personal** users and future **Business** owners/members. One canonical Better Auth identity, one session system, passkey-first **return sign-in**, Google or verified-email **first registration** and recovery, zero SMS. Never let a club invite or a phone contact take over a Personal account.

See [Phase 0 foundation](PHASE_0_FOUNDATION.md), [Phase 0B model/migrations](PHASE_0B_IDENTITY_MIGRATIONS.md), [0B runbook](PHASE_0B_RUNBOOK.md), [bare-metal deployment](BAREMETAL_DEPLOYMENT.md), [business decisions](BUSINESS_SPEC.md), and [design system](DESIGN.md).

## 1. Verified repository baseline and version gates

As of merge #9:
- `better-auth@1.7.18` appears in the current lockfile, with Better Auth core in `src/lib/auth.ts`. `emailAndPassword.enabled=true` and `autoSignIn=true` remain; social providers and magic-link/passkey plugins **are not configured**.
- The Next.js adapter already exposes `src/app/api/auth/[...all]/route.ts`, and `src/lib/auth-client.ts` currently contains only the core client.
- `User.email` is **required and unique**, `Account` has unique `(providerId, accountId)`, and `Passkey` storage has been migrated in code but **not on the production VPS**. PersonalProfile is independent of ClubMembership.
- `src/lib/server-env.ts` validates optional Google credentials, passkey origin/RP ID and the selected SMTP host but does not initialize them. `EMAIL_PROVIDER=smtp` activates optional validation, and the existing `NEXT_PUBLIC_APP_URL || "http://localhost:3000"` fallback is not acceptable in production.
- `src/app/page.tsx` is an honest **non-authentication holding page**; the Luxe design files exist but user-facing authentication UX has not been built.
- Hosted x64/ARM64 CI and native PostgreSQL 17 migration/legacy fixtures are in place. **No independent ClubKeep production database, host service or live public hostname has been provisioned.**
- `@better-auth/passkey` is **not currently installed**. npm lists `@better-auth/passkey@1.7.18` matching the existing Better Auth runtime version. Pin both to identical exact versions in the implementation PR, evaluate security advisories, and compare the plugin's *generated* Prisma schema to 0B before enabling it. Do not use `@latest`, Beta documentation, `auth migrate` or a floating plugin version against Prisma-managed tables.
- Better Auth 1.7.18 supports Google OAuth, magic-link plugin and `@better-auth/passkey`. API shapes in official documentation can evolve: compile/test against the installed exact version, not remembered examples.

### Decisions LOCKED for the 0C implementation

1. **No SMS, no phone OTP, no phone-first account creation or recovery.** Do not request the Google People API phone-number scope for login. `User.phoneNumber` is deprecated/unverified; `ClubContact.phoneE164` is nonunique and never used for account matching.
2. **Google OAuth + email magic-link sign-up** for new accounts; **WebAuthn passkeys after a successful verified Google/email session** for returning login. Phase 0B's required `User.email` means **anonymous passkey-only signup is deferred** and must not use synthetic "verified" addresses.
3. **Keep legacy email/password sign-in** for existing accounts. Do not silently remove or lock out existing credential users; stop public unverified-password auto-sign-up unless separately verified, with a grandfathering plan for unverified legacy email accounts.
4. **Disable implicit OAuth account linking**. Same-email Google and existing password/magic-link accounts require the person to authenticate the existing account and explicitly invoke `linkSocial` after step-up, rather than silently merge profiles. This can produce an `account_not_linked` error; provide understandable recovery UI. Future mobile native Google client IDs need a separate verified security review.
5. **Mail-in-a-Box only:** `mx.bababuilds.com` authenticated SMTP on **587 with mandatory STARTTLS**, using a dedicated owner-provided full mailbox username, password and authorized sender. No third-party delivery service, no leaking secrets to GitHub. TLS 1.3/certificate connectivity was **verified in the user's 9 November VPS audit**, but SMTP credentials and end-to-end delivery have **not** been tested.
6. **Magic links:** server-issued high-entropy, **hashed at rest**, **single-use**, **short expiry** (propose 5 minutes per Better Auth default). A magic link proves mailbox access, never phone control or club membership. Seven-day **club invites are entirely separate tokens with separate verification rules**.
7. **Preserve native host isolation:** No Docker, no application release on MenuMinute's production VPS during development, and no ClubKeep production migrations until separately approved. Use disposable PostgreSQL 17/Redis in GitHub CI.
8. **No clinician accounts, medical information, ABHA, insurance records or clinical history in 0C.** No ad/analytics trackers on authentication or recovery pages. Age/region restricted features remain default-denied until their own approved gates exist.

## 2. Identity journeys and UX contracts

### A. New standalone Personal user — Continue with Google

```text
Welcome / Sign in
  -> Continue with Google (real OAuth code flow)
  -> Google callback verifies state/nonce/PKCE and provider identity
  -> Google email must be trustworthy/verified
  -> Better Auth get-or-create User and Account(provider=google, accountId=Google sub)
  -> Idempotent create PersonalProfile(userId) (no clubId, no medical fields)
  -> Verified server session -> Choose Personal (default) / create a club later
  -> Offer "Protect your account with a passkey"
```

- Configure Google `openid email profile` only. Do not request phone, contacts, Drive, Gmail, offline access or refresh-token permissions unless a later user-directed integration needs them.
- Set `BETTER_AUTH_URL` to the *exact selected public HTTPS ClubKeep origin*; Google authorized callback is `https://<clubkeep-host>/api/auth/callback/google`. The real hostname is **OPEN** until the owner chooses it. Do not guess it from MenuMinute's hostname or put MenuMinute OAuth credentials in ClubKeep.
- Use provider `sub` via `Account(providerId="google", accountId=<sub>)` as the stable identity anchor; **not a mobile number, mutable name, profile picture or Google email alone**. Enforce verified email claims or an independent verification flow before a full session.
- Store only necessary profile fields (subject, email, verified status, user-selected name/photo where consented). Protect access/refresh/ID tokens, redact OAuth logs, avoid unneeded offline tokens.
- **Explicit linking only.** With `account.accountLinking.disableImplicitLinking: true` where supported by pinned runtime, new Google identities may sign up normally, but if a preexisting email account matches, return a safe `account_not_linked` path: sign in via verified email link or legacy password, then step up and explicitly link Google. No auto-merge based on email even when verified. Test both Google-to-existing-email and email-to-existing-Google directions.
- Invalid state, callback, audience, nonce, `sub`, unverified email, revoked user and reused callback are failures without a session or stray unclaimed User.
- After first successful login, `PersonalProfile` creation must be **idempotent** across concurrent callbacks; use a server-side `upsert` or proven hook/transaction and test unique `userId`. No invitation/membership auto-claim.

### B. New Personal user — Continue with email link

```text
Enter email -> generic "If the address is eligible, check your inbox"
    -> Rate-limit & issue single-use, hashed, 5-minute token
    -> Send via mx.bababuilds.com (authenticated STARTTLS)
    -> User explicitly confirms link (not an automated scanner visit)
    -> Better Auth verifies token, establishes/loads User + verified email
    -> Idempotent PersonalProfile, signed-in session, offer passkey
```

- Enable the Better Auth `magicLink` server plugin and `magicLinkClient`, with `sendMagicLink`, `expiresIn=300`, `storeToken="hashed"`, validated internal callback paths, and a **reviewed sign-up policy**. `disableSignUp: false` is appropriate for approved user registration; keep automatic signup disabled for restricted cohorts until age/region gates are enforced.
- Better Auth's documented plugin uses the shared `Verification` table rather than requiring an invented magic-link table. Validate this against the pinned version; add a Prisma migration **only if** an actual plugin schema comparison proves necessary. Keep verification in durable PostgreSQL initially; if using Redis secondary verification, atomic `GETDEL` is required.
- **Email-link scanner defense:** Prefer a first-party `/auth/confirm` landing page that does **not consume** the token on a GET or email preview. User explicitly chooses **Continue**, then the client calls Better Auth's verified manual confirmation API. Token must be scrubbed from browser URL/history before telemetry and must not appear in referrers, logs, analytics, screenshots or cache; if an URL fragment/manual verify approach cannot be safely implemented in the pinned version, document an equally secure confirm-first alternative rather than sending auto-consuming links.
- Five minutes is a recommended initial expiry for magic links, not the club invite's seven days. Expired, already-used, tampered or unknown tokens show the same safe recovery UI; a resend issues a new token and respects cooldown.
- Sending must not reveal whether an address has an account. All entry points use generic responses, per-IP and keyed per-address abuse counters, bounded requests, and safe handling for unavailable SMTP. Do not fire-and-forget an untracked `void sendMail` promise. A low-volume direct SMTP implementation may await a bounded send while returning a normalized response; if anti-enumeration timing/delivery guarantees cannot be met, use a durable outbox and isolated worker, **not** an unreliable in-memory timer.
- Log mail delivery status by opaque request ID and error category only, never recipient plaintext, subject that reveals sensitive data, body, token, password or SMTP transcript. Avoid sensitive health/club membership details in email templates.
- For a user whose email is previously unverified, **verify security semantics** in installed Better Auth: current documentation says magic-link verification can revoke sessions and remove a legacy password. This is potentially disruptive. Include dedicated legacy-account tests and an explicit UX notice before allowing that transition.

### C. Returning user — passkey sign-in

```text
Sign in -> Sign in with passkey
  -> WebAuthn assertion: RP ID, origin, signature, challenge, user verification
  -> Better Auth identifies existing User via registered credential ID
  -> Server-backed session -> Personal / authorized club selector
```

- Install `@better-auth/passkey@1.7.18` **exactly matched** to `better-auth@1.7.18`. Configure `passkey({rpID, rpName:"ClubKeep", origin, ...})` using explicit public HTTPS origin and trusted RP ID (localhost only for local dev). No wildcard RP ID or trusting client-supplied origins.
- Set `registration.requireSession=true` (default). A newly signed-in Google/email user may create a passkey via `authClient.passkey.addPasskey`, after a valid server-side session and a recent-authentication/step-up check when necessary.
- WebAuthn **user verification required** for high-sensitivity authentication when device support allows; exercise cross-platform authenticators as well as platform biometrics/PIN, and ensure non-supporting devices have Google/email fallback. Challenge must be cryptographically random, scoped to a session/ceremony, short-lived and consumed only once.
- Support one or more passkeys per User. Provide list, rename, add backup and revoke APIs through Better Auth plugin; require recent authentication before destructive/recovery-affecting actions. Prevent deleting the **last usable account factor** where no verified recovery email, linked Google identity or secondary passkey exists.
- One account can have many passkeys; **one credential ID (`Passkey.credentialID`) must never link to multiple Users** (already database-unique in 0B). Preserve counters and correctly handle authenticators with zero counters, authenticator loss, multiple devices, synced passkeys and replay.
- Offer a backup passkey or verified email recovery after first registration. Don't claim biometric samples are stored on ClubKeep servers: only WebAuthn **public keys** and credential metadata are persisted.
- If user loses all sign-in factors, do **not** let a club owner/staff reissue an invitation to take over their Personal account. A separately verified manual support recovery policy would be needed.
- Browser capability checks and explicit passkey controls are mandatory; a cancelled biometric prompt is a recoverable UI state, not a successful sign-in.

### D. Existing email/password users

- Preserve `emailAndPassword.enabled` and current credential hashing/adapter compatibility. Do not globally revoke accounts or require passkeys immediately.
- **Do not repeat the existing `autoSignIn=true` for unverified new-password signups** without implementing verified email gates; decide/implement sign-up gating and verified email flows in a narrowly scoped way. Preserve existing password sign-in while legacy unverified emails are audited and given a safe verification path.
- Password reset email uses the same owner SMTP, short-lived tokens, anti-enumeration and post-reset session revocation.
- When an email user chooses Google with an already-linked address, require explicit `linkSocial` from an authenticated and recently verified session. Duplicate provider ID constraint must reject a second user claiming the same Google subject.
- Default new-user offering should be Google/email link/passkey registration **after** identity; don't add a new phone OTP alternative.

### E. Returning from a club invite

- A seven-day `ClubInvite` generated by club staff is an **authorization to join a club**, not an authentication method. The schema exists in 0B, but **issue/revoke/claim and privileged approval remain in 0D**.
- 0C can preserve *only* a secure **opaque invite-intent handle** through OAuth/email-link navigation if needed for smooth future onboarding. Do not pass raw invite tokens through Google OAuth state, email metadata, logging or external redirect parameters. Require authenticated confirmation before consuming in 0D.
- After login show `Personal` access for independent users; show a club chooser **only for active ClubMemberships**. No implicit member record from a phone number or a received email link.
- Club staff may revoke a membership later but must never revoke global passkeys or the User account.

## 3. Required configuration and activation contract

Use explicit feature toggles in code, not guessing from env strings. A disabled method should be hidden, not falsely claim success. **A missing production secret/config must fail closed before that method is advertised.**

| Config | Required behavior |
| --- | --- |
| `DATABASE_URL` | ClubKeep-only PostgreSQL 17 database, never MenuMinute DB. Existing 0B migrations must be applied before enabling login. |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | App-unique high-entropy secret; public HTTPS base URL/origin with no localhost fallback in production. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Separate ClubKeep OAuth web application, authorized callback exactly `/api/auth/callback/google`; configure through operator's Google Cloud console, no real values in Git. |
| `PASSKEY_RP_ID`, `PASSKEY_EXPECTED_ORIGIN` | Exact controlled RP ID and HTTPS origin; localhost only for dev, no mismatch with reverse proxy. |
| `EMAIL_PROVIDER` | `smtp` only; Mail-in-a-Box selected by owner. |
| `SMTP_HOST`, `SMTP_PORT` | `mx.bababuilds.com`, `587` only initially. |
| `SMTP_SECURE`, `SMTP_REQUIRE_TLS` | `false`, `true` respectively: explicit STARTTLS upgrade, never fail open to cleartext. |
| `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | Owner-created full mailbox email, mailbox password, authorized sender. Store real values in protected ClubKeep environment only; never in CI secrets available to PRs. |
| `REDIS_URL` / separate `AUTH_RATE_LIMIT_REDIS_URL` | Dedicated non-evicting ClubKeep auth security domain on same host, **not MenuMinute's queue/cache**. Sensitive login/mail issuance must fail closed when shared counters unavailable. |
| `GOOGLE_AUTH_ENABLED`, `EMAIL_LINK_AUTH_ENABLED`, `PASSKEY_AUTH_ENABLED` | Proposed explicit rollout gates; require the complete provider config and verified schema before activation. Never enable in CI with production credentials. |
| `PASSKEY_RP_NAME` | `ClubKeep` unless UX-approved branding changes. |
| `CLUBKEEP_AUTH_TRUSTED_ORIGINS` | Exact allowlisted origins; never unbounded `*.bababuilds.com` or wildcard trusted callbacks. |

**SMTP transport:** use an audited/pinned Nodemailer version (and TS types) with `host: "mx.bababuilds.com"`, `port:587`, `secure:false`, `requireTLS:true`, `tls.servername:"mx.bababuilds.com"`, default CA verification (`rejectUnauthorized` **never false**), authentication, max connections/message concurrency and explicit connection/socket timeouts. Reject a server that does not advertise STARTTLS or presents a wrong/expired certificate.

**Mail-in-a-Box operations:** use a dedicated ClubKeep sender mailbox (address OPEN, don't invent `no-reply@...`), confirm DNS SPF/DKIM/DMARC and MX status from the Mail-in-a-Box panel, perform a controlled owner-approved test to major inbox providers after staging is provisioned. Document bounce, greylisting, suppression, mailbox compromise/rotation and real SMTP volume limits. The VPS TLS check established connectivity **only**, not successful authenticated delivery.

**Provisioning prerequisites:** no exact production hostname, live ClubKeep DB/role, isolated auth Redis port, Google OAuth credentials or dedicated SMTP mailbox/password have been provided yet. They must be configured **before live activation**, but absence does **not** block a mock-driven code PR or GitHub-hosted CI.

## 4. Endpoint, session and abuse-control policy

- Use the existing `/api/auth/[...all]` Better Auth handler; no parallel custom identity table, homegrown session JWT, unverified claims cache or duplicate user records.
- On every protected server page/API/server action call, validate the session from Better Auth server methods (with request headers), then check `User.id` ownership or active `ClubMembership(clubId,userId)` through Phase 0B helpers; **never rely solely on Next.js Proxy, client-side routing or a global `User.role`**.
- Prefer database-backed sessions with **no cookie session cache initially**, to guarantee timely revocations and consistent security. Default secure, `HttpOnly`, appropriately scoped `SameSite` cookies and CSRF/origin checks. Avoid sharing auth cookie domain/secret with MenuMinute.
- Protect session change, Google account linking, passkey deletion, email change and account recovery with recent-session/step-up checks. Support sign-out, list/revoke sessions and revoke-other-sessions; changes should not grant club membership.
- **Nginx + Cloudflare proxy:** external traffic only via the trusted Nginx vhost; verify actual forwarding rules and have proxy overwrite untrusted client headers. Configure Better Auth to use only a trusted source for IP abuse controls—default arbitrary `X-Forwarded-For` is unsafe.
- Use Better Auth's configurable per-path rate limiting plus a **distributed atomic** limiter for magic-link issuance and login sensitive endpoints. Connect it to a dedicated ClubKeep Redis auth-security domain, with distinct counters for trusted IP, keyed email digest, account/user, session and device where justified. If that backing store fails, sensitive new requests **fail closed**. Unit/integration-test concurrency and spoofed headers.
- Provisional tunables for implementation review: email request per account **3/15 min**, per trusted IP **10/15 min**, 30–60 sec resend cooldown, plus callback/replay/throttle limits. These are **proposals**, not final SLA or hard-coded irrevocable policies. Do not store raw email addresses, phone numbers or link tokens in Redis keys.
- Better Auth's magic-link verification is designed for atomic single-use consumption; verify actual pinned-version behavior. If secondary storage backs verification, ensure it implements atomic `getAndDelete`. Never `GET` then `DEL` in separate calls.
- Return safe error categories, not raw OAuth/SMTP exceptions, database connection strings or credential subjects. Structured logging with correlation IDs, counts/deliverability metrics and security-event types, no token or health data.
- Authenticated, invite-related and account-security pages: `Cache-Control: private, no-store` or equivalent Next.js dynamic handling, no advertising/analytics trackers, no telemetry containing referrer tokens or emails, no speculative prefetch of consuming links.
- Establish a conservative age/region policy before public signups; child/teen features, medical content and AI provider transfers are not unlocked by merely having an authenticated account.

## 5. Product UI / navigation specification (approved Luxe design)

**Use existing** `docs/DESIGN.md`, `src/app/design/luxe`, shadcn components, responsive mobile-first layout. Replace the current non-auth holding page only when real server session flows are wired and tested.

Recommended screens:
1. **Welcome/auth entry:** one clean two-line title; primary **Continue with Google**, secondary **Continue with email**, **Sign in with passkey** when supported, and a subtle legacy **Sign in with password** option for existing accounts. No phone or mock-success controls.
2. **Check your inbox:** masked address only when already legitimately entered by the current user, clear five-minute expiry and resend cooldown, editable email, same generic response for existing/nonexistent accounts.
3. **Confirm email sign-in:** safe manual confirmation button to avoid scanners, expired/used/error state and resend, not automatic GET verification.
4. **Secure your account:** post-login offer to register passkey; clear OS biometric/PIN explanation, recovery reminder, explicit skip and add backup affordances.
5. **Account security:** list/rename/remove passkeys with step-up, Google linked/unlinked state and explicit linking, verified email and fallback, active session list/revoke.
6. **Signed-in landing:** Personal profile and (only if active) club selector; account switcher displays authorized clubs without exposing others' records. 0D implements membership invitations later.
7. **Legacy sign-in/recovery:** password input only for existing account users; generic failed login, verified email recovery, Google collision path.
8. **Responsive error states:** user canceled WebAuthn, no authenticator, blocked third-party cookies, unsupported browser, offline, SMTP unavailable, invalid OAuth callback, invite not yet claimable, denied club access. Accessible labels, screen-reader messages and no spinner that never ends.

All CTAs must be real and their advertised actions must work. Do not present "account verified" based on a successful client animation, Google profile phone data or an unconsumed invite.

## 6. Implementation recommendation: one coherent PR with eight reviewable commits

| Commit | Implementation | Acceptance gate |
| --- | --- | --- |
| **C1 — Audit and packages** | Pin `better-auth@1.7.18`, compatible `@better-auth/passkey@1.7.18`, audited Nodemailer/types; reproduce plugin schema in temporary CI and compare with 0B `passkey` table. Add a **new** additive Prisma migration only if mismatch is proved, never rewrite 0B migrations. | `npm ci`, schema parity and ARM64 generation/build |
| **C2 — Strict auth config** | Explicit provider toggles, exact HTTPS URLs, trusted origins, cookie/session policy, fail-closed provider env validation and no production localhost fallbacks. | Missing/partial secrets and wrong origins rejected; inactive providers hidden |
| **C3 — Google OIDC** | Configure `socialProviders.google`, verified email, callback, explicit linking, collision UI, stable Google `sub` mapping, no phone scopes. | New/return Google flow, signed-out and same-email collision tests |
| **C4 — Mail-in-a-Box transport** | Implement SMTP adapter, TLS/STARTTLS enforcement, safe templates, delivery errors/timeout and Mail-in-a-Box operational instructions. | Fake SMTP server accepts valid auth+TLS; bad cert/no STARTTLS/wrong credentials fail; no external sends in CI |
| **C5 — Magic links** | Better Auth hashed 5-min single-use link, new-account signup + existing-account recovery, safe confirmation page, resend/expiry/anti-enumeration. | Replay/scanner/expired/bad-token/rate-limit/email-change tests |
| **C6 — Passkeys** | WebAuthn plugin, session-required enrollment, auth assertion, list/rename/revoke, backup/recovery and user-verification step-up. | Virtual WebAuthn authenticator E2E; origin/RP/challenge replay and lost-device tests |
| **C7 — App UX and identity ownership** | Luxe login/onboarding/security pages, idempotent PersonalProfile creation, protected server routes, authorized club selector and legacy password compatibility. | No simulated session, unauthorized 401/403, independent Personal access, no cross-club access |
| **C8 — Security, CI and release runbook** | Distributed atomic limiter, trusted edge/IP, privacy/log policy, E2E Google mock + local SMTP/WebAuthn, ARM64/x64 CI, staging checklist, operator setup/rollback docs. | Full green CI and controlled staging verification; no live deployment in PR |

Code should be **one PR with these eight individually reviewable commits** (split further if needed to avoid oversized unsafe changes). Do not merge solely because TypeScript builds: acceptance requires real protocol/browser tests with mocks plus a manual controlled staging test using actual provider credentials **after** the operator supplies them.

## 7. Threat-driven tests — mandatory release gate

| Scenario | Expected result |
| --- | --- |
| New Google verified user | One User + Google Account + PersonalProfile + valid session |
| Same Google subject on repeat | Same global User ID, not duplicate |
| Existing email account, Google email match | **No implicit linking**; deliberate authenticated `linkSocial` required |
| Unverified Google email | No privileged/full authenticated session without separate verification |
| Fake/expired/replayed OAuth state/nonce/code | Denied; no account collision or stray session |
| Google profile without phone | Normal signup succeeds |
| Google People phone value supplied unexpectedly | Ignored for verification and account linking |
| Email magic link new signup | Creates verified User only through real single-use confirmation |
| Email magic link for old password account | Existing user preserved; any invalidation of password/sessions explicitly tested and UX-disclosed |
| URL preview/security scanner requests link | Token not automatically consumed until human confirmation |
| Magic link expired/replayed/tampered | Denied with safe generic status |
| Email requested repeatedly from same IP/email | Atomic throttling and resend cooldown, no account existence disclosure |
| SMTP refuses STARTTLS / invalid TLS cert | Sending rejected; never fallback to cleartext |
| SMTP wrong password / offline / timeout | Safe bounded failure; no leaked credential/recipient |
| Passkey enrolled by authenticated User | Correct `userId`, public key only; no global phone verification |
| WebAuthn wrong RP/origin, invalid signature or stale challenge | Denied, no new session or credential |
| Two passkeys for one account | Both work; individual revoke works, account remains |
| Attempt to remove last usable factor | Block or require verified replacement/recovery |
| Lost device / no WebAuthn | Verified Google/email fallback and clear UI |
| Existing password account | Can still sign in; no silent forced re-registration |
| CSRF/header spoof or forwarded IP tampering | Denied/throttled based on trusted proxy configuration |
| Redis auth-security outage | Mail issuance/high-risk auth attempts fail closed |
| Cookie/session revoked | Immediate denial on protected server endpoints |
| Club A staff requests Club B/private Personal data | Denied server-side, irrespective of client-selected club ID |
| Club invite token used as global account recovery | Never accepted; no invite redemption implemented until 0D |
| Underage or regional restriction unresolved | Restricted features remain off |
| Real production secrets in CI or logs | **None**; fail secure scanning |
| x64+ARM64 builds, native PG17 migrations and auth E2E | All green before ready-to-merge |

**Important:** Chrome virtual-authenticator tests are not a substitute for real iOS Safari/Android Chrome passkeys. Plan manual device testing before production launch.

## 8. Infrastructure / operator setup (not performed by code PR)

These are **necessary before first live sign-in**, not prompts to run broad scripts on the live VPS today:

1. Choose and verify the **exact ClubKeep public HTTPS hostname**. Separate cookie scope, Google callback and passkey RP ID from MenuMinute. Record approved origin in protected deployment config.
2. In Google Cloud, configure one **ClubKeep-specific Web OAuth client**, consent-screen publication/testing mode, exact redirect to `https://<chosen-domain>/api/auth/callback/google`. Only the owner enters credentials in protected settings; no screenshots with secrets.
3. On `mx.bababuilds.com` Mail-in-a-Box, create/authorize a **dedicated ClubKeep mailbox**; store its email address/password only in ClubKeep's private protected server env. Review SPF/DKIM/DMARC and mailbox sending tests. No third-party SMTP.
4. Provision a **separate ClubKeep-only PostgreSQL 17 database/application/migrator roles** and run the merged 0B migrations only after independent backup and explicit authorization. Never modify MenuMinute schemas or restart its services. A clean DB requires running 0B migrations before any real login can work.
5. Reserve a **separate non-evicting ClubKeep Redis auth-security** instance/ACL and verify no cross-access to MenuMinute's `6381` queue or `6382` cache. Choose port only after a fresh service audit.
6. Create isolated non-root `clubkeep-web` systemd, separate release roots and Nginx TLS host during the **approved later deployment phase**. CI-only code is not a deployment.
7. Perform protected staging Google redirect, owner mailbox deliverability, WebAuthn browser tests, DB backups and restore drill. Confirm MenuMinute's web/worker/DB/Redis latency and services remain healthy.

**Unknowns not to invent:** hostname; Google Cloud project/secret; SMTP sender mailbox and password; whether a production ClubKeep database exists; age/region signup gate; production Redis port and resource caps; selected staging release date.

## 9. Definition of Done and 0D handoff

0C is complete as a **code capability** only when:
- real Google and verified email-based signup and returning authentication work in protected staging;
- WebAuthn signup-to-passkey enrollment and return login work on supported browsers with fallback recovery;
- five-minute single-use hashed email links are actually delivered through **the owner's** authenticated STARTTLS SMTP, with normalized errors and abuse limits;
- legacy password accounts retain access, one global identity is maintained across Personal and any existing clubs, and all server reads are properly scoped;
- session revocation, explicit account linking, verified email state and passkey management pass security tests;
- all three GitHub-hosted CI classes remain green: x64 quality/native services, ARM64 Next.js build and PostgreSQL 17 migrations, plus new auth E2E;
- no fake success, SMS, Google phone import, auto-claim invite, medical record, clinician account or production secret is introduced.

**0D handoff:** actual `ClubInvite` creation/QR issuance, seven-day expiry, HMAC token generation/rotation, authenticated atomic claim, owner review/revoke/reissue, staff role step-up, membership status and club picker, club-scoped permissions. 0C must not preemptively interpret a pending invite as a confirmed club account.

## 10. Documentation and pinned references

- Better Auth Google: https://better-auth.com/docs/authentication/google
- Better Auth OAuth and account linking: https://better-auth.com/docs/concepts/oauth
- Better Auth Users & Accounts / disable implicit linking: https://better-auth.com/docs/concepts/users-accounts
- Better Auth Passkey: https://better-auth.com/docs/plugins/passkey
- Better Auth Magic Link: https://better-auth.com/docs/plugins/magic-link
- Better Auth Rate Limits: https://better-auth.com/docs/concepts/rate-limit
- Better Auth Sessions: https://better-auth.com/docs/concepts/session-management
- Better Auth Cookies: https://better-auth.com/docs/concepts/cookies
- Nodemailer SMTP/requireTLS: https://nodemailer.com/smtp
- Mail-in-a-Box: https://mailinabox.email/

This plan is **not a claim** that live Google OAuth credentials, Mail-in-a-Box credentials, passkey authentication, native VPS services or a public ClubKeep login currently exist. Implementation requires a separate Phase 0C code PR with independently passing tests and operator-approved staging gates.
