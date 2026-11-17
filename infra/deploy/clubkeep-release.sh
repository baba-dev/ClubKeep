#!/usr/bin/env bash
# Root-owned, explicitly installed ClubKeep-only production activation helper.
# Usage: sudo /usr/local/sbin/clubkeep-release <40-char-main-sha> <64-char-sha256>
# The SSH account can stage bytes but cannot edit this helper, app symlink or DB secrets.
set -Eeuo pipefail
umask 077

die() { printf 'CLUBKEEP DEPLOY STOP: %s\n' "$*" >&2; exit 1; }
if [[ "$#" -eq 1 && "$1" == "--capabilities" ]]; then
  [[ "$EUID" -eq 0 ]] || die "Root required"
  echo 'clubkeep-release-formats: 1,2,3'
  exit 0
fi
# Production deploy only accepts v3 after the installed root-owned helper and
# shared Node26 installation have passed this read-only prerequisite.
if [[ "$#" -eq 1 && "$1" == "--node26-ready" ]]; then
  [[ "$EUID" -eq 0 ]] || die "Root required"
  node26=/opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin/node
  [[ -f "$node26" && ! -L "$node26" && -x "$node26" ]] ||
    die "Shared Node26 runtime missing"
  [[ "$("$node26" -p 'process.version+":"+process.platform+":"+process.arch')" ==
     "v26.13.1:linux:arm64" ]] || die "Node26 version or platform mismatch"
  printf '%s  %s\n' \
    de21e5b6e081aa16f86413aeba8c77fac44670cb6fe2748cc7c00329e6e6aa3a \
    "$node26" | sha256sum --check --status || die "Shared runtime checksum mismatch"
  for svc in bababuilds-erp.service postgresql@17-main.service \
             clubkeep-web.service clubkeep-redis.service \
             menuminute-web.service menuminute-worker.service; do
    systemctl is-active --quiet "$svc" ||
      die "Production prerequisite service unhealthy: $svc"
  done
  [[ -f /var/www/clubkeep/current/.next/standalone/server.js ]] ||
    die "Current ClubKeep release is missing"
  echo 'CLUBKEEP_NODE26_READY shared_runtime_verified all_sibling_services_active'
  exit 0
fi
[[ "$EUID" -eq 0 && "$#" -eq 2 ]] || die "Root and two validated arguments required"
sha="$1"; digest="$2"
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^[0-9a-f]{64}$ ]] || die "Invalid SHA or digest"
BASE=/var/www/clubkeep
CONFIG=/etc/clubkeep
NODE_BIN=/opt/menuminute/node24/bin
NODE26_BIN=/opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin
NODE26_SHA256=de21e5b6e081aa16f86413aeba8c77fac44670cb6fe2748cc7c00329e6e6aa3a
RUNTIME_DROPIN=/etc/systemd/system/clubkeep-web.service.d/50-bababuilds-node-runtime.conf
# This is only a ClubKeep unit override; the shared runtime is never edited.
CLUBKEEP_SERVER=/var/www/clubkeep/current/.next/standalone/server.js
INCOMING=/var/lib/clubkeep/incoming
BACKUPS=/var/lib/clubkeep/backups
archive="$INCOMING/clubkeep-$sha-linux-arm64.tar.gz"
release="$BASE/releases/$sha"
tmp="$BASE/releases/.deploy-$sha"
current="$BASE/current"

exec 9>/run/lock/clubkeep-release.lock
flock -n 9 || die "Another ClubKeep deployment is running"
[[ -L "$current" && -d "$BASE/releases" && -r "$CONFIG/web.env" &&
    -r "$CONFIG/migrate.env" ]] || die "Missing installed ClubKeep baseline"
[[ ! -e "$release" && ! -e "$tmp" ]] || die "Release already exists; no overwrite"
[[ -f "$archive" && ! -L "$archive" ]] || die "Missing regular staged release archive"
[[ "$(stat -c %U "$archive")" == "clubkeep-deploy" ]] || die "Untrusted archive owner"
[[ -x "$NODE_BIN/node" && -x "$NODE_BIN/npm" ]] || die "Node 24 rollback runtime missing"
[[ "$("$NODE_BIN/node" -p 'process.versions.node.split(".")[0] + ":" + process.arch')" == "24:arm64" ]] ||
  die "Expected existing Node24 ARM64 rollback runtime"
