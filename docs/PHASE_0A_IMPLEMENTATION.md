# Phase 0A — native runtime and CI (no production deployment)

**Stage:** repository foundation only. No changes to the MenuMinute VPS, PostgreSQL databases, Redis instances, Nginx or production authentication are performed by this PR.

## Audited production host (9 November 2026)

- Oracle Linux VM Ubuntu-based, ARM64 (`aarch64`), 23 GiB memory (~21 GiB available during audit), 72 GB root filesystem (32 GB free).
- Node 24.22.0 is available alongside system Node 20; choose Node 24 for ClubKeep only.
- PostgreSQL 17.11 running at `127.0.0.1:5432`. **Do not use MenuMinute's database or role.**
- Redis 8.10.3 binary; MenuMinute's Redis instances listen on `127.0.0.1:6381` and `:6382`. Reserve a separate non-evicting ClubKeep security store in a *later* provisioning phase.
- Nginx 1.24.0 running; MenuMinute web and worker both active. No port or Nginx config assigned to ClubKeep yet.
- Mail-in-a-Box SMTP `mx.bababuilds.com:587`: STARTTLS TLS 1.3 connection and certificate hostname verification passed. Mailbox authentication and actual delivery were **not** tested.

**No host-level changes were performed.** These are point-in-time user-supplied observations, not ongoing capacity guarantees. Monitor 32 GB disk headroom and very small (255 MiB) swap. Review public-facing ports 111, 3000, 9090, and 10050 against Oracle Cloud NSG and host firewall separately.

## Developer setup — native PostgreSQL and Redis

Use Node 24.x and a local installed PostgreSQL and Redis instance. **No Docker**.

1. Install/start PostgreSQL and Redis with your workstation's package manager. Do **not** run package-install or service restart commands on the MenuMinute production VPS.
2. Create a **local-only** `clubkeep_dev` database and non-superuser login. The `.env.example` contains **example** local values that you must replace.
3. `npm ci` and `cp .env.example .env`, update the local DB/Redis URL and local development auth secret.
4. `npm run db:validate`, `npm run db:generate`, `npm run typecheck`, `npm run test`.
5. Start `npm run dev`. **Database tables are not provisioned by PR 0A**; Prisma baseline migrations arrive in 0B. The existing homepage phone OTP demo is legacy mock behavior, **not real authentication**; do not deploy it as a sign-in experience.

Prisma CLI loads the local `.env` via explicitly declared `dotenv`. `prisma generate` and `prisma validate` work without `DATABASE_URL`; commands actually connecting to a database require a real URL. Never use `prisma db push` or `migrate reset` in staging/production.

### Commands

```bash
npm ci
npm run db:validate
npm run db:generate
npm run lint
npm run format:check
npm run typecheck
npm run test
# Requires manually configured local ClubKeep-only native PostgreSQL/Redis:
npm run test:integration
npm run build
```

### CI

GitHub-hosted `ubuntu-24.04` and `ubuntu-24.04-arm` runners use Node 24. One x64 job installs **native** PostgreSQL and Redis into the disposable GitHub VM for an actual read-only connection smoke. No services/container images are created on the production VPS. ARM64 job tests client generation, typing and production build.

The CI variables for app URLs, database and auth secret are **synthetic**. Never reuse them in deployment. Versioned database migrations, auth/passkey/club integration tests, email sending, browser E2E and backup/restore will be implemented in later PRs.

### SMTP: owner Mail-in-a-Box

Approved endpoint: `mx.bababuilds.com:587` with authenticated submission and **mandatory STARTTLS**, certificate validation on. Keep `EMAIL_PROVIDER` disabled until the actual sender, mailbox password and real magic-link delivery are configured for Phase 0C. Do not log passwords or send production email in PR 0A.

### Production release contract (not activated)

Plan for `/var/www/clubkeep` isolated non-root systemd app and separate `clubkeep` PostgreSQL DB/role, dedicated isolated Redis security store, `/etc/clubkeep/web.env`, and a dedicated Nginx HTTPS host. No production changes are allowed in PR 0A. See [BAREMETAL_DEPLOYMENT.md](BAREMETAL_DEPLOYMENT.md).
