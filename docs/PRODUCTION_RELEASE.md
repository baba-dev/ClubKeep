# ClubKeep production releases — first VPS to guarded CI/CD

**Target:** Ubuntu 24.04 ARM64 on the existing BabaBuilds SaaS VPS, with
ClubKeep at https://clubkeep.bababuilds.com. **No Docker and no changes to
MenuMinute systemd, PostgreSQL database, or Redis instances.**

The manual bootstrap created:
- `/var/www/clubkeep/current` -> `releases/<sha>`, systemd `clubkeep-web` on 127.0.0.1:3200
- PostgreSQL 17 `clubkeep`, `clubkeep_app` and `clubkeep_migrator`
- `clubkeep-redis` on 127.0.0.1:6383
- root-owned `/etc/clubkeep/web.env` and `migrate.env` (never upload these)
- independently configured HTTPS Nginx host and certificates

## Release contract

`.github/workflows/deploy-vps.yml` runs **only after** current-main CI succeeds.
It builds the same exact commit on a GitHub-hosted **ARM64** runner, packages
the compiled Next.js standalone application and reviewed Prisma migrations
with pinned dependencies, checks SHA-256, uploads the archive over pinned-host-key
SSH, and asks a root-owned helper to activate ClubKeep **only**.

Automatic production deployment is **disabled by default**. `workflow_run`
does nothing unless repository variable `CLUBKEEP_AUTO_DEPLOY=true`.
`workflow_dispatch` remains possible using the current full main SHA once
the host and GitHub environment have been configured and its push CI is green.

No production DB/password/Redis/API/SMTP secrets are in the artifact, GitHub
build job or repository. Synthetic build-time values are **not production
credentials**. The public app origin alone is intentionally compiled.

## One-time VPS setup (operator, after reviewing and merging the PR)

1. Review the merged helper script *at its exact commit*.
   Install it as a protected root-owned file. Example from a **fresh trusted
   checkout** of the approved merge commit:

   ```bash
   cd /tmp
   git clone --depth 1 https://github.com/baba-dev/ClubKeep.git clubkeep-deploy-setup
   cd clubkeep-deploy-setup
   git rev-parse HEAD
   # Verify this is the expected reviewed SHA.
   sudo install -o root -g root -m 0750 infra/deploy/clubkeep-release.sh \
      /usr/local/sbin/clubkeep-release
   ```

   Future helper upgrades require a separate root/operator install; a
   deployment itself can never replace this privileged file.

2. Create a **dedicated, non-root** incoming-upload account. It must not be
   in `sudo` or any MenuMinute group:

   ```bash
   sudo useradd --system --create-home --home-dir /home/clubkeep-deploy \
      --shell /bin/bash --user-group clubkeep-deploy
   sudo usermod -aG clubkeep clubkeep-deploy
   sudo install -d -m 0750 -o clubkeep-deploy -g clubkeep \
      /var/lib/clubkeep/incoming
   sudo install -d -m 0700 -o clubkeep-deploy -g clubkeep-deploy \
      /home/clubkeep-deploy/.ssh
   ```

   The parent `/var/lib/clubkeep` remains `clubkeep:clubkeep` with 0750:
   the deploy user can traverse it via group but cannot modify the app data
   directory. The incoming folder is its only deploy upload destination.

3. Generate an **independent Ed25519 SSH key on your workstation**, not in
   GitHub or the VPS, and put only the public key in:
   `/home/clubkeep-deploy/.ssh/authorized_keys` (0600, owned by the
   deploy user). Do not reuse ERP or MenuMinute deploy credentials.
   Do not paste the private key in chat.

4. Install a narrow sudoers rule:

   ```bash
   sudo visudo -f /etc/sudoers.d/clubkeep-deploy
   ```

   Add exactly:

   ```text
   clubkeep-deploy ALL=(root) NOPASSWD: /usr/local/sbin/clubkeep-release
   ```

   Validate with `sudo visudo -cf /etc/sudoers.d/clubkeep-deploy`.
   The helper validates its two arguments, archive ownership and digest;
   no generic root shell or unrestricted `sudo` is granted.

5. Determine the **actual SSH host key fingerprint** using the trusted VPS
   console: `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`.
   Pin that verified key in GitHub's known-hosts secret. Never use
   `StrictHostKeyChecking=no`. Ensure the GitHub-hosted runner can connect
   to SSH on the chosen host/port without opening the app's loopback ports.

## GitHub configuration

Create repository environment **`production`**, preferably with main branch
restrictions and reviewers. Set **environment secrets**:

- `CLUBKEEP_VPS_HOST`: SSH-reachable hostname or IP of this VPS
- `CLUBKEEP_DEPLOY_SSH_KEY`: dedicated deploy SSH private key
- `CLUBKEEP_VPS_KNOWN_HOSTS`: verified known_hosts line(s) including SSH host key

Optional repository variable: `CLUBKEEP_VPS_SSH_PORT` (defaults to 22).

Set repository variable `CLUBKEEP_AUTO_DEPLOY=false` initially. These
GitHub secrets are used **only in transport steps**, never in `npm ci` or
project code/tests.

After CI succeeds on the merged main SHA, use **Actions → Deploy ClubKeep VPS
→ Run workflow**, passing that exact SHA. Verify the host's standalone web
service, `/auth/sign-in`, `/api/auth/capabilities`, MenuMinute services,
and DB migration status. Then enable `CLUBKEEP_AUTO_DEPLOY=true` to promote
later successful main pushes automatically.

