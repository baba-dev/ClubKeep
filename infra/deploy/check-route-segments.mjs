#!/usr/bin/env node
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Next.js resolves sibling dynamic directories to the same URL slot.
 * Distinct names in that slot can pass a production build but crash the
 * standalone server at runtime. Fail CI before creating a release.
 */
export function assertConsistentRouteParams(root) {
  const pending = [root];
  while (pending.length > 0) {
    const directory = pending.pop();
    const children = readdirSync(directory, { withFileTypes: true }).filter((item) =>
      item.isDirectory()
    );
    const params = children.filter((item) => /^\[{1,2}.*\]$/.test(item.name));
    if (new Set(params.map((item) => item.name)).size > 1) {
      const names = params.map((item) => item.name).sort().join(", ");
      throw new Error(`Conflicting dynamic Next.js URL segments in ${directory}: ${names}`);
    }
    for (const item of children) pending.push(join(directory, item.name));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    assertConsistentRouteParams(resolve(process.cwd(), "src/app"));
    console.log("Next.js route segment names are consistent");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
