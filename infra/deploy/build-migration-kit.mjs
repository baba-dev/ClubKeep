#!/usr/bin/env node
// Build a self-contained migration toolchain from the exact npm ci dependency tree.
// No npm install/resolution on the production VPS, and no second floating lockfile.
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  realpathSync, rmSync, writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(process.cwd());
const ROOT_MODULES = join(REPO, "node_modules");
const REQUIRED = ["prisma", "dotenv"];

function within(path, directory) {
  return path === directory || path.startsWith(directory + sep);
}

function packageFor(requester, name) {
  let directory = requester;
  while (within(directory, REPO)) {
    const candidate = join(directory, "node_modules", name);
    if (existsSync(join(candidate, "package.json"))) {
      const resolved = realpathSync(candidate);
      if (!within(resolved, ROOT_MODULES)) {
        throw new Error("Dependency escapes the installed node_modules tree: " + name);
      }
      return resolved;
    }
    if (directory === REPO) break;
    directory = dirname(directory);
  }
  return null;
}

export function discoverPackages() {
  if (!existsSync(ROOT_MODULES)) throw new Error("Run npm ci before building migration kit");
  const packages = new Map();
  const pending = REQUIRED.map((name) => ({ name, requester: REPO, optional: false }));

  while (pending.length) {
    const { name, requester, optional } = pending.pop();
    const directory = packageFor(requester, name);
    if (!directory) {
      if (optional) continue;
      throw new Error("Missing locked Prisma migration dependency: " + name);
    }
    const relativePath = relative(REPO, directory);
    if (!relativePath.startsWith("node_modules" + sep)) {
      throw new Error("Unexpected package location: " + relativePath);
    }
    if (packages.has(relativePath)) continue;
    const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
    packages.set(relativePath, { directory, name: manifest.name, version: manifest.version });
    for (const dependency of Object.keys(manifest.dependencies ?? {}).sort()) {
      pending.push({ name: dependency, requester: directory, optional: false });
    }
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {}).sort()) {
      pending.push({ name: dependency, requester: directory, optional: true });
    }
  }
  return [...packages.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function validateLocalLinks(root) {
  const pending = [root];
  while (pending.length) {
    const directory = pending.pop();
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const target = realpathSync(path);
        if (!within(target, root)) {
          throw new Error("Migration kit contains an external symlink: " + path);
        }
      } else if (stat.isDirectory()) {
        pending.push(path);
      } else if (!stat.isFile()) {
        throw new Error("Unsupported file type in migration kit: " + path);
      }
    }
  }
}

export function buildMigrationKit(destination) {
  const output = resolve(destination);
  if (!isAbsolute(output) || within(output, REPO) && within(REPO, output)) {
    throw new Error("Invalid migration kit output");
  }
  if (existsSync(output)) throw new Error("Refusing to overwrite existing kit: " + output);
  const lock = JSON.parse(readFileSync(join(REPO, "package-lock.json"), "utf8"));
  const packages = discoverPackages();
  for (const name of REQUIRED) {
    const entry = packages.find(([, meta]) => meta.name === name);
    if (!entry) throw new Error("Missing required migration package: " + name);
    const locked = lock.packages[entry[0]];
    if (!locked || locked.version !== entry[1].version) {
      throw new Error("Migration dependency diverges from package-lock.json: " + name);
    }
  }

  mkdirSync(output, { recursive: false });
  try {
    cpSync(join(REPO, "prisma"), join(output, "prisma"), { recursive: true });
    cpSync(join(REPO, "prisma.config.ts"), join(output, "prisma.config.ts"));
    writeFileSync(join(output, "package.json"), JSON.stringify({
      name: "clubkeep-migration-kit", private: true, version: "2.0.0",
      type: "module",
    }, null, 2) + "\n");

    for (const [path, meta] of packages) {
      const target = join(output, path);
      mkdirSync(dirname(target), { recursive: true });
      cpSync(meta.directory, target, { recursive: true });
    }
    if (!existsSync(join(output, "node_modules/prisma/build/index.js"))) {
      throw new Error("Prisma CLI entrypoint not found in migration kit");
    }
    validateLocalLinks(output);
    writeFileSync(join(output, "kit-manifest.json"), JSON.stringify({
      format: 2, packageCount: packages.length,
      packages: packages.map(([path, meta]) => ({ path, name: meta.name, version: meta.version })),
    }, null, 2) + "\n");
    console.log("Migration kit: " + packages.length + " locked packages");
  } catch (error) {
    rmSync(output, { force: true, recursive: true });
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) {
    console.error("Usage: node infra/deploy/build-migration-kit.mjs <new-output-directory>");
    process.exit(2);
  }
  buildMigrationKit(process.argv[2]);
}
