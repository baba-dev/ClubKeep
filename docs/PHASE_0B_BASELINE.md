# Immutable core baseline for Prisma 7

`prisma/migrations/0_init_auth_core/migration.sql` represents **only**
the original pre-Phase-0B `User`, `Session`, `Account` and `Verification` models.
The exact source file is `prisma/baseline/auth-core.prisma`.

**Fresh disposable ClubKeep DB:** use `npx prisma migrate deploy` after
the full migration history is committed. Baseline runs first and identity
additions run second.

**Existing unversioned ClubKeep DB:** migration `0_init_auth_core` **must not**
recreate existing Better Auth tables. Before doing anything:

1. Inspect the *ClubKeep* DB schema, indexes, FK actions and `_prisma_migrations`;
   compare it to this baseline with a generated Prisma diff plus manual SQL review.
2. Back it up and restore a non-production fixture.
3. **Only if identical** and separately approved, execute
   `npx prisma migrate resolve --applied 0_init_auth_core` against the
   expressly chosen ClubKeep database using its migrator role.
4. Review the additive identity migration and only then
   `npx prisma migrate deploy`. Repeat status/health checks.

Never run these commands against MenuMinute's database. Do not force-resolve a
mismatched schema, reset a populated database, or alter existing session values.

The first baseline SQL is generated to match the original Prisma 7 schema;
CI will verify its result against the old schema and exercise an existing
populated fixture. The later identity migration is separate, reviewed SQL.