[[ "$(uname -m)" == aarch64 ]] || die "ARM64 VPS required"
systemctl is-active --quiet clubkeep-redis || die "ClubKeep Redis is down"
systemctl is-active --quiet menuminute-web || die "MenuMinute web is not healthy"
systemctl is-active --quiet menuminute-worker || die "MenuMinute worker is not healthy"
free_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
(( free_kb > 5000000 )) || die "Less than 5 GiB free disk space"
printf '%s  %s\n' "$digest" "$archive" | sha256sum --check --strict >/dev/null ||
    die "Release digest mismatch"

# Archive entries must be relative and may only live under the release roots.
# GNU tar is run as the unprivileged clubkeep user, never as root.
# List the archive completely before detecting the format or extracting any bytes.
listing="$(tar -tzf "$archive")" || die "Unable to list release archive"
format=1
if printf '%s\n' "$listing" | awk '$0 == "./release-manifest.json" { ok=1 } END { exit !ok }'; then
  format=2
fi
if ! printf '%s\n' "$listing" | awk -v format="$format" '
  /^\// || /(^|\/)\.\.(\/|$)/ { bad=1 }
  format == 1 && !(/^\.\/RELEASE-SHA$/ || /^\.\/package\.json$/ ||
    /^\.\/package-lock\.json$/ || /^\.\/next\.config\.ts$/ ||
    /^\.\/prisma\.config\.ts$/ || /^\.\/prisma(\/|$)/ ||
    /^\.\/node_modules(\/|$)/ || /^\.\/\.next\/standalone(\/|$)/) { bad=1 }
  format == 2 && !(/^\.\/RELEASE-SHA$/ || /^\.\/release-manifest\.json$/ ||
    /^\.\/migrate(\/|$)/ || /^\.\/\.next\/standalone(\/|$)/) { bad=1 }
  END { exit bad }
'; then
  die "Unexpected path in release format $format archive"
fi
if [[ "$format" == 2 ]]; then
  # Inspect link targets BEFORE extraction; Next.js standalone legitimately
  # uses internal symlinks. Refuse escapes, hardlinks, special files, and bombs.
  python3 - "$archive" <<'PY' || die "Unsafe lean archive member or link"
import posixpath
import sys
import tarfile

def allowed(path):
    return (
        path in {"RELEASE-SHA", "release-manifest.json", "migrate", ".next/standalone"}
        or path.startswith("migrate/")
        or path.startswith(".next/standalone/")
    )

try:
    total = 0
    count = 0
    seen = set()
    with tarfile.open(sys.argv[1], mode="r:gz") as archive:
        for member in archive:
            raw = member.name
            if raw.startswith("/") or ".." in raw.split("/"):
                raise ValueError("Non-relative archive path")
            name = posixpath.normpath(raw)
            if not allowed(name) or name in seen:
                raise ValueError("Unexpected or duplicate release entry")
            seen.add(name)
            count += 1
            if count > 100000:
                raise ValueError("Too many archive entries")
            if member.issym():
                link = member.linkname
                if posixpath.isabs(link) or ".." in link.split("/") and not link.startswith("../"):
                    raise ValueError("Unsupported symlink")
                target = posixpath.normpath(posixpath.join(posixpath.dirname(name), link))
                if not (target == "migrate" or target.startswith("migrate/")
                        or target == ".next/standalone"
                        or target.startswith(".next/standalone/")):
                    raise ValueError("Escaping archive symlink")
            elif member.isfile():
                total += member.size
                if total > 700 * 1024 * 1024:
                    raise ValueError("Archive expanded size exceeds limit")
            elif not member.isdir():
                raise ValueError("Hardlink or special file forbidden")
except (ValueError, tarfile.TarError, OSError) as exc:
    print("Invalid lean release tar members:", exc, file=sys.stderr)
    sys.exit(1)
PY
fi

previous="$(readlink -f "$current")"
[[ "$previous" == "$BASE/releases/"* && -f "$previous/.next/standalone/server.js" ]] ||
    die "Previous release is not an approved ClubKeep path"

mkdir -m 0750 "$tmp"
chown clubkeep:clubkeep "$tmp"
chgrp clubkeep "$archive"
chmod 0640 "$archive"
runuser -u clubkeep -- tar --extract --gzip --file "$archive" --directory "$tmp" --no-same-owner ||
    die "Unable to extract release as clubkeep"
[[ "$(cat "$tmp/RELEASE-SHA")" == "$sha" ]] || die "Release marker mismatch"
[[ -s "$tmp/.next/standalone/server.js" ]] ||
  die "Standalone server missing"
