#!/usr/bin/env node
// Validate the v2 extracted release independently of build-time dependencies.
import {
  existsSync, lstatSync, readFileSync, readdirSync, realpathSync,
} from "node:fs";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const expectedTop = new Set([".next", "migrate", "RELEASE-SHA", "release-manifest.json"]);
const shaPattern = /^[0-9a-f]{40}$/;
const hashPattern = /^[0-9a-f]{64}$/;
function assert(condition, message) {
  if (!condition) throw new Error("Invalid lean release: " + message);
}

export function verifyRelease(root, expectedSha) {
  const dir = realpathSync(resolve(root));
  assert(shaPattern.test(expectedSha), "invalid expected commit SHA");
  assert(existsSync(join(dir, "release-manifest.json")), "missing manifest");
  const marker = readFileSync(join(dir, "RELEASE-SHA"), "utf8").trim();
  assert(marker === expectedSha, "release marker does not match SHA");
  const metadata = JSON.parse(readFileSync(join(dir, "release-manifest.json"), "utf8"));
  assert(metadata.format === 2 && metadata.application === "clubkeep", "wrong release format");
  assert(metadata.sha === expectedSha, "manifest SHA mismatch");
  assert(metadata.architecture === "linux-arm64", "unexpected architecture");
  assert(metadata.runtime === "node24", "unsupported Node runtime");
  assert(hashPattern.test(metadata.packageLockSha256), "missing exact source lock digest");

  for (const entry of readdirSync(dir)) {
    assert(expectedTop.has(entry), "unexpected top-level entry: " + entry);
  }
  for (const path of [
    ".next/standalone/server.js",
    ".next/standalone/.next/static",
    ".next/standalone/public",
    "migrate/node_modules/prisma/build/index.js",
    "migrate/node_modules/dotenv/package.json",
    "migrate/prisma/schema.prisma",
    "migrate/prisma/migrations/migration_lock.toml",
    "migrate/prisma.config.ts",
    "migrate/kit-manifest.json",
  ]) assert(existsSync(join(dir, path)), "missing " + path);
  assert(!existsSync(join(dir, "node_modules")), "full build-time node_modules leaked");
  assert(!existsSync(join(dir, ".next/cache")), "Next.js build cache leaked");
  assert(!existsSync(join(dir, ".next/standalone/.next/cache")), "standalone build cache leaked");

  const migrationKit = JSON.parse(readFileSync(join(dir, "migrate/kit-manifest.json"), "utf8"));
  assert(migrationKit.format === 2 && migrationKit.packageCount >= 2, "invalid migration kit");
  const pending = [dir];
  while (pending.length) {
    const parent = pending.pop();
    for (const name of readdirSync(parent)) {
      const path = join(parent, name);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const target = realpathSync(path);
        assert(target.startsWith(dir + sep), "external symlink: " + path);
      } else if (stat.isDirectory()) {
        pending.push(path);
      } else {
        assert(stat.isFile(), "unexpected special file: " + path);
      }
    }
  }
  return metadata;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4) {
    console.error("Usage: node infra/deploy/verify-lean-release.mjs <directory> <40-hex-sha>");
    process.exit(2);
  }
  verifyRelease(process.argv[2], process.argv[3]);
  console.log("Verified standalone runtime, isolated migrations and v2 manifest");
}
