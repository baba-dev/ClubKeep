#!/usr/bin/env node
// Report repeatable release-size baselines without exposing source, secrets or user data.
import { existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function bytesOnDisk(path) {
  if (!existsSync(path)) return 0;
  const output = execFileSync("du", ["-sk", "--", path], { encoding: "utf8" });
  return Number(output.trim().split(/\s+/)[0]) * 1024;
}

export function reportReleaseSizes(root, archive) {
  const locations = {
    buildDependencies: resolve(root, "node_modules"),
    standalone: resolve(root, ".next/standalone"),
    staticAssets: resolve(root, ".next/static"),
    migrationKit: resolve(root, "migrate"),
    releaseDirectory: resolve(root),
  };
  const sizes = Object.fromEntries(
    Object.entries(locations).map(([name, path]) => [name, bytesOnDisk(path)]),
  );
  if (archive && existsSync(archive)) {
    sizes.compressedArchive = statSync(archive).size;
  }
  return sizes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(process.argv[2] ?? ".");
  const archive = process.argv[3] ? resolve(process.argv[3]) : undefined;
  const sizes = reportReleaseSizes(root, archive);
  console.log(JSON.stringify(sizes, null, 2));
  for (const [key, bytes] of Object.entries(sizes)) {
    console.log(`${key}: ${(bytes / 1048576).toFixed(1)} MiB`);
  }
}
