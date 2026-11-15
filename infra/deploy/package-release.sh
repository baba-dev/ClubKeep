#!/usr/bin/env bash
# Package only the traced Next.js runtime and a pinned, isolated Prisma toolchain.
set -Eeuo pipefail
[[ "$#" -eq 1 ]] || { echo "Full commit SHA required" >&2; exit 2; }
sha="$1"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
[[ "$(git rev-parse HEAD)" == "$sha" ]] || { echo "Source SHA mismatch" >&2; exit 1; }
[[ "$(node -p 'process.arch')" == arm64 ]] || { echo "ARM64 build required" >&2; exit 1; }
[[ -s .next/standalone/server.js && -d .next/static && -d public ]] || exit 1
[[ -f prisma/migrations/migration_lock.toml && -x node_modules/.bin/prisma ]] || exit 1

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/.next/standalone/.next"
cp -a .next/standalone/. "$stage/.next/standalone/"
cp -a public "$stage/.next/standalone/public"
cp -a .next/static "$stage/.next/standalone/.next/static"
node infra/deploy/build-migration-kit.mjs "$stage/migrate"

printf '%s\n' "$sha" > "$stage/RELEASE-SHA"
lock_sha="$(sha256sum package-lock.json | cut -d' ' -f1)"
node - "$sha" "$lock_sha" "$stage/release-manifest.json" <<'NODE'
const fs = require("node:fs");
const [, , commit, lockSha, output] = process.argv;
fs.writeFileSync(output, JSON.stringify({
  format: 2,
  application: "clubkeep",
  sha: commit,
  architecture: "linux-arm64",
  runtime: "node24",
  packageLockSha256: lockSha,
}, null, 2) + "\n");
NODE

node infra/deploy/verify-lean-release.mjs "$stage" "$sha"
archive="clubkeep-$sha-linux-arm64.tar.gz"
test ! -e "$archive" || { echo "Archive already exists; refusing overwrite" >&2; exit 1; }
tar -C "$stage" -cf - ./RELEASE-SHA ./release-manifest.json ./migrate ./.next/standalone |
  gzip -1 > "$archive"
test -s "$archive"
sha256sum "$archive" > "$archive.sha256"
sha256sum --check --strict "$archive.sha256"
test "$(tar -xOzf "$archive" ./RELEASE-SHA)" = "$sha"
node infra/deploy/measure-release.mjs "$stage" "$archive"
echo "Packaged verified ClubKeep lean release v2 $sha"