# A release with a manifest must be the reviewed lean v2 (Node24) or v3
# (exact Node26.13.1). Legacy format-1 remains Node24-only for rollback.
candidate_runtime=node24
if [[ "$format" == 2 ]]; then
  [[ -f "$tmp/release-manifest.json" &&
     -s "$tmp/migrate/node_modules/prisma/build/index.js" &&
     -f "$tmp/migrate/node_modules/dotenv/package.json" &&
     -f "$tmp/migrate/prisma/migrations/migration_lock.toml" &&
     -f "$tmp/migrate/prisma.config.ts" &&
     ! -e "$tmp/node_modules" ]] || die "Lean migration toolchain missing"
  candidate_runtime="$("$NODE_BIN/node" - "$tmp/release-manifest.json" "$sha" <<'NODE'
const fs = require("node:fs");
const [,, file, sha] = process.argv;
const m = JSON.parse(fs.readFileSync(file, "utf8"));
const valid = m.application === "clubkeep" && m.sha === sha &&
  m.architecture === "linux-arm64" && /^[0-9a-f]{64}$/.test(m.packageLockSha256);
if (!valid) process.exit(1);
if (m.format === 2 && m.runtime === "node24") process.stdout.write("node24");
else if (m.format === 3 && m.runtime === "node26" &&
         m.nodeVersion === "26.13.1") process.stdout.write("node26");
else process.exit(1);
NODE
  )" || die "Lean v2/v3 release manifest invalid"
  [[ "$candidate_runtime" == node24 || "$candidate_runtime" == node26 ]] ||
    die "Unsupported release runtime"
  # Even if a producer included symlinks, do not allow links outside this release.
  while IFS= read -r -d '' link; do
    resolved="$(realpath -e -- "$link")" || die "Dangling symlink in artifact"
    [[ "$resolved" == "$tmp/"* ]] || die "Artifact symlink escapes release root"
  done < <(find "$tmp" -type l -print0)
else
  [[ -x "$tmp/node_modules/.bin/prisma" &&
     -f "$tmp/prisma/migrations/migration_lock.toml" ]] ||
     die "Legacy migration toolchain missing"
fi
mv "$tmp" "$release"

# Verify the versioned shared platform runtime only when using it.
selected_node="$NODE_BIN/node"
selected_bin="$NODE_BIN"
if [[ "$candidate_runtime" == node26 ]]; then
  [[ -f "$NODE26_BIN/node" && ! -L "$NODE26_BIN/node" && -x "$NODE26_BIN/node" &&
     -x "$NODE26_BIN/npm" ]] || die "Approved shared Node26 runtime not installed"
  [[ "$("$NODE26_BIN/node" -p 'process.version + ":" + process.platform + ":" + process.arch')" ==
     "v26.13.1:linux:arm64" ]] || die "Shared Node26 runtime version mismatch"
  printf '%s  %s\n' "$NODE26_SHA256" "$NODE26_BIN/node" |
    sha256sum --check --status || die "Shared Node26 binary differs from verified PR A runtime"
  selected_node="$NODE26_BIN/node"
  selected_bin="$NODE26_BIN"
fi

# Previous immutable release determines the runtime to restore on failure.
previous_runtime=node24
if [[ -f "$previous/release-manifest.json" ]]; then
  previous_runtime="$("$NODE_BIN/node" - "$previous/release-manifest.json" <<'NODE'
const fs = require("node:fs");
const m = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (m.format === 2 && m.application === "clubkeep" && m.runtime === "node24") process.stdout.write("node24");
else if (m.format === 3 && m.application === "clubkeep" &&
         m.runtime === "node26" && m.nodeVersion === "26.13.1") process.stdout.write("node26");
else process.exit(1);
NODE
  )" || die "Unsupported previous release runtime; rollback cannot be guaranteed"
fi

previous_node="$NODE_BIN/node"
[[ "$previous_runtime" != node26 ]] || previous_node="$NODE26_BIN/node"
unit_exec="$(systemctl show clubkeep-web.service --property=ExecStart --value)"
[[ "$unit_exec" == *"$previous_node"* ]] ||
  die "Live ClubKeep systemd ExecStart does not match previous release runtime"
[[ "$unit_exec" == *".next/standalone/server.js"* ]] ||
  die "Unexpected ClubKeep systemd entrypoint: refusing blind override"
[[ -e "$CLUBKEEP_SERVER" && ! -L "$CLUBKEEP_SERVER" ]] ||
  die "ClubKeep current server.js missing"

