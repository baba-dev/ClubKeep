#!/usr/bin/env bash
# Exercise the exact tarball in a new directory, not the CI workspace.
# Synthetic CI credentials only. Production secrets must never be used here.
set -Eeuo pipefail
[[ "$#" -eq 2 ]] || { echo "Usage: smoke-lean-release <archive> <sha>" >&2; exit 2; }
archive="$(realpath -e "$1")"
sha="$2"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
sha256sum --check --strict "$archive.sha256"
scratch="$(mktemp -d)"
pid=""
cleanup() {
  if [[ -n "$pid" ]]; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
  fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
tar --extract --gzip --file "$archive" --directory "$scratch" --no-same-owner
node infra/deploy/verify-lean-release.mjs "$scratch" "$sha"
[[ ! -e "$scratch/node_modules" ]] || { echo "Unnecessary full node_modules in archive" >&2; exit 1; }

(
  cd "$scratch/migrate"
  env -u NODE_PATH node node_modules/prisma/build/index.js --version
  env -u NODE_PATH node node_modules/prisma/build/index.js validate
) || { echo "Isolated Prisma CLI failed without workspace dependencies" >&2; exit 1; }

port=43219
if printenv CLUBKEEP_LEAN_SMOKE_PORT >/dev/null; then
  port="$(printenv CLUBKEEP_LEAN_SMOKE_PORT)"
fi
[[ "$port" =~ ^[0-9]{4,5}$ ]] || exit 2
logs="$scratch/standalone.log"
(
  cd "$scratch/.next/standalone"
  env -u NODE_PATH HOSTNAME=127.0.0.1 PORT="$port" NODE_ENV=production node server.js
) >"$logs" 2>&1 &
pid="$!"

ready=0
for _ in $(seq 1 40); do
  kill -0 "$pid" 2>/dev/null || break
  if curl --fail --silent --show-error --max-time 2 -o /dev/null "http://127.0.0.1:$port/auth/sign-in" 2>/dev/null &&
     curl --fail --silent --show-error --max-time 2 -o /dev/null "http://127.0.0.1:$port/api/auth/capabilities" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo "Extracted lean standalone smoke failed:" >&2
  tail -n 60 "$logs" >&2
  exit 1
fi
kill -0 "$pid" || exit 1
echo "Lean archive: standalone server and isolated Prisma CLI passed"
