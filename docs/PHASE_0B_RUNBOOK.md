# Phase 0B database installation, legacy baselining and recovery

**Status:** code and tests prepared in GitHub PR 0B. **No database
provisioning, migrations or restarts have been performed on the
MenuMinute/ClubKeep production VPS.** Production execution requires explicit
approval, independent backup and an isolated ClubKeep database identity.

Read [PHASE_0B_SCHEMA_COMPATIBILITY.md](PHASE_0B_SCHEMA_COMPATIBILITY.md),
[PHASE_0B_BASELINE.md](PHASE_0B_BASELINE.md),
[PHASE_0B_IDENTITY_MIGRATIONS.md](PHASE_0B_IDENTITY_MIGRATIONS.md), and
[BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md).

## What was committed

- `prisma/baseline/auth-core.prisma`: immutable pre-0B **four-table** model.
- `prisma/migrations/0_init_auth_core/migration.sql`: original four Better
  Auth tables only. The original global `User.phoneNumber` uniqueness is
  faithfully present in this **historical baseline**.
- `prisma/migrations/20261109000000_identity_foundation/migration.sql`:
  **transactional additive** identity/club/passkey/invite changes; drops the
  obsolete `User.phoneNumber` unique index while leaving the values untouched.
- `prisma/schema.prisma`: current final schema. Unique provider identity
  `(providerId, accountId)`, club membership `(clubId, userId)`,
  passkey credential ID and invite token hash. Optional unverified
  `ClubContact.phoneE164` deliberately nonunique.
- `src/lib/club-access.ts`: checked, default-deny access functions using
  **server-session user ID**, active club status and the per-club role.
  They do not replace per-resource `clubId` query scoping or real session
  verification when routes are implemented.

No actor registration, passkey plugin, invite issue/redeem routes, magic link
sending, Google OAuth, account-linking code or data ingestion is shipped.

## A. Disposable development / hosted CI — empty database

Use a **new ClubKeep-only** native PostgreSQL database/user, not the MenuMinute
DB or a privileged `postgres` application role. Check the database name
before running commands.

1. `npm ci`
2. Set `DATABASE_URL` to a **disposable** ClubKeep database; never paste a
   real production password into the terminal's command history.
