# ClubKeep demo and admin onboarding access

## What is live on the application

The `/demo` route is a **public, anonymous, entirely client-side fictional simulation** of all currently released B1–B6 Business modules, member self-service, staff receptions and platform directory moderation.

- No API POST or database writes; no shared credentials, cookies, hidden admin mode, tokens or real personal data.
- Role dropdown (Owner, Manager, Staff, Member, Platform Admin) changes the **view only**, never a production identity or authorization claim.
- Deep links: `/demo?role=owner&view=finance`, `/demo?role=member&view=leaderboard`, `/demo?role=admin&view=admin-directory`. AI/browser reviewers can capture desktop/tablet/mobile screenshots and click simulated controls.
- Restarting or refreshing resets fictional data; simulated receipt reversals and approval actions do not affect actual orders, ledger, or athletes. `noindex,nofollow` until the owner approves public marketing.
- This previews the workflow, **not** a substitute for authenticated end-to-end tests of the real application. No GPS/health/medical, payment processing or unimplemented features are implied.

## Root cause of production onboarding 503

The original `src/lib/auth-config.ts` built `authLimiter` **only when an optional provider** (Google, email magic link, passkey) was active. Protected production has all three disabled. Thus `guardOnboardingPost` returned **503 "Onboarding is unavailable"**, despite a valid existing password session.

The fix configures ClubKeep's rate limiter independently. If `AUTH_RATE_LIMIT_REDIS_URL` exists it takes precedence. **For password-only installs only**, `REDIS_URL` is an acceptable fallback *because it must already belong to ClubKeep's dedicated Redis instance*. Disabled providers remain disabled. Redis outage still denies mutations; no in-memory or no-limit fallback and no reuse of MenuMinute ports 6381/6382. Explicit OAuth/magic-link/passkey activation still requires separate `AUTH_RATE_LIMIT_REDIS_URL` and verified Nginx IP headers.

For operators with root access on the ClubKeep VPS, verify **only safe booleans, never print URLs, secrets, or passwords**:

```bash
sudo systemctl is-active clubkeep-redis clubkeep-web
sudo bash -c 'set -a; . /etc/clubkeep/web.env; set +a; if [[ -n "${AUTH_RATE_LIMIT_REDIS_URL:-}" || -n "${REDIS_URL:-}" ]]; then echo "ClubKeep security store: configured"; else echo "ClubKeep security store: MISSING"; fi'
```

If security store missing, configure `REDIS_URL` or `AUTH_RATE_LIMIT_REDIS_URL` for the **ClubKeep-owned** loopback-only non-evicting Redis (never MenuMinute Redis); restart **only** `clubkeep-web`. The fix requires a reviewed merge and guarded deployment first. Reattempt create-club from `/clubs/new`; it must return 201, then direct the verified creator (OWNER) to guided setup. Test API limits, Redis-down failure, user/club membership isolation and network availability. Do not make Redis optional in production.

## Why a platform admin cannot simply "view as any member"

`platformRole=PLATFORM_ADMIN` is a global moderation permission, **not** automatic ownership, finance access, membership, or the ability to approve your own sports scores. After real club creation your password-authenticated account gets **ClubMembership OWNER** in that club; the private MEMBER experience is intentionally a different linked club membership. The public synthetic tour allows exploration of both without relaxing those gates.

## Optional live-authenticated AI reviewer sandbox (separate instance)

For *real* route, API, permission, payment-record and score-verification testing, use a dedicated isolated deployment with:

- Separate public host `https://demo.<your-clubkeep-host>`, Better Auth origin and secret, dedicated PostgreSQL DB **`clubkeep_demo`**, ClubKeep-only non-evicting Redis, separate cookies/logs and separate service/ports. It may share a server only after capacity/isolation verification, not application DB or Redis keys with production.
- `CLUBKEEP_DEMO_SANDBOX=true` **only in an operator's protected seed shell**. Do not set this variable for the public production `clubkeep-web`.
- Copy of the migration set on this branch, applied to the **empty isolated demo database**. Never use `db push` on production.
- The offline script `prisma/seed-demo-sandbox.mjs`, which refuses all databases except `clubkeep_demo` or `clubkeep_demo_ci`, requires explicit `--expect-db`, validates `current_database()`, refuses non-demo production origins and any preexisting user/club, and generates unique hashed password credentials from protected stdin. No passwords, hashes, raw connection strings or bearer values are logged.
- Four verified fictional reviewer identities under `@demo.clubkeep.invalid`: **owner, member, manager, staff**. The two main reviewer identities are OWNER in different demo clubs and linked MEMBER in the other club so *both* can inspect full club operations and member experiences via the real `/home` club switcher. Reviewer owner has a platform admin role only in the sandbox; independent manager can approve scores that they did not submit. Every normal authorization check remains enabled.
- Fictional plans, attendance, external-payment receipts, roster membership, approvals, consent, leaderboard and challenges are seeded. The script performs one atomic transaction and rolls back on failure.
- Use distinct strong passwords via operator's hidden prompts (do not paste them into source/PR/GitHub logs/chat). The script accepts a single protected stdin JSON object with `owner`, `member`, `manager`, `staff` keys, each distinct 12–128 characters.

Protected example for a **separate demo sandbox database only** (Python `getpass` keeps passwords out of argv and environment, and only the private process pipe carries them):

```bash
# Load the isolated demo-only DATABASE_URL/BETTER_AUTH_URL securely first.
python3 -c 'import getpass,json,sys; roles=("owner","member","manager","staff"); secrets={role:getpass.getpass("Sandbox "+role+" password: ") for role in roles}; sys.stdout.write(json.dumps(secrets))' |
  CLUBKEEP_DEMO_SANDBOX=true /opt/menuminute/node24/bin/node prisma/seed-demo-sandbox.mjs --expect-db clubkeep_demo
```

**Never execute this against production.** Public visitors should use the safe `/demo` tour; AI reviewers need approved sandbox accounts and independently delivered credentials through a protected channel, not a public URL or GitHub.

## Release acceptance checklist

- [ ] Live operator verifies onboarding POST 201 from existing password-admin account under configured isolated security Redis.
- [ ] Redis outage and rate-limit test confirm fail closed and no MenuMinute collision.
- [ ] `/demo` serves without login, links through every module, no network calls or production writes, and reset works.
- [ ] Demo deep-link screenshots at 360/390px, tablet and desktop; keyboard labels, contrast and reduced motion.
- [ ] Separate real demo instance provisioned and seeded only after operator approval; two identities can browse OWNER and MEMBER clubs; independent manager reviews scores.
- [ ] Distinct DB backup/restore and isolated VPS workload smoke; do not claim production deployment from PR CI alone.
