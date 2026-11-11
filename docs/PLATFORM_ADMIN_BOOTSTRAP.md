# ClubKeep platform administrator — one-time operator bootstrap

This is an **offline production maintenance operation**, not public registration and not a GitHub Action. **GitHub access cannot write a live PostgreSQL row.** Apply only after the merged migration has been deployed and independently backed up to the isolated `clubkeep` database. Never provision to MenuMinute.

## Identity and authorization boundary

- Account **display name**: operator-provided; this is not a unique username.
- Sign-in identifier: **email** and password at `/auth/sign-in` -> **Existing password**. Username sign-in is **not** implemented.
- `User.platformRole = PLATFORM_ADMIN` is a distinct, explicitly provisioned global role. Existing users default to `USER`.
- Legacy `User.role` remains `user`. Neither legacy `role` nor `ClubMembership.role` is a platform-admin permission.
- Creating a platform admin does **not** create club ownership, bypass club membership checks, or introduce an admin dashboard. Future platform-only routes must check the live `platformRole` server-side.
- The bootstrap marks `emailVerified = true` because it is a **trusted operator action**. Verify control of the intended mailbox before running.
- It rejects existing email accounts rather than resetting credentials or escalating an identity silently. It also refuses to create a second platform administrator. There is no destructive `upsert` path.

## VPS procedure (protected root shell)

1. Confirm a passing release and that the new `20261111000000_platform_admin_bootstrap` migration was applied; confirm the independent ClubKeep database backup. The application release must contain `prisma/bootstrap-platform-admin.mjs`. No application restart is necessary after creating the user.
2. Enter a **protected root shell** on the ClubKeep VPS. Load only the ClubKeep-specific production environment (shown below); do not display its values or paste them into tickets/PRs. If the environment file is not shell-compatible, load `DATABASE_URL` through your normal protected operator mechanism rather than sourcing it.
3. Use a silent password prompt. This avoids password exposure in command history, arguments, GitHub Actions, and stdout.

```bash
sudo -i
cd /var/www/clubkeep/current
set -a
source /etc/clubkeep/web.env
set +a
read -rsp 'ClubKeep admin password: ' CK_BOOTSTRAP_PASSWORD
printf '\n'
printf '%s\n' "$CK_BOOTSTRAP_PASSWORD" |
  /opt/menuminute/node24/bin/node prisma/bootstrap-platform-admin.mjs \
    --email admin@bababuilds.com --name bababhayanak --expect-db clubkeep
unset CK_BOOTSTRAP_PASSWORD DATABASE_URL
```

Check that the command reports **Created ClubKeep platform administrator**. It never prints the hash or password. Sign in at `https://clubkeep.bababuilds.com/auth/sign-in` using the email address. If the account already exists, the script refuses to change it: investigate rather than deleting/re-seeding it.

## Post-run verification

- Log in through the **Existing password** tab using the supplied email and the securely entered password.
- Verify that the Personal home loads, then enroll a passkey under Account Security if enabled.
- If club management is needed, create a club through onboarding; platform role alone does not bypass tenant membership.
- Replace any short or shared bootstrap password with a strong, unique secret as soon as the application supports an authenticated password-change flow. Do **not** store plaintext in a seed, release, GitHub secret, fixture, or chat-generated SQL.
- Keep application/Mail-in-a-Box environment files private and verify backups independently. Do not expose the PostgreSQL listener or add a public "create admin" endpoint.
