#!/usr/bin/env bash
# Package the exact successfully-built GitHub-hosted ARM64 Next.js release.
set -Eeuo pipefail
sha="${1:?Full commit SHA required}"
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 1
test "$(git rev-parse HEAD)" = "$sha"
test "$(node -p 'process.arch')" = "arm64"
test -s .next/standalone/server.js
test -d .next/static
test -d public
test -x node_modules/.bin/prisma
mkdir -p .next/standalone/public .next/standalone/.next
cp -a public/. .next/standalone/public/
cp -a .next/static .next/standalone/.next/static
printf '%s\n' "$sha" > RELEASE-SHA
archive="clubkeep-$sha-linux-arm64.tar.gz"
tar -cf - \
  ./RELEASE-SHA ./package.json ./package-lock.json \
  ./prisma ./prisma.config.ts ./node_modules ./next.config.ts \
  ./.next/standalone | gzip -1 > "$archive"
test -s "$archive"
sha256sum "$archive" > "$archive.sha256"
sha256sum --check --strict "$archive.sha256"
test "$(tar -xOzf "$archive" ./RELEASE-SHA)" = "$sha"
echo "Packaged pinned ARM64 release $sha"
