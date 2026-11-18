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

1. Confirm a passing release and that the `20261111000000_platform_admin_bootstrap` migration was applied; confirm the independent ClubKeep database backup. No application restart is necessary after creating the user.
2. **Where the script lives.** A lean release ([LEAN_RELEASES_V2.md](LEAN_RELEASES_V2.md)) has no root `prisma/` or `node_modules/`. The script ships in the isolated migration kit at `/var/www/clubkeep/current/migrate/prisma/bootstrap-platform-admin.mjs`, next to the `pg` and `better-auth` packages it imports (`migrate/node_modules/`). Run it from `migrate/`, **never** from the release root: `current/prisma/...` does not exist, and a checkout without `node_modules` cannot resolve those imports. The kit builder (`infra/deploy/build-migration-kit.mjs`) and `verify-lean-release.mjs` now require all of these, and CI runs the bootstrap from a freshly built kit. This needs **no operator re-install of `clubkeep-release.sh`**: the helper already allows every member under `./migrate/`.
3. **Releases built before this change lack `pg`/`better-auth` in the kit.** The preflight below fails for them; deploy a release that includes this change through the normal pipeline first. Do not `npm install` on the VPS or copy packages in by hand.
4. Enter a **protected root shell** on the ClubKeep VPS. Load only the ClubKeep-specific production environment; do not display its values or paste them into tickets/PRs. If the environment file is not shell-compatible, load `DATABASE_URL` through your normal protected operator mechanism rather than sourcing it.
5. Use a silent password prompt. This avoids password exposure in command history, arguments, GitHub Actions, and stdout.

```bash
sudo -i
cd /var/www/clubkeep/current/migrate
# Preflight: the kit must contain the script and both runtime dependencies.
test -f prisma/bootstrap-platform-admin.mjs &&
  test -f node_modules/pg/package.json &&
  test -f node_modules/better-auth/package.json &&
  echo 'bootstrap kit present' || echo 'NOT PRESENT: deploy a newer release first'
```

Run the bootstrap with the **same Node that the release's manifest declares**. Format-3 releases are `node26` (`/opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin/node`); format-2 rollback releases are `node24` (`/opt/menuminute/node24/bin/node`). Check with `grep -E '"(format|runtime)"' ../release-manifest.json`.

```bash
set -a
source /etc/clubkeep/web.env
set +a
read -rsp 'ClubKeep admin password: ' CK_BOOTSTRAP_PASSWORD
printf '\n'
printf '%s\n' "$CK_BOOTSTRAP_PASSWORD" |
  env -u NODE_PATH /opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin/node \
    prisma/bootstrap-platform-admin.mjs \
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
