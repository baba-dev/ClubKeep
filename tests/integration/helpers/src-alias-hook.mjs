// Node loader hook so integration tests can import real src/*.ts modules:
// resolves the "@/" alias and the extensionless relative imports in the
// generated Prisma client. Test-only; the app build does its own resolution.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../../../src/", import.meta.url));
const CANDIDATES = [".ts", ".tsx", "/index.ts", ""];

function firstExisting(base) {
  return CANDIDATES.map((ext) => base + ext).find(
    (path) => existsSync(path) && !path.endsWith("/") && /\.\w+$/.test(path)
  );
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const hit = firstExisting(SRC + specifier.slice(2));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  } else if (
    specifier.startsWith(".") &&
    context.parentURL?.startsWith(pathToFileURL(SRC).href) &&
    !/\.\w+$/.test(specifier)
  ) {
    const hit = firstExisting(fileURLToPath(new URL(specifier, context.parentURL)));
    if (hit) return nextResolve(pathToFileURL(hit).href, context);
  }
  return nextResolve(specifier, context);
}
