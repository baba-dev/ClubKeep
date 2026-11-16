# ClubKeep Lean Releases v2 — operator runbook

Status: proposed release format. Production activation requires a **manual host-helper upgrade**.

## Why

The original release included the full npm-ci node_modules directory (about 1.1 GiB per release on the November 2026 ARM64 VPS) alongside the 91 MiB Next.js standalone tree. The v2 artifact contains:

- RELEASE-SHA and release-manifest.json (format 2, source SHA, ARM64, Node 24, lock digest)
- .next/standalone with public/ and .next/static copied in
- migrate/ (Prisma schema, migrations, prisma.config.ts, and precisely the installed CLI dependency closure copied from the checked-in package-lock build)

There is **no** root node_modules and **no** npm install, Prisma generate, or build on the production VPS. The Prisma migration kit is not used by the web server. The application runs via the existing Node 24 systemd service. No changes to the ClubKeep DB schema, Redis, MenuMinute, ERP, Nginx or credentials are part of this migration.

## Build, validation and size measurement

GitHub Actions CI runs on Ubuntu ARM64 using npm ci, Prisma generate, typechecking and a Next.js production build. The packager assembles and verifies a v2 release, SHA-256 signs its archive, then extracts the **actual archive** to a new temp directory. CI launches the extracted standalone server and runs the extracted Prisma CLI (version/validate) without node_modules from the source tree.

The PostgreSQL 17 CI job independently builds the CLI kit from the same locked dependencies and applies real Prisma migrations on a fresh disposable PostgreSQL 17 database, repeats deployment and checks migration status.

Hard limits initially: **700 MiB unpacked**, **250 MiB compressed** (fail packaging). Preferred design targets: **450 MiB unpacked** and **180 MiB compressed**. The actual CI measurements supersede these estimates; lower budgets only after observing a successful baseline.

## First production cutover (manual and controlled)

1. Record current live SHA using readlink -f /var/www/clubkeep/current, disk free space, existing ClubKeep database backup status, and MenuMinute/ERP health. Confirm independent backup recovery and safe rollback path.
2. Ensure CLUBKEEP_AUTO_DEPLOY is off temporarily (when enabled). Merge only after all CI checks pass. **The merge does not install the host helper.**
3. Review infra/deploy/clubkeep-release.sh at the exact merged SHA. Install it manually as root in /usr/local/sbin/clubkeep-release with owner root:root and permissions 0750; do not allow the deployment account to replace it.
4. Test sudo /usr/local/sbin/clubkeep-release --capabilities. Expected: clubkeep-release-formats: 1,2. Verify the installed helper is genuine and matches the reviewed commit.
5. Manually dispatch Deploy ClubKeep VPS for the exact current main SHA. The workflow checks the helper capability over authenticated SSH **before uploading** the archive. If not installed, deployment fails without changing the active symlink or DB.
6. The helper checks the archive SHA-256, allowed members and release manifest, extracts as the unprivileged clubkeep user, verifies Prisma tooling, creates a ClubKeep-only PostgreSQL dump, applies migrations, switches the symlink and checks health.
7. Verify /auth/sign-in, /api/auth/capabilities, authenticated demo/admin membership flows, Prisma migration status, Redis, MenuMinute web/worker and root disk usage.
8. Test a code-only rollback to an existing legacy release **only if migrations are backward-compatible**. A DB schema rollback is never automatic.
9. Enable unattended deploy only after an approved rollback rehearsal and monitoring. Existing cleanup timer may retain both legacy and v2 SHA directories; do not delete historic working releases during the transition.

## Failure modes / operational guarantees

- Host helper missing new capability: GitHub deployment fails before upload.
- Artifact too large, missing CLI, wrong SHA, wrong architecture, invalid paths, or escaping archive symlinks/hardlinks: build or activation fails closed. The v2 helper checks symlink targets before extraction, allowing only links contained within the release.
- Migration failure: old code symlink remains active; review forward-only schema effects before retry.
- Failed web health: helper switches back to the prior code and restarts only ClubKeep. Forward-only database schema is not rolled back.
- Existing v1 archives and installed releases remain readable by the upgraded helper, allowing legacy-format deployment and rollback subject to the normal unique-SHA restrictions.
- The VPS must never fetch npm packages, rebuild Next.js, or depend on a GitHub runner cache during activation.
- The isolated migration kit includes the precise npm-ci dependency versions from the source lockfile. The kit is assembled by traversing required package dependency manifests from the installed tree and copying only those packages. CI's isolated Prisma checks must pass to demonstrate that none were omitted.
- Keep the existing backup retention, deployment lock and current+recent releases policy; no opportunistic deletion in the packaging PR.

## Repository implementation

- infra/deploy/measure-release.mjs — sizes and regression metrics
- infra/deploy/build-migration-kit.mjs — locked dependency closure staging
- infra/deploy/verify-lean-release.mjs — strict v2 manifest and path validator
- infra/deploy/package-release.sh — v2 tar.gz, SHA-256 and budgets
- infra/deploy/smoke-lean-release.sh — actual archive extraction and runtime smoke
- infra/deploy/clubkeep-release.sh — dual-format root-owned activation helper
- .github/workflows/ci.yml — ARM64 archive smoke + PostgreSQL 17 migration kit
- .github/workflows/deploy-vps.yml — helper capability preflight
- tests/unit/lean-release.test.mjs — adversarial manifest and file layout cases