# Runtime-only migration must not also introduce a database schema change.
previous_migrations="$previous/migrate/prisma/migrations"
[[ -d "$previous_migrations" ]] || previous_migrations="$previous/prisma/migrations"
candidate_migrations="$release/migrate/prisma/migrations"
[[ -d "$candidate_migrations" ]] || candidate_migrations="$release/prisma/migrations"
[[ -d "$previous_migrations" && -d "$candidate_migrations" ]] ||
  die "Cannot compare ClubKeep migration history"
schema_unchanged=false
if diff -qr -- "$previous_migrations" "$candidate_migrations" >/dev/null; then
  schema_unchanged=true
fi
if [[ "$candidate_runtime" != "$previous_runtime" && "$schema_unchanged" != true ]]; then
  die "Node runtime transition cannot include database schema migrations"
fi
# A one-way Node24 downgrade must not masquerade as an ordinary new release.
# The separately audited node24 rollback operator uses the pinned prior SHA.
if [[ "$candidate_runtime" == node24 && "$previous_runtime" == node26 ]]; then
  die "Node24 downgrade requires the dedicated root-only rollback operator"
fi

# Backup is independent of MenuMinute and captured BEFORE schema changes.
install -d -m 0700 -o root -g root "$BACKUPS"
backup="$BACKUPS/clubkeep-$(date -u +%Y%m%dT%H%M%SZ)-$sha.dump"
runuser -u postgres -- pg_dump --format=custom --no-owner --dbname=clubkeep > "$backup" ||
    die "ClubKeep database backup failed"
[[ -s "$backup" ]] || die "Backup file empty"
chmod 0600 "$backup"
echo "Verified isolated ClubKeep backup: $(basename "$backup")"

# The migrator URL is never printed or stored in the release archive.
migration_root="$release"
migration_cli="node_modules/prisma/build/index.js"
if [[ "$format" == 2 ]]; then
  migration_root="$release/migrate"
fi
(
  set -a
  # shellcheck disable=SC1090
  source "$CONFIG/migrate.env"
  set +a
  cd "$migration_root"
  runuser -u clubkeep -- env PATH="$selected_bin:/usr/bin:/bin" \
    "$selected_node" "$migration_cli" migrate deploy
  runuser -u clubkeep -- env PATH="$selected_bin:/usr/bin:/bin" \
    "$selected_node" "$migration_cli" migrate status
) || die "Migrations failed; previous release still active"

# Fresh tables from additive migrations need DML grants, not DDL.
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d clubkeep >/dev/null <<'SQL'
GRANT USAGE ON SCHEMA public TO clubkeep_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clubkeep_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clubkeep_app;
SQL

# Check existing drop-in provenance before touching the production unit.
# The selected override changes ONLY ClubKeep's ExecStart; no other unit is edited.
override_dir="$(dirname "$RUNTIME_DROPIN")"
[[ ! -L "$override_dir" && ! -L "$RUNTIME_DROPIN" ]] ||
  die "Unexpected symlink at ClubKeep runtime override"
previous_override="$(mktemp /run/clubkeep-runtime-previous.XXXXXX)"
had_override=false
if [[ -e "$RUNTIME_DROPIN" ]]; then
  [[ -f "$RUNTIME_DROPIN" ]] || die "Unexpected override type"
  grep -Fxq '# ClubKeep Node runtime override; managed by clubkeep-release' "$RUNTIME_DROPIN" ||
    die "Existing ClubKeep runtime override is not managed by this operator"
  cp -- "$RUNTIME_DROPIN" "$previous_override"
  had_override=true
fi

