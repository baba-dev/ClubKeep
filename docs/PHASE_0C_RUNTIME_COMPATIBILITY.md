# Phase 0C runtime compatibility

**Dependency versions:** Better Auth `1.7.18` and `@better-auth/passkey`
`1.7.18` intentionally match. Nodemailer `10.4.0` supports Node 24
and ships its own TypeScript types. Never use floating auth plugin versions
in a security-sensitive application.

Phase 0B's existing `passkey` table matches the documented Better Auth
1.7.18 passkey fields. Production remains untouched: this work only
modifies the GitHub repository and uses synthetic CI configuration.

OAuth, Mail-in-a-Box SMTP and WebAuthn provider activation are delivered
in subsequent commits C2–C8; see [PHASE_0C_AUTHENTICATION_PLAN.md](PHASE_0C_AUTHENTICATION_PLAN.md).
