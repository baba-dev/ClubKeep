#!/usr/bin/env bash
# Root-owned, explicitly installed ClubKeep-only production activation helper.
# Usage: sudo /usr/local/sbin/clubkeep-release <40-char-main-sha> <64-char-sha256>
# The SSH account can stage bytes but cannot edit this helper, app symlink or DB secrets.
set -Eeuo pipefail
umask 077

die() { printf 'CLUBKEEP DEPLOY STOP: %s\n' "$*" >&2; exit 1; }
if [[ "$#" -eq 1 && "$1" == "--capabilities" ]]; then
  [[ "$EUID" -eq 0 ]] || die "Root required"
  echo 'clubkeep-release-formats: 1,2'
  exit 0
fi
[[ "$EUID" -eq 0 && "$#" -eq 2 ]] || die "Root and two validated arguments required"
sha="$1"; digest="$2"
[[ "$sha" =~ ^[0-9a-f]{40}$ && "$digest" =~ ^[0-9a-f]{64}$ ]] || die "Invalid SHA or digest"
BASE=/var/www/clubkeep
CONFIG=/etc/clubkeep
NODE_BIN=/opt/menuminute/node24/bin
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
[[ -x "$NODE_BIN/node" && -x "$NODE_BIN/npm" ]] || die "Node 24 runtime missing"
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
if [[ "$format" == 2 ]]; then
  [[ -f "$tmp/release-manifest.json" &&
     -s "$tmp/migrate/node_modules/prisma/build/index.js" &&
     -f "$tmp/migrate/node_modules/dotenv/package.json" &&
     -f "$tmp/migrate/prisma/migrations/migration_lock.toml" &&
     -f "$tmp/migrate/prisma.config.ts" &&
     ! -e "$tmp/node_modules" ]] || die "Lean migration toolchain missing"
  "$NODE_BIN/node" - "$tmp/release-manifest.json" "$sha" <<'NODE' ||
    die "Lean release manifest invalid"
const fs = require("node:fs");
const [,, file, sha] = process.argv;
const m = JSON.parse(fs.readFileSync(file, "utf8"));
if (m.format !== 2 || m.application !== "clubkeep" || m.sha !== sha ||
    m.architecture !== "linux-arm64" || m.runtime !== "node24" ||
    !/^[0-9a-f]{64}$/.test(m.packageLockSha256)) process.exit(1);
NODE
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
  runuser -u clubkeep -- env PATH="$NODE_BIN:/usr/bin:/bin" \
    "$NODE_BIN/node" "$migration_cli" migrate deploy
  runuser -u clubkeep -- env PATH="$NODE_BIN:/usr/bin:/bin" \
    "$NODE_BIN/node" "$migration_cli" migrate status
) || die "Migrations failed; previous release still active"

# Fresh tables from additive migrations need DML grants, not DDL.
runuser -u postgres -- psql -v ON_ERROR_STOP=1 -d clubkeep >/dev/null <<'SQL'
GRANT USAGE ON SCHEMA public TO clubkeep_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clubkeep_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clubkeep_app;
SQL

ln -s "$release" "$BASE/.current-next-$sha"
mv -Tf "$BASE/.current-next-$sha" "$current"
systemctl restart clubkeep-web || true

healthy=0
for i in $(seq 1 40); do
  if systemctl is-active --quiet clubkeep-web &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/auth/sign-in &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/api/auth/capabilities &&
     systemctl is-active --quiet menuminute-web &&
     systemctl is-active --quiet menuminute-worker; then
    healthy=1
    break
  fi
  sleep 1
done

if [[ "$healthy" != 1 ]]; then
  echo "ClubKeep health failed: rolling back code symlink only" >&2
  ln -s "$previous" "$BASE/.current-recover-$sha"
  mv -Tf "$BASE/.current-recover-$sha" "$current"
  systemctl restart clubkeep-web || true
  die "Release not activated. Database schema is forward-only: restore requires a separate review."
fi

echo "CLUBKEEP DEPLOYED: $sha; MenuMinute web/worker remain active"
