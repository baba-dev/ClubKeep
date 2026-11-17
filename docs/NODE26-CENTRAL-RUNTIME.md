# ClubKeep Node 26.13.1 — PR B runtime transition

## Scope

This change migrates ClubKeep **only** to the verified, immutable BabaBuilds Node.js
26.13.1 ARM64 distribution installed by ERP PR #657:

```text
/opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin/node
```

Existing MenuMinute web/worker continue running
`/opt/menuminute/node24/bin/node`. ERP continues running its
dedicated `/opt/bababuilds-erp/node26/bin/node`.
Do not uninstall or rename either legacy runtime in this PR.

## Source/build requirements

- `.nvmrc` pins exactly `26.13.1`; Node/npm engines require Node26/npm11.
- x64 CI, native ARM64 CI, PostgreSQL17 migration checks, and production-build
  smoke run with Node26.13.1. Keep `npm ci` and `package-lock.json`.
- Release archive remains lean and excludes runtime secrets and full build
  dependencies. **Format 3** adds `runtime:"node26"` and
  `nodeVersion:"26.13.1"`. The verifier still accepts existing
  format-2 `runtime:"node24"` for rollback.
- The root helper checks the pinned Node.js release binary's SHA256
  `de21e5b6e081aa16f86413aeba8c77fac44670cb6fe2748cc7c00329e6e6aa3a`.
- Production deployment requires the installed root-owned helper to report
  `clubkeep-release-formats: 1,2,3` **before** uploading a candidate.

## Root-owned helper bootstrap — required before any production cutover

The restricted `clubkeep-deploy` SSH user **cannot** replace root-owned
`/usr/local/sbin/clubkeep-release`. This is intentional. Therefore the new
release workflow must initially fail closed until an authorized VPS operator
installs the PR B reviewed helper.

Once this PR is merged and its exact main SHA and full CI verified, use an
authorized root shell on the VPS to upgrade only ClubKeep's helper. Fetch
the exact merged SHA, review the local contents and Git blob digest, and
install root-owned:

```bash
# On VPS, only after reviewing and recording the merged exact commit.
# REPLACE the placeholder with the real, reviewed 40-character ClubKeep main SHA.
SHA='<reviewed-40-character-merge-SHA>'
tmp="$(mktemp -d /tmp/clubkeep-node26.XXXXXX)"
git clone -q https://github.com/baba-dev/ClubKeep.git "$tmp/source"
git -C "$tmp/source" checkout -q "$SHA"
test "$(git -C "$tmp/source" rev-parse HEAD)" = "$SHA"
bash -n "$tmp/source/infra/deploy/clubkeep-release.sh"
bash -n "$tmp/source/infra/deploy/clubkeep-cleanup.sh"
bash -n "$tmp/source/infra/deploy/clubkeep-node24-rollback.sh"
sudo cp -a /usr/local/sbin/clubkeep-release /usr/local/sbin/clubkeep-release.node24.backup
sudo install -o root -g root -m 0750   "$tmp/source/infra/deploy/clubkeep-release.sh" /usr/local/sbin/clubkeep-release
sudo install -o root -g root -m 0750   "$tmp/source/infra/deploy/clubkeep-cleanup.sh" /usr/local/sbin/clubkeep-cleanup
sudo install -o root -g root -m 0750   "$tmp/source/infra/deploy/clubkeep-node24-rollback.sh" /usr/local/sbin/clubkeep-node24-rollback
sudo /usr/local/sbin/clubkeep-release --capabilities
sudo /usr/local/sbin/clubkeep-release --node26-ready
```

For a fully unattended installation, a **separate, main-only privileged**
bootstrap workflow may be reviewed in the shared VPS repository using
an exact pinned source hash; never grant generic sudo, filesystem writes,
or operator replacement rights to `clubkeep-deploy`.

## Production cutover and rollback

1. Record `systemctl show clubkeep-web --property=ExecStart,MainPID`,
   running Node interpreter, current release SHA, sibling-service states,
   available disk, and migrations. Confirm exact live Node24 executable.
2. Stage signed/checksummed native ARM64 v3 artifact. The helper checks the
   verified shared runtime and rejects migration-tree differences when changing
   Node major. It takes the existing isolated ClubKeep PostgreSQL backup and
   checks Prisma migration status.
3. Under `/run/lock/clubkeep-release.lock`, atomically move
   `/var/www/clubkeep/current` to the new release, add only the managed
   `clubkeep-web.service` ExecStart drop-in, reload systemd, and restart only
   `clubkeep-web`. No MenuMinute/ERP restart.
4. Check both local authentication endpoints, actual `/proc/<MainPID>/exe`,
   and Redis/MenuMinute sibling health. On a failed probe, restore the
   previous code pointer **and prior unit override**, restarting ClubKeep only.
5. On success, preserve the exact previous Node24 release in
   `/var/lib/clubkeep/rollback/node24-release-sha` (root:root 0600);
   the ClubKeep cleanup timer must honor this pin.
6. For a latent production regression, run:
   `sudo /usr/local/sbin/clubkeep-node24-rollback --plan`, inspect evidence,
   then `--apply` only when needed. This operator checks immutable releases,
   unchanged migration history, signed-in Node26 process, and restores both
   code and its Node24 runtime. No database rollback.
7. Do not remove Node24. MenuMinute still requires it; its removal belongs
   to PR C plus a final zero-consumer audit.

## Operator stop conditions

- New root helper cannot report v3 capabilities.
- Runtime checksum, Node 26 version, legacy Node24 rollback, or current
  ClubKeep systemd command does not match expected values.
- Active services or migration history differ.
- Protected Node24 rollback pin conflicts with another release.
- Health endpoints, runtime process verification, or post-cutover sibling
  probes fail.

Failing a gate is not permission to bypass it. Investigate and fix the
specific mismatch in a reviewed follow-up PR. Only Phase B is in scope;
no auth, pricing, business features, or database schema changes.
