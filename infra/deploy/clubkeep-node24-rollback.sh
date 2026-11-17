#!/usr/bin/env bash
# Root-only, migration-free rollback of ClubKeep's paired code + Node runtime.
# The rollback target comes solely from the protected pin written at cutover.
set -Eeuo pipefail
umask 077
fail() { printf 'CLUBKEEP_NODE24_ROLLBACK_BLOCKED: %s\n' "$*" >&2; exit 1; }
[[ $# == 1 && ( $1 == --plan || $1 == --apply ) ]] ||
  fail "Usage: clubkeep-node24-rollback --plan|--apply"
mode="$1"
[[ "$EUID" == 0 && "$(uname -m)" == aarch64 ]] || fail "ARM64 root required"
BASE=/var/www/clubkeep
CURRENT=$BASE/current
PIN=/var/lib/clubkeep/rollback/node24-release-sha
DROPIN=/etc/systemd/system/clubkeep-web.service.d/50-bababuilds-node-runtime.conf
NODE24=/opt/menuminute/node24/bin/node
NODE26=/opt/bababuilds/runtimes/node-v26.13.1-linux-arm64/bin/node
NODE26_SHA256=de21e5b6e081aa16f86413aeba8c77fac44670cb6fe2748cc7c00329e6e6aa3a

exec 9>/run/lock/clubkeep-release.lock
flock -n 9 || fail "Another deploy or retention operation is active"
[[ -L "$CURRENT" ]] || fail "Current pointer must be a symlink"
active="$(readlink -f "$CURRENT")"
[[ "$active" =~ ^/var/www/clubkeep/releases/[0-9a-f]{40}$ &&
  -d "$active" && ! -L "$active" ]] || fail "Active release path invalid"
[[ -f "$PIN" && ! -L "$PIN" &&
   "$(stat -c '%U:%a' "$PIN")" == root:600 ]] || fail "Trusted Node24 pin missing"
sha="$(cat "$PIN")"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid Node24 rollback SHA"
previous="$BASE/releases/$sha"
[[ -d "$previous" && ! -L "$previous" &&
   -f "$previous/RELEASE-SHA" &&
   "$(cat "$previous/RELEASE-SHA")" == "$sha" ]] ||
  fail "Pinned rollback release missing or invalid"
[[ "$previous" != "$active" ]] || fail "Previous release is already active"
[[ -f "$DROPIN" && ! -L "$DROPIN" ]] || fail "Active Node26 override missing"
grep -Fxq '# ClubKeep Node runtime override; managed by clubkeep-release' "$DROPIN" ||
  fail "Unrecognized runtime override"
grep -Fq "ExecStart=$NODE26 " "$DROPIN" || fail "Node26 override is not active"
[[ -x "$NODE24" && -x "$NODE26" ]] || fail "A verified runtime is missing"
[[ "$("$NODE24" -p 'process.versions.node.split(".")[0] + ":" + process.arch')" == '24:arm64' ]] ||
  fail "Node24 runtime mismatch"
[[ "$("$NODE26" -p 'process.version + ":" + process.arch')" == 'v26.13.1:arm64' ]] ||
  fail "Node26 runtime mismatch"
printf '%s  %s\n' "$NODE26_SHA256" "$NODE26" |
  sha256sum --check --status || fail "Shared Node26 binary changed"
"$NODE26" - "$active/release-manifest.json" "$previous/release-manifest.json" <<'NODE' ||
  fail "Invalid runtime manifests"
const fs = require("node:fs");
const [,, candidatePath, previousPath] = process.argv;
const current = JSON.parse(fs.readFileSync(candidatePath, "utf8"));
if (current.format !== 3 || current.application !== "clubkeep" ||
    current.runtime !== "node26" || current.nodeVersion !== "26.13.1") process.exit(1);
if (fs.existsSync(previousPath)) {
  const old = JSON.parse(fs.readFileSync(previousPath, "utf8"));
  if (old.format !== 2 || old.application !== "clubkeep" || old.runtime !== "node24")
    process.exit(1);
}
NODE
active_migrations="$active/migrate/prisma/migrations"
old_migrations="$previous/migrate/prisma/migrations"
[[ -d "$old_migrations" ]] || old_migrations="$previous/prisma/migrations"
[[ -d "$active_migrations" && -d "$old_migrations" ]] ||
  fail "Migration trees unavailable"
diff -qr -- "$active_migrations" "$old_migrations" >/dev/null ||
  fail "Schema changed; code rollback is unsafe"
for unit in clubkeep-web clubkeep-redis menuminute-web menuminute-worker bababuilds-erp postgresql@17-main; do
  systemctl is-active --quiet "$unit" || fail "Service unhealthy: $unit"
done
[[ "$(systemctl show clubkeep-web --value --property=ExecStart)" == *"$NODE26"* ]] ||
  fail "Active systemd configuration is not Node26"
pid="$(systemctl show clubkeep-web --value --property=MainPID)"
[[ "$pid" =~ ^[1-9][0-9]*$ &&
   "$(readlink -f "/proc/$pid/exe")" == "$(readlink -f "$NODE26")" ]] ||
  fail "Running ClubKeep is not using Node26"
echo "CLUBKEEP_NODE24_ROLLBACK_ELIGIBLE sha=$sha"
if [[ "$mode" == --plan ]]; then
  echo 'CLUBKEEP_NODE24_ROLLBACK_PLAN_PASS read_only'
  exit 0
fi

saved="$(mktemp /run/clubkeep-runtime-saved.XXXXXX)"
cp -- "$DROPIN" "$saved"
restored=false
restore_active_on_failure() {
  local status=$?
  trap - ERR
  echo 'CLUBKEEP_NODE24_ROLLBACK_FAILED: attempting original Node26 recovery' >&2
  ln -s "$active" "$BASE/.node26-recover.$$"
  mv -Tf "$BASE/.node26-recover.$$" "$CURRENT"
  install -o root -g root -m 0644 "$saved" "$DROPIN"
  systemctl daemon-reload || true
  systemctl reset-failed clubkeep-web || true
  systemctl restart clubkeep-web || true
  exit "$status"
}
trap 'rm -f -- "$saved"' EXIT
trap restore_active_on_failure ERR
ln -s "$previous" "$BASE/.node24-recover.$$"
mv -Tf "$BASE/.node24-recover.$$" "$CURRENT"
rm -f -- "$DROPIN"
systemctl daemon-reload
systemctl reset-failed clubkeep-web
systemctl restart clubkeep-web
for _ in $(seq 1 40); do
  pid="$(systemctl show clubkeep-web --value --property=MainPID || true)"
  if [[ "$pid" =~ ^[1-9][0-9]*$ ]] &&
     [[ "$(readlink -f "/proc/$pid/exe" 2>/dev/null || true)" == "$(readlink -f "$NODE24")" ]] &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/auth/sign-in &&
     curl -fsS --max-time 3 -o /dev/null http://127.0.0.1:3200/api/auth/capabilities &&
     systemctl is-active --quiet menuminute-web &&
     systemctl is-active --quiet menuminute-worker; then
    restored=true
    break
  fi
  sleep 1
done
[[ "$restored" == true ]] || { echo 'Node24 fallback failed health check' >&2; false; }
trap - ERR
echo "CLUBKEEP_NODE24_ROLLBACK_PASS sha=$sha code_and_runtime_restored"
