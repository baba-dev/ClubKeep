# Phase 0D — Production club onboarding

**Status:** GitHub PR #15 implementation and synthetic tests; not approval to enable public enrollment. No live ClubKeep or MenuMinute service was touched by this PR.

## Delivered

- Create a club via authenticated verified account. The club, OWNER membership and CLUB_CREATED audit marker are committed in one PostgreSQL transaction.
- Existing global identity and PersonalProfile remain independent of clubs. An account may own/join several clubs, with a separate role in each. Club context is checked server-side for every operation; no global User.role authorization.
- OWNER/MANAGER may issue and revoke **MEMBER-only** invitations for their own active club. STAFF, MANAGER or OWNER elevation through a bearer token is blocked by design; privileged role management requires separate owner-reviewed flow.
- Invitation tokens: `crypto.randomBytes(32)`, base64url, seven-day lifetime, HMAC-SHA256 of token with versioned domain separation and the deployment's `BETTER_AUTH_SECRET`. Only `tokenHash` persists in PostgreSQL; raw token is emitted once to the authenticated issuer in a private no-store response. Rotating the auth secret intentionally invalidates pending invitations.
- The share URL uses `/join#invite=<token>` rather than a query/path; fragments never reach the Nginx request line. The client immediately removes the fragment, keeps the pending token in same-tab sessionStorage through sign-in, POSTs a bounded JSON body to preview and claim, and clears it on success. Cross-tab magic-link sign-in may require reopening the invite in its original tab.
- QR images are generated locally in the browser using a fixed version 7-L QR encoder; no third-party QR endpoint, analytics pixel, remote image or external request receives the raw bearer. Very long custom hosts exceed the fixed encoder capacity and fall back to the link.
- Claim is an atomic PostgreSQL conditional UPDATE (not expired/revoked/claimed; club ACTIVE), membership create or LEFT-to-ACTIVE readmission, and audit event inside the *same* transaction. A reused, suspended or already active membership does not consume a second invite. Owner revocation is restricted to MEMBER memberships, preserving the last active OWNER.
- CSRF requires exact configured Origin and compatible Fetch Metadata for all onboarding POSTs; Redis security throttles are fail closed. Token parsing, 4KiB body limit and all tenant IDs are validated. Public preview returns only club name, role and expiry, never membership directory or personal contact data.

## Platform and rollout gates

1. Keep the production `CLUBKEEP_AUTO_DEPLOY` setting and auth feature flags under operator control. This PR never changes Nginx, PostgreSQL roles, Redis, systemd or MenuMinute.
2. Verify the dedicated ClubKeep PostgreSQL 17 database and current 0B migrations. **No 0D schema migration is necessary.** Do not use `db push` or a shared MenuMinute database.
3. Provision and verify dedicated `AUTH_RATE_LIMIT_REDIS_URL` (ClubKeep-only non-evicting Redis), `AUTH_TRUSTED_IP_HEADER=x-clubkeep-client-ip` overwritten by the trusted Nginx edge, and one approved real auth method (Google or verified-email magic link). Without active isolated Redis security controls, onboarding operations return 503, not success.
4. Use the Phase 0C runbook to verify Google callback/linking, Mail-in-a-Box delivery, passkeys on physical devices, and fallback recovery. Legacy email/password access remains intact.
5. Validate identity, age/guardian and jurisdiction enrollment policy before public signup. There is no age-attestation bypass included in 0D. This PR is not authorization to open public registration.
6. Review the diff and all x64/ARM64/PG17 CI results, then run a staging end-to-end test on the deployed build. Test: verified owner creates a club, receives OWNER role, issues a link, opens/scans the QR on another browser/device, signs in with an independently verified account, claims exactly once, sees only that club, and can be revoked without deleting PersonalProfile. Repeat with a member of another club and suspended club; check that cross-tenant access is rejected.
7. Repeat simultaneous two-claimant redemption against the same token, expired and revoked tokens, replay, staff/manager privilege attempts, cross-site requests, absent Redis and duplicate membership. Confirm no raw tokens appear in access logs, errors, audit records or analytics. Confirm initial invitation cannot be recovered after leaving the issuing page.
8. Before go-live, complete verified off-host ClubKeep database backup restore, HTTPS/Cloudflare trusted-header inspection, deployment rollback drill and MenuMinute availability checks. Database schema rollbacks are never automatic.

## Automated verification

- `npm run test`: token generation/HMAC and offline QR unit tests, existing auth/tenant tests.
- `node --test tests/integration/onboarding-claim.test.mjs`: on a **disposable migrated PostgreSQL 17 database only**, two concurrent SQL clients race for the same invite; exactly one wins and only its membership persists. CI runs this in the isolated PG17 job.
- `npm run lint && npm run format:check && npm run typecheck && npm run build` on Node 24 with reviewed synthetic environment, then green ARM64 standalone build and database migration parity.

## Boundaries / next release

Phase 0D is **not** a billing, payment collection, member plan, attendance, clinical, wearable or AI implementation. Business B1 owns tenant quotas, membership plans, onboarding with contact hints, detailed role administration, and real free/paid seat enforcement. No unapproved Free usage limits or privileged bearer-link role grants are introduced here.

A forwarded invite grants the **first valid authenticated claimant** membership. Keep links private; the club can revoke a link or ordinary membership, but cannot reset or merge a Personal account.