restore_prior_runtime() {
  if [[ "$had_override" == true ]]; then
    install -o root -g root -m 0644 "$previous_override" "$RUNTIME_DROPIN"
  else
    rm -f -- "$RUNTIME_DROPIN"
  fi
  systemctl daemon-reload
}
switch_to_node26() {
  install -d -o root -g root -m 0755 "$override_dir"
  [[ ! -L "$override_dir" ]] || die "ClubKeep runtime override directory is symlinked"
  local staged="$override_dir/.50-bababuilds-node-runtime.$$"
  printf '%s\n' \
    '# ClubKeep Node runtime override; managed by clubkeep-release' \
    '[Service]' \
    'ExecStart=' \
    "ExecStart=$selected_node $CLUBKEEP_SERVER" > "$staged"
  chown root:root "$staged"
  chmod 0644 "$staged"
  mv -Tf -- "$staged" "$RUNTIME_DROPIN"
  systemctl daemon-reload
}
runtime_process_ok() {
  local pid exe
  pid="$(systemctl show clubkeep-web.service --value --property=MainPID)" || return 1
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] || return 1
  exe="$(readlink -f "/proc/$pid/exe" 2>/dev/null)" || return 1
  [[ "$exe" == "$(readlink -f "$selected_node")" ]]
}
previous_process_ok() {
  local pid exe
  pid="$(systemctl show clubkeep-web.service --value --property=MainPID)" || return 1
  [[ "$pid" =~ ^[1-9][0-9]*$ ]] || return 1
  exe="$(readlink -f "/proc/$pid/exe" 2>/dev/null)" || return 1
  [[ "$exe" == "$(readlink -f "$previous_node")" ]]
}
restore_previous_on_failure() {
  local exit_code=$?
  trap - ERR
  if [[ "$schema_unchanged" != true ]]; then
    echo 'CLUBKEEP_FORWARD_ONLY: migration history changed; manual incident recovery required' >&2
  else
    echo 'CLUBKEEP_RUNTIME_ROLLBACK: restoring previous release and interpreter' >&2
    ln -s "$previous" "$BASE/.current-recover-$sha"
    mv -Tf "$BASE/.current-recover-$sha" "$current"
    restore_prior_runtime
    systemctl reset-failed clubkeep-web.service || true
    systemctl restart clubkeep-web.service || true
    recovered=false
    for _ in $(seq 1 30); do
      if systemctl is-active --quiet clubkeep-web.service &&
         previous_process_ok &&
         curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/auth/sign-in &&
         curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/api/auth/capabilities; then
        recovered=true
        break
      fi
      sleep 1
    done
    if [[ "$recovered" == true ]]; then
      echo 'CLUBKEEP_RUNTIME_ROLLBACK_PASS code_and_node_restored' >&2
    else
      echo 'CLUBKEEP_RUNTIME_ROLLBACK_FAILED operator_intervention_required' >&2
    fi
  fi
  exit "$exit_code"
}
trap 'rm -f -- "$previous_override"' EXIT

# The rollback trap owns both the code pointer and the interpreter. It is
# armed before the first pointer mutation and disarmed only after all probes.
trap restore_previous_on_failure ERR
ln -s "$release" "$BASE/.current-next-$sha"
mv -Tf "$BASE/.current-next-$sha" "$current"
if [[ "$candidate_runtime" == node26 && "$previous_runtime" != node26 ]]; then
  switch_to_node26
elif [[ "$candidate_runtime" == node24 && "$previous_runtime" != node24 ]]; then
  # Future explicit Node24 rollback is allowed only to an already-vetted
  # legacy artifact, preserving the original service unit and its arguments.
  restore_prior_runtime
fi
systemctl reset-failed clubkeep-web.service
systemctl restart clubkeep-web.service

healthy=0
for i in $(seq 1 40); do
  if systemctl is-active --quiet clubkeep-web.service &&
     runtime_process_ok &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/auth/sign-in &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/api/auth/capabilities &&
     systemctl is-active --quiet menuminute-web &&
     systemctl is-active --quiet menuminute-worker &&
     systemctl is-active --quiet clubkeep-redis; then
    healthy=1
    break
  fi
  sleep 1
done
if [[ "$healthy" != 1 ]]; then
  echo 'CLUBKEEP_NODE26_HEALTH_BLOCKED: rollback is required' >&2
  false
fi
test "$(readlink -f "$current")" = "$release"
# Keep the exact previous Node24 SHA outside the 14-day release pruner's
# ordinary retention rules, until an explicit rollback-retirement review.
if [[ "$candidate_runtime" == node26 && "$previous_runtime" == node24 ]]; then
  pin_dir=/var/lib/clubkeep/rollback
  pin="$pin_dir/node24-release-sha"
  install -d -o root -g root -m 0700 "$pin_dir"
  [[ ! -L "$pin" ]] || { echo 'CLUBKEEP_NODE24_PIN_INVALID' >&2; false; }
  if [[ -f "$pin" ]]; then
    [[ "$(cat "$pin")" == "$(basename "$previous")" ]] || {
      echo 'CLUBKEEP_NODE24_PIN_CONFLICT' >&2; false;
    }
  else
    printf '%s\n' "$(basename "$previous")" > "$pin"
    chown root:root "$pin"
    chmod 0600 "$pin"
  fi
fi
trap - ERR
echo "CLUBKEEP_DEPLOYED_NODE_RUNTIME sha=$sha runtime=$candidate_runtime"
echo 'CLUBKEEP_DEPLOY_PASS sibling_services_healthy'
