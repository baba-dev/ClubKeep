# HM2 Identity 2.0 — sign-in, remembering and recovery

Status: feature branch; **do not enable password recovery in production until protected SMTP, Redis, migrations and end-to-end browser checks are verified.**

## What changes

- Replaces Luxe sign-in, confirmation, security and reset surfaces with Human Motion 2.0 (Playfair/Inter, semantic sage, cream and cocoa, light/dark).
- Preserves the existing Better Auth identity, email/password login, Google OAuth, passkeys, magic links, explicit linking, invitations and all existing club/Personal authorization.
- Password sign-in passes Better Auth's native \`rememberMe\` boolean to create a persistent or browser-session cookie. Defaults to persistent as before; *unchecking* uses the nonpersistent cookie. Browser settings can restore session cookies, so this is not a security boundary.
- A **separate opt-in** checkbox remembers *only the normalized email address* in first-party browser localStorage under \`clubkeep:remembered-email\`. Never stores passwords, passkeys, authentication cookies, provider tokens or user IDs. Removing saved email clears it immediately. Private browsing/storage-denied still works.
- Better Auth session list, current-device marker, per-device revocation, revoke-all-other-sessions, credential change with other sessions revoked, and existing passkey/Google management appear at \`/account/security\`. No custom identity or token database.
- Password recovery is *independently gated* and uses the same approved Mail-in-a-Box authenticated TLS transport. Reset tokens are sent only in URL fragments, stripped from browser history, then posted to the pinned Better Auth API. 10-minute expiry, generic request response, email-keyed Redis limit, other sessions revoked on successful reset.

## Protected configuration (opt in)

Only when a dedicated ClubKeep mailbox, sender, trusted proxy and isolated security Redis are provisioned, set \`PASSWORD_RESET_AUTH_ENABLED=true\`. Required alongside it:

\`\`\`dotenv
PASSWORD_RESET_AUTH_ENABLED=true
EMAIL_PROVIDER=smtp
SMTP_HOST=mx.bababuilds.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=<protected ClubKeep mailbox>
SMTP_PASSWORD=<protected password>
EMAIL_FROM=<verified ClubKeep sender>
AUTH_RATE_LIMIT_REDIS_URL=redis://<dedicated ClubKeep security Redis>
AUTH_TRUSTED_IP_HEADER=x-clubkeep-client-ip
\`\`\`

The actual credentials are **never** placed in GitHub, test fixtures, logs or this document. Do not reuse MenuMinute's Redis. \`EMAIL_LINK_AUTH_ENABLED\` can remain false while password recovery is true. Until the flag is on, the new reset API is denied server-side and the UI does not show a link. No Prisma migration, new dependency or legacy password conversion.

## Regression / operator verification

1. Password-only deployment: existing admin and member sign-in unchanged; new email-only registration still disabled; ClubKeep mutation limiter remains operational.
2. Remember me checked vs unchecked: inspect cookie persistence and verify browser-close behavior; test Chrome, Firefox and Android Chrome. Clear saved-email checkbox; reload and verify no remembered account; no passwords in storage.
3. Google login/link callback, password collision, verified magic link and passkey sign-in survive unchanged. Check pending \`/join\` invite redirect.
4. Reset request for known/unknown email returns the same user-visible acknowledgement; verify Redis request limits, SMTP with STARTTLS, link expiry, token replay, and scanner GET not consuming tokens. A valid reset invalidates other sessions. Do not use production accounts for tests.
5. In Account Security, verify current-device marker, revoke one remote device, revoke all other devices, password change requiring old password, session expiry and backup-passkey removal protection.
6. Visual checks at 360/390/768/1440px, both themes, keyboard focus, 200% zoom, reduced motion and screen reader.
7. x64 lint / typecheck / unit test / production build; ARM64 build and PostgreSQL 17 compatibility in CI.

## Rollback

Disable \`PASSWORD_RESET_AUTH_ENABLED\` and redeploy the previous reviewed release if recovery misbehaves. This prevents new resets without altering existing sessions. Auth credentials, PostgreSQL data and existing email/password accounts are never migrated for this feature. If already sent, unused reset links cannot be redeemed while the flag is off.
