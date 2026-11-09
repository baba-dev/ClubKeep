# Phase 0B schema compatibility contract (pinned to Better Auth 1.7.18)

The original `prisma/schema.prisma` before Phase 0B is saved exactly as
`prisma/baseline/auth-core.prisma`. Its lowercase mapped `user`, `session`,
`account` and `verification` tables form the **immutable historical baseline**.
Never generate a baseline from the *new* post-0B schema.

- Better Auth runtime in `package-lock.json`: `better-auth@1.7.18`.
- Supported passkey plugin release: `@better-auth/passkey@1.7.18`.
  The package itself and runtime plugin activation belong to **Phase 0C**;
  Phase 0B only provides the matching `passkey` table and integration fixture.
- Passkey fields: `id`, `name?`, `publicKey`, `userId`,
  `credentialID`, `counter`, `deviceType`, `backedUp`,
  `transports?`, `createdAt?`, `aaguid?`.
  Credential IDs must be unique, with an index and foreign key on `userId`.
- Auth `User.email` remains **required and unique** for this migration:
  the conservative first 0C login is verified Google/email followed by passkey
  enrollment. Direct passkey-only enrollment without an email requires a separate
  approved Better Auth schema and challenge/recovery design. No fake verified
  emails, anonymous shadow identities, or phone-number account linking.
- Deprecated `User.role` is preserved for compatibility but ignored by
  club authorization. Deprecated `User.phoneNumber` values remain intact;
  its old unique index is removed in the additive migration. It is never used
  to authenticate or connect accounts. New club contact phone values are
  **optional and nonunique**.
- `Account(providerId, accountId)` should be globally unique within
  the provider pair; a pre-existing duplicate causes the additive migration
  to **fail without modifying those records**, pending manual resolution.
- Tables do not include insurance, medical history, diagnoses, prescriptions,
  ABHA, clinician accounts, AI, payment processing or SMS.

**Before implementing 0C:** compare the exact installed plugin's output from
the Better Auth CLI (pinned runtime version) to the Prisma model, and update the
model with a reviewed migration if any contract changed. Do not run `auth migrate`
against Prisma-managed databases.

References:
- https://better-auth.com/docs/plugins/passkey
- https://better-auth.com/docs/concepts/database
- https://better-auth.com/docs/adapters/prisma
- https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining
