# ClubKeep — bare-metal coexistence plan with MenuMinute

**Status: proposed operational design only.** User-approved direction, 9 Nov 2026: **ClubKeep runs bare metal on the same server as MenuMinute**. No Docker/Compose for ClubKeep runtime or required local setup. Validate the real machine before provisioning any resources. The existing MenuMinute deployment and any other colocated services must remain operational and untouched.

## 1. Deployment shape

```text
Internet -> Cloudflare (if configured) -> Host Nginx :443
                                         |--> MenuMinute virtual host --> MenuMinute systemd web/worker
                                         `--> ClubKeep virtual host --> clubkeep-web.service
                                                |
                                                |--> PostgreSQL (shared PG daemon, NEW clubkeep db/roles)
                                                `--> Redis (isolated ClubKeep auth/nonce/rate-limit store)
Shared Linux CPU / RAM / disk / restic infrastructure;
distinct app identity, release, environment secrets, permissions, logs, DB and restore targets.
```

The public hostname and port are **OPEN**. Do not invent or hardcode one. Separate auth cookies, OAuth redirect URI, CORS/trusted origins, log formats and rate-limit prefixes. Do **not** rely on a generic Nginx server default for auth callbacks.

## 2. Before touching the machine — read-only audit

Collect and record **sanitized** results:

- OS and architecture (`uname -a`, `uname -m`, `lsb_release -a`); installed Node executables and versions, user/process owners, systemd service states.
- RAM, swap, CPU load and disk/inodes (`free -h`, `df -h`, `df -i`, `uptime`), history of OOM and deployment disk usage.
- PostgreSQL service and version, database size and connection pressure, with credential-safe `psql` queries (do not publish connection strings).
- Redis instances (MenuMinute is documented as using separate queue/cache instances, often ports 6381/6382; **verify actual bound listeners and configs**, never assume); persistence, eviction, memory usage and ACL policy.
- Available loopback TCP ports (`ss -lntp`), Nginx server blocks, certificates, existing reverse-proxy forwarding rules, service isolation and baseline latency.
- Existing snapshot/restic backup cadence and restore verification, available disk headroom for database snapshots and release artifacts.

Keep the audit summary free of secrets, personal user data, cookies, complete environment files and identifiable payloads. **No automatic cleanup or restarts of MenuMinute.**

## 3. PostgreSQL — share engine, isolate tenants and permissions

- Reuse the installed PostgreSQL service if compatible (MenuMinute has previously been deployed with PostgreSQL 17, but reconfirm on machine).
- New database: `clubkeep`; app role: `clubkeep_app`; migration/deployer role: `clubkeep_migrator`. Actual names are suggested conventions, not existing database objects.
- Grant least privileges. App cannot read MenuMinute database or run destructive migrations; migration identity cannot modify unrelated app databases.
- Connection pool limits protect shared `max_connections`; verify baseline Postgres use first. Enforce per-app query/statement timeouts after profiling.
- Migrations only from pinned reviewed releases, in a controlled one-time deploy step: backup -> migration -> health checks. `prisma migrate deploy` for staging/production, not `db push` or resets.
- Backups: database-specific pg_dump plus restic snapshots with ClubKeep-specific tags or paths. Test restore to a separate temporary database, not into MenuMinute.

## 4. Redis — share host, not unbounded security state

- Never point ClubKeep at MenuMinute's **queue** Redis or use a cache instance whose eviction may silently discard authentication throttles.
- Prefer **one small separate loopback-only Redis instance/service** for ClubKeep rate limits, invite/exchange state and magic-link anti-abuse; use `maxmemory-policy noeviction` and bounded TTLs. Determine available port and memory cap from live audit; do not assume an unused port.
- If the user explicitly elects to reuse an existing Redis service, isolate ClubKeep with ACLs and key prefixes and verify non-evicting security semantics. Distinct logical DB numbers **alone are not security boundaries**. Fail closed for high-risk actions on Redis unavailability.
- PostgreSQL is durable source of truth for invitation consumed/revoked state and account/session ownership. Redis counters are defense-in-depth, not the sole barrier to reusing invitations.

## 5. Linux service and filesystem design

| Item | Proposed configuration |
| --- | --- |
| Application owner | `clubkeep` non-root user/group |
| Releases | `/var/www/clubkeep/releases/<git-sha>`, `/var/www/clubkeep/current` symlink |
| Writable data | `/var/lib/clubkeep`, not in release directory |
| Secrets | `/etc/clubkeep/web.env`, 0600, root ownership, kept outside git and build artifacts |
| Web service | `clubkeep-web.service`, process isolated from MenuMinute |
| Optional worker | `clubkeep-worker.service` only if verified background-email/scheduler need |
| Runtime | Shared compatible Node 24 binary **after verification**, separate `node_modules`/artifact |
| HTTP | New dedicated Nginx virtual host -> chosen **loopback** ClubKeep port |
| Backups | Restic with ClubKeep-specific backup set + independent PostgreSQL dump |
| Logs | journald with redaction, rotation, retention and health-only metrics |

Recommended systemd controls after measuring behavior: `User=clubkeep`, `Group=clubkeep`, `NoNewPrivileges=true`, `PrivateTmp=true`, `ProtectSystem=strict`, `ProtectHome=true`, explicit `ReadWritePaths`, `Restart=on-failure`, startup and runtime resource budgets such as `MemoryMax`, `CPUQuota`, `TasksMax`. Check compatibility with Next.js runtime before hardening excessively. Never blindly assign tiny memory caps; measure a real production build and idle/peak process.

Do not share app secrets, cookie signing keys, temp directories or session stores with MenuMinute.

## 5A. Outbound transactional email — selected owner SMTP

- **Mail server:** `mx.bababuilds.com` (existing separate Mail-in-a-Box server). Do not install or configure a new mail server on the MenuMinute/ClubKeep VPS.
- **Submission:** TCP **587**, mandatory STARTTLS, authenticated with a **dedicated full mailbox address** and password (both owner-supplied). For Nodemailer use `secure: false`, `requireTLS: true`, `tls.servername: "mx.bababuilds.com"`, and normal CA validation. **Never use `rejectUnauthorized: false`**, port 25 as submission, plaintext credentials, or a provider failover that silently sends identity links elsewhere.
- **Environment contract (placeholders only):** `EMAIL_PROVIDER=smtp`, `SMTP_HOST=mx.bababuilds.com`, `SMTP_PORT=587`, `SMTP_SECURE=false`, `SMTP_REQUIRE_TLS=true`, `SMTP_USER=<owner mailbox>`, `SMTP_PASSWORD=<secret>`, `EMAIL_FROM=<authorized sender>`. Use non-secret placeholders in `.env.example`; put real secrets only in independently protected `/etc/clubkeep/web.env` at deployment.
- **PR 0A:** validate TLS and network reachability without authentication or sending email. Verify `mx.bababuilds.com`'s certificate hostname and expiry; do not log raw SMTP transcripts that could contain credentials. Define client timeouts and safe error categories.
- **PR 0C:** implement actual magic-link sending through selected SMTP; rate limits, anti-enumeration, single-use/short expiry, delivery failures, messages with no health data, sender/domain SPF/DKIM/DMARC check and test on authorized mailbox. No production email sends or secrets during PR 0A.

## 6. Nginx and auth origins

- Separate hostname/cert, `server_name`, upstream listener, access/error logs and security headers. Use HTTPS for WebAuthn outside localhost.
- Fix public `BETTER_AUTH_URL` and WebAuthn relying-party ID/origin to the chosen **actual** domain. If app is behind Cloudflare, trust only configured proxy hops/IP ranges; do not trust arbitrary `X-Forwarded-For`.
- Google OAuth redirect must exactly match the verified public ClubKeep baseURL callback. Use separate Google OAuth credentials or an isolated configured client; do not reuse MenuMinute's credentials/cookies merely because hosts share a machine.
- Reject callback, origin or RP ID mismatches. Private authenticated routes must disable shared caching; invite URLs must not leak query bearer tokens to external referrals or tracking.
- Expose only HTTPS public routes; database and Redis stay on loopback/socket, with host firewall enforcement.

## 7. Deploy and rollback runbook (design)

1. GitHub-hosted CI tests code, checked-in Prisma migrations, Google/passkey/magic-link mock paths, and builds an immutable release artifact. Production host never runs untrusted PR scripts or a broad-scope self-hosted runner.
2. Deploy only from protected branch/environment with narrowly scoped credentials, to a fresh `releases/<sha>` directory. Verify package/runtime/Node/ARM64 compatibility.
3. Take an independent ClubKeep DB dump and restic snapshot; run `prisma migrate deploy` as the migrations role once with a deploy lock. Do not touch MenuMinute schemas.
4. Atomically update ClubKeep's `current` symlink. Restart **only** the ClubKeep systemd service. Confirm local/externally routed readiness, no auth-cookie/domain mismatch and no high error rate.
5. Roll back the application symlink if a backwards-compatible migration permits it. Schema rollback is **not** assumed safe; use expand-contract patterns and reviewed restoration plans.
6. Check MenuMinute web/worker health after ClubKeep deploy, its database latency and Redis queues; abort rollout if impact exceeds baseline guardrails. Never restart unrelated services as part of routine ClubKeep deployment.
7. Periodically test a restore to a new database and application instance. Verify least privilege and backup integrity.

## 8. Capacity and SLO gates (numbers deliberately OPEN)

Before activating live ClubKeep traffic, record actual observed resource headroom and choose numeric:
- ClubKeep web service memory budget and sustained/peak CPU.
- Maximum PostgreSQL connections and migration execution threshold.
- Redis security memory cap and failure policy.
- Log and snapshot retention; storage quotas for **future** medical files (not Phase 0).
- Alert thresholds for ClubKeep and independent MenuMinute health.

No performance SLA, server capacity or port availability can be claimed from the repository alone. A live host audit is required.

## 9. Current repo-to-future transition

As of this planning commit, **`docker-compose.yml` remains in git and production is not configured**. The first implementation PR must explicitly remove Docker from required docs and CI, then make native service development reproducible. Do not delete data from existing services or install a duplicate PostgreSQL instance simply because the repo currently references PostgreSQL 16 in Docker.

## 10. Source and access boundary

The GitHub connector provides repository code, **not root SSH access to the server**. This document does not claim ports are free, services have been started, credentials are installed or a backup exists. Provisioning and deployment require controlled server access, sanitized environment inspection and explicit release approval.