3. `npm run db:validate` and `npm run db:generate`
4. `npm run db:deploy` (the existing 0_init_auth_core migration, then additive)
5. `npx prisma migrate status`
6. `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
7. Repeat `npm run db:deploy`; it must report no pending migrations.
8. Only on the disposable database: `npm run test:identity`.

On CI, a separate GitHub-hosted runner installs native **PostgreSQL 17** from
the official PGDG APT repository and tests this sequence. No Docker.

## B. Existing ClubKeep database without a history table — DO NOT BLINDLY DEPLOY

The actual ClubKeep database's existence and schema have **not** been
inspected. Existing MenuMinute data is completely out of scope.

1. Stop: confirm the exact selected database, application owner and DB roles.
   Obtain a separately verified independent `pg_dump` and a restore drill
   into a temporary database. Before any change, list
   `_prisma_migrations`, user/account/session/verification tables and row
   counts, foreign keys and indexes. **Do not reveal user emails, phone
   numbers, auth tokens or passwords in the audit report.**
2. With the **test-restore** database selected, compare the original schema
   to `prisma/baseline/auth-core.prisma` using
   `npx prisma migrate diff --from-config-datasource --to-schema prisma/baseline/auth-core.prisma --exit-code`.
   Prisma's diff excludes some unsupported DB features; also inspect actual
   defaults, indexes, constraints and FK delete behavior. If anything differs,
   do **not** mark the migration applied.
3. Preflight duplicate provider identities; if any are present, STOP and
   reconcile manually before additive migration:

   ```sql
   SELECT "providerId", "accountId", count(*)
   FROM "account"
   GROUP BY "providerId", "accountId"
   HAVING count(*) > 1;
   ```

   Do not disclose real `accountId` values in the PR or chat. Use count-only
   reporting in external summaries.
4. **On the isolated restored fixture only**, and only after confirming exact
   four-table baseline parity, mark historical SQL already applied:
   `npx prisma migrate resolve --applied 0_init_auth_core`.
5. `npm run db:deploy` now adds only the new 0B schema. Verify old User,
   Account, Session and Verification IDs and contents remain unchanged,
   then run status, schema diff and a read-only audit.
6. **Production rollout is separate**, with explicit approval, a deployment
   lock, separate ClubKeep app vs migrator DB roles, backup/restoration
   evidence, no cross-application restart and an authorized release window.

If `_prisma_migrations` exists, verify history and checksums before deciding.
Never overwrite or resolve a successful migration by filename without proof.

## C. Transaction and rollback safety

- The additive SQL is wrapped in `BEGIN ... COMMIT`. A duplicate OAuth
  provider identity triggers an early `RAISE EXCEPTION` and no new Club
  tables. PostgreSQL atomicity is exercised in a dedicated CI collision DB.
- Existing user IDs, password hashes, session values and old phone fields
  are **preserved**. The obsolete phone unique index is removed only in the
  additive migration; new unverified contacts are nonunique and not identity
  identifiers.
- Prisma has no automatic reverse migration. An application symlink rollback
  is only valid if the schema change is backwards-compatible; restoring DB
  backups is a **separate, reviewed operation**. Do not apply SQL DROP/RESET
  commands to improvise a rollback.
- The baseline migration is immutable once deployed anywhere. Further model
  adjustments require a new additive migration, not editing either committed
  migration. Lock and statement timeouts on the shared PostgreSQL daemon
  are chosen after measuring load; production configuration is out of 0B.

## D. Security and functional handoff

- Any request that selects a club must verify Better Auth session identity,
  query `ClubMembership` scoped by **both** `clubId` and `userId` and
  require status ACTIVE. Database reads/writes on other club tables must be
  scoped to the resolved authorized `clubId` **on the server**.
- Only one effective role per user per club currently; privileged invitation
  roles require owner approval/step-up when routes are implemented.
- `PersonalProfile` belongs only to its own global `userId`. A club owner,
  manager or sponsor never gets access to Personal records merely from role.
- `ClubInvite` stores unique **keyed token digest** and lifecycle timestamps;
  its **7-day expiration, transactional redemption, approval, revocation,
  URL token safety and HMAC key management are 0D behavior**, not guaranteed
  merely by creating a SQL table. Do not claim the invite is active yet.
- `Passkey` stores public keys and credential IDs only; no private keys.
  Install/enable a pinned compatible Better Auth passkey plugin only in 0C.
  The schema retains nonnullable `User.email`, so the conservative first
  onboarding path uses verified Google/email plus passkey registration.
- `User.role` and `User.phoneNumberVerified` are deprecated legacy fields
  and **must not** be used to authenticate, authorize, verify phones, recover
  accounts or link users.
- Future production DB setup must create a distinct `clubkeep` DB,
  `clubkeep_app` and limited `clubkeep_migrator` roles on existing
  PostgreSQL 17.11 and should separately isolate Redis auth state.
  Nothing in this PR touches the live MenuMinute VPS.

## E. Required review gates before the implementation PR merges

- Confirm baseline core schema parity (including lowercase table names).
- Run native PostgreSQL 17 **fresh**, **re-deploy**, **populated legacy** and
  **duplicate-OAuth collision** flows on GitHub Actions.
- Validate Prisma Client generation and full x64/ARM64 builds.
- Verify default-deny club role and Personal owner unit tests and actual
  Postgres foreign key / uniqueness / nonunique unverified-contact tests.
- Document and remediate any failing drift, formatting or dependency check.
- Ensure no clinical/medical/insurance data, new live auth flow, SMS,
  Mail-in-a-Box secret, production DB change or Docker is introduced.

The schema is a **prerequisite** for the complete Phase 0C/0D account,
invitation and recovery journeys, not a released signup feature.
