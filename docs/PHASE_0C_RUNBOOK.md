# Phase 0C — Auth release and verification runbook

**Status: code PR only.** ClubKeep's production account providers are **not**
activated simply by merging code to GitHub. No live production PostgreSQL
migration, SMTP account test, Google credential, Nginx restart, Redis
provisioning or service change occurs in this PR.

See the [full design](PHASE_0C_AUTHENTICATION_PLAN.md) and [0B database
runbook](PHASE_0B_RUNBOOK.md).

## 1. Immutable dependencies and schema

- `better-auth@1.7.18`, `@better-auth/passkey@1.7.18`,
  `nodemailer@10.4.0`, pinned in package-lock.
- Passkey plugin fields match the Phase 0B `passkey` table; no new migration
  should be run unless a reviewed diff shows a real compatibility gap.
- Current `User.email` is required; first onboarding uses Google or verified
  email link before passkey registration, **not passkey-only no-email signup**.
- The old credential password method stays available; new password signup
  remains disabled. Unverified legacy password users are denied magic-link
  issuance so verified email transition cannot silently revoke old sessions
  and passwords. Later explicit migration UX can revisit this limitation.

## 2. Exact operator choices (still OPEN)

Before live staging, the owner must supply, **without posting secrets to
GitHub, CI logs, chat or PR**:

1. Exact ClubKeep HTTPS public origin/hostname; certificates and canonical
   Nginx virtual host. No borrowing MenuMinute's hostname/cookies.
2. ClubKeep-specific Google OAuth web client ID/secret, configured in Google
   Cloud for `https://<chosen-clubkeep-host>/api/auth/callback/google`.
   Request `openid email profile` only, no phone/contact scopes.
3. A dedicated authorized ClubKeep mailbox on existing
   `mx.bababuilds.com`, with SMTP login password and `EMAIL_FROM`.
   Port **587**, secure=false, requireTLS=true, verify certificate hostname.
4. A separate ClubKeep PostgreSQL 17 database, application role and migration
   role. Apply the merged 0B SQL migrations after a dedicated backup and
   approved deploy window; **never** point at MenuMinute DB.
5. A dedicated loopback-only **non-evicting** ClubKeep auth Redis instance
   with independent ACL/password and port verified unused. Never reuse
   MenuMinute queue :6381 or cache :6382. Runtime rate limiting must fail
   closed if this store is down.
6. An Nginx config that overwrites
   `X-ClubKeep-Client-IP` to the verified client IP at the trusted edge;
   block direct public access to the ClubKeep loopback port. Do not accept
   arbitrary `X-Forwarded-For` or assume Cloudflare overwrites all headers.
7. Validate age/jurisdiction controls before opening signup publicly.

## 3. Suggested protected environment (placeholders ONLY)

```dotenv
NODE_ENV=production
BETTER_AUTH_URL=https://<clubkeep-host>
NEXT_PUBLIC_APP_URL=https://<clubkeep-host>
BETTER_AUTH_SECRET=<unique-long-cryptographic-secret>
DATABASE_URL=<clubkeep-only-postgresql-url>
AUTH_RATE_LIMIT_REDIS_URL=<dedicated-clubkeep-redis-url>
AUTH_TRUSTED_IP_HEADER=x-clubkeep-client-ip

GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=<dedicated-web-client>
GOOGLE_CLIENT_SECRET=<protected-secret>

EMAIL_LINK_AUTH_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=mx.bababuilds.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<dedicated-mailbox>
SMTP_PASSWORD=<protected-secret>
EMAIL_FROM=<authorized-mailbox>

PASSKEY_AUTH_ENABLED=true
PASSKEY_RP_ID=<verified-rp-domain>
PASSKEY_EXPECTED_ORIGIN=https://<clubkeep-host>
```

For partial staging, leave individual feature flags `false` and do not
advertise disabled methods. Real secrets belong only in separately protected
`/etc/clubkeep/web.env`; do not use GitHub PR secrets.

## 4. Safeguarded staged activation checks

- Confirm `prisma migrate status` on the **ClubKeep-only** database.
  Existing auth accounts must remain intact. Keep a backup/restore proof.
- Start/restart **ClubKeep only** using an independent systemd service behind
  its own HTTPS Nginx host; separately verify MenuMinute's worker/web health.
- Account linking through `/link-social` requires a server-verified session
  established within the last ten minutes. A stolen long-lived session cookie
  cannot silently attach a new Google identity.
- Test Google first login, same `sub` returning login, same-email collision
  yielding `account_not_linked`, and explicit Google linking from signed-in
  security panel. Never auto-merge or verify a phone number.
- Test sender mailbox authenticated SMTP STARTTLS/certificate and actual
  inbox delivery to a user-controlled test mailbox; inspect SPF/DKIM/DMARC.
  A mail TLS handshake test **does not** prove authentication or delivery.
- Browser confirmation keeps the token in the fragment until the user clicks,
  then POSTs it in the JSON request body to `/api/clubkeep/confirm-email`.
  This avoids placing one-time tokens in Nginx request URLs. The server
  validates exact `Origin` and Fetch Metadata because direct `auth.api`
  calls bypass Better Auth's handler-level CSRF checks. The standard
  `/api/auth/magic-link/verify` browser GET is blocked.
- Test 5-minute hashed magic link: GET page does not consume it; click confirms
  once; replay/expired/tampered fail, without exposing SMTP credentials,
  recipient emails or tokens in logs. Tokens live in URL fragments until the
  deliberate browser confirmation action.
- Test passkeys on desktop Chrome, Android Chrome and iOS Safari with real
  hardware/synced passkeys; test add, sign in, rename, backup, cancellation
  and deletion (recent session + last-factor guard).
- Verify one global user ID, idempotent PersonalProfile, club access only
  through active memberships and no club-owner access to independent Personal
  data.
- Verify session revocation after sign-out, no shared caches, CSRF/origin
  checks, private no-store responses, and rate-limit denial on Redis failure.
- Check any Nginx access-log format does not include auth magic-link query
  token or request bodies, and no third-party analytics on auth pages.
- Measure resource use on ARM64 VPS; stop rollout if existing services
  suffer latency, restart or memory pressure.

## 5. CI and honest limitations

Automated tests run on GitHub-hosted x64/ARM64, with disposable native
PostgreSQL/Redis. C8 includes direct unit tests for auth config, trusted
Google scopes/linking, Mail-in-a-Box TLS configuration, scan-safe confirmation
URL, passkey factor protection, legacy magic-link handling and Redis failure.
A concurrent integration test proves atomic Redis limit enforcement.

**Real Google OAuth, SMTP authenticated delivery and physical-device WebAuthn
require operator-controlled staging.** Do not mark live login verified solely
because mocked/unit tests and builds are green; no provider secrets belong
in pull-request workflows.

## 6. Phase 0D boundary

The existing ClubInvite model records token hashes, role and timestamps.
Actual 7-day single-use invite issue/revoke/claim, HMAC rotation, owner
approval and membership activation remain **Phase 0D**. Club invites never
recover an existing Personal account or prove phone ownership.