## On-server activation and safety

- The incoming archive must be owned by `clubkeep-deploy`, have an exact
  SHA256 digest, and contain only expected relative release paths.
- Deployment is serialized with `flock`. Old releases are immutable.
- The privileged helper extracts as `clubkeep`, **never root**.
- A separate ClubKeep-only `pg_dump -Fc` backup is captured before
  `prisma migrate deploy` as `clubkeep_migrator`. New runtime tables receive
  DML-only grants for `clubkeep_app`.
- Only `clubkeep-web` restarts. The atomic symlink cutover reuses the existing
  `clubkeep-web.service` and `/etc/clubkeep/web.env`.
- HTTP and service checks must pass. On failure the **application symlink**
  returns to the previous release. **Schema changes are forward-only**: the
  script never attempts an unsafe DB rollback. Investigate migrations before
  retrying and validate regular independent restic/pg_dump restores.
- MenuMinute web/worker must be active before and after activation; neither
  is restarted or migrated.
- No automatic deletions of archives, database backups or older releases.
  Monitor disk growth before enabling high-frequency deployments.

## Provider rollout remains separate

Current protected production environment has feature flags disabled.
Activating Google OAuth, passkeys or Mail-in-a-Box magic links requires
provider-specific credentials in `/etc/clubkeep/web.env`, a deliberate
ClubKeep-only restart and end-to-end tests. Verify Cloudflare real-IP
trust and Nginx's overwritten `X-ClubKeep-Client-IP` before enabling
email/passkey rate limiting. Only operator-approved registration may be
made public; CI/CD does **not** open enrollment by itself.

`/api/auth/capabilities` is deliberately dynamic to avoid freezing feature
flags from synthetic GitHub build settings.

## Daily housekeeping — separately installed, default-off until first successful deployment

ClubKeep retention is isolated from MenuMinute and **never** deletes unrelated
VPS data. `infra/deploy/clubkeep-cleanup.sh` is a privileged script installed
manually by the owner. The daily systemd timer is not installed automatically
by pushing GitHub source code. Confirm a passing manual GitHub deployment,
verify the running SHA and perform a rollback drill before enabling the timer.

Recommended first install from a verified **merged commit** checkout:

```bash
# From a trusted checkout at the reviewed main SHA:
sudo install -o root -g root -m 0750 infra/deploy/clubkeep-cleanup.sh \
  /usr/local/sbin/clubkeep-cleanup
sudo install -o root -g root -m 0644 infra/deploy/clubkeep-cleanup.service \
  /etc/systemd/system/clubkeep-cleanup.service
sudo install -o root -g root -m 0644 infra/deploy/clubkeep-cleanup.timer \
  /etc/systemd/system/clubkeep-cleanup.timer
sudo systemctl daemon-reload
sudo /usr/local/sbin/clubkeep-cleanup --dry-run
# Review the output carefully before enabling.
sudo systemctl enable --now clubkeep-cleanup.timer
sudo systemctl list-timers clubkeep-cleanup.timer
```

### Safeguards and retention

| Area | Deletion gate | Protected |
| --- | --- | --- |
| Incoming `/var/lib/clubkeep/incoming` | ClubKeep-named SHA archive; older than 7 full days (GNU find `-mtime +7`) | In-progress uploads, nonmatching names, symlinks |
| Releases `/var/www/clubkeep/releases` | Exact 40-character SHA directory; older than 14 days; only beyond newest three | Current symlink target; newest three; unknown dirs |
| PostgreSQL dump `/var/lib/clubkeep/backups` | **OFF by default**; optional exact root-owned marker after offsite restore drill, then older than 30 days beyond newest 14 dumps | All backups without marker; newest 14 with marker |
| Redis, /etc, Nginx, MenuMinute and journald | **Never** | Entire resources |

The root-only marker is `/etc/clubkeep/enable-backup-pruning-after-restore-drill`.
Do **not** create it until an independent offsite backup and restore are
verified. If retention is explicitly approved, write this exact content with
root-only `0600` permissions:

```text
VERIFIED_OFFSITE_RESTORE_AND_APPROVED_30_DAY_RETENTION
```

Even with the marker, the cleanup script protects the newest 14 local DB
dumps. A cleanup timer does **not** replace a monitored offsite backup or a
restore rehearsal. Monitor root disk space; the job emits a warning below
8 GiB free. Nothing touches MenuMinute's release archives or databases.

The cleanup job and release helper use the **same** `flock` lock, so pruning
skips when deployment is active. The script defaults to `--dry-run` and
requires root for `--apply`. Systemd runs the locked job daily at 04:30 UTC
with a 30-minute random delay, low I/O priority, private temp directory and
write access restricted to the ClubKeep retention paths. Review results with
`journalctl -u clubkeep-cleanup.service`.

### SSH credential failure diagnostics

An OpenSSH error such as `Load key ...: error in libcrypto` means the stored
`CLUBKEEP_DEPLOY_SSH_KEY` is not a parseable unencrypted OpenSSH private key.
The public key goes in the VPS `authorized_keys`; the **complete multiline
private key** (including BEGIN/END lines) goes into the GitHub environment
secret. On Windows validate the private file locally using
`ssh-keygen -y -P "" -f "$env:USERPROFILE\.ssh\clubkeep-deploy-ed25519"`
before re-copying it to GitHub, never into a chat or CI log.

The deployment workflow now explicitly checks private key parsing and returns
an actionable error before it attempts SCP.
