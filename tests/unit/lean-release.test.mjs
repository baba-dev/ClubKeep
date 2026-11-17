import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import test from "node:test";
import { verifyRelease } from "../../infra/deploy/verify-lean-release.mjs";

const SHA = "a".repeat(40);
function fixture(fn) {
  const root = mkdtempSync(join(tmpdir(), "clubkeep-v2-test-"));
  function put(path, contents = "fixture") {
    const target = join(root, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
  }
  try {
    put("RELEASE-SHA", SHA + "\n");
    put(
      "release-manifest.json",
      JSON.stringify({
        format: 2,
        application: "clubkeep",
        sha: SHA,
        architecture: "linux-arm64",
        runtime: "node24",
        packageLockSha256: "b".repeat(64),
      })
    );
    put(".next/standalone/server.js");
    put(".next/standalone/.next/static/build.js");
    put(".next/standalone/public/index.txt");
    put("migrate/node_modules/prisma/build/index.js");
    put("migrate/node_modules/dotenv/package.json", "{}");
    put("migrate/prisma/schema.prisma");
    put("migrate/prisma/migrations/migration_lock.toml");
    put("migrate/prisma.config.ts");
    put("migrate/kit-manifest.json", JSON.stringify({ format: 2, packageCount: 2 }));
    return fn(root, put);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("valid isolated release passes strict format and runtime checks", () => {
  fixture((root) => {
    assert.equal(verifyRelease(root, SHA).format, 2);
  });
});

test("manifest commit mismatch fails closed", () => {
  fixture((root) => {
    assert.throws(() => verifyRelease(root, "c".repeat(40)), /release marker/);
  });
});

test("unexpected root build-time dependencies are rejected", () => {
  fixture((root, put) => {
    put("node_modules/next/package.json", "{}");
    assert.throws(() => verifyRelease(root, SHA), /unexpected top-level entry/);
  });
});

test("unexpected content and build cache are rejected", () => {
  fixture((root, put) => {
    put(".next/cache/webpack/test.pack");
    assert.throws(() => verifyRelease(root, SHA), /build cache leaked/);
  });
});

test("external symlinks are rejected", () => {
  fixture((root) => {
    symlinkSync("/etc/passwd", join(root, ".next/standalone/external-link"));
    assert.throws(() => verifyRelease(root, SHA), /external symlink/);
  });
});

test("altered architecture and malformed digest are rejected", () => {
  fixture((root, put) => {
    put(
      "release-manifest.json",
      JSON.stringify({
        format: 2,
        application: "clubkeep",
        sha: SHA,
        architecture: "linux-amd64",
        runtime: "node24",
        packageLockSha256: "not-a-sha",
      })
    );
    assert.throws(() => verifyRelease(root, SHA), /unexpected architecture/);
  });
});


test("Node26.13.1 format-3 release passes strict lean validation", () => {
  fixture((root, put) => {
    put(
      "release-manifest.json",
      JSON.stringify({
        format: 3,
        application: "clubkeep",
        sha: SHA,
        architecture: "linux-arm64",
        runtime: "node26",
        nodeVersion: "26.13.1",
        packageLockSha256: "b".repeat(64),
      })
    );
    assert.equal(verifyRelease(root, SHA).format, 3);
  });
});

test("Node26 format-3 releases reject drifting or unpinned runtimes", () => {
  fixture((root, put) => {
    for (const nodeVersion of ["26", "26.13.0", "26.14.0", null]) {
      put(
        "release-manifest.json",
        JSON.stringify({
          format: 3,
          application: "clubkeep",
          sha: SHA,
          architecture: "linux-arm64",
          runtime: "node26",
          nodeVersion,
          packageLockSha256: "b".repeat(64),
        })
      );
      assert.throws(() => verifyRelease(root, SHA), /unsupported Node runtime/);
    }
  });
});

test("format-2 Node24 rollback remains accepted but format-3 cannot masquerade as Node24", () => {
  fixture((root, put) => {
    assert.equal(verifyRelease(root, SHA).runtime, "node24");
    put(
      "release-manifest.json",
      JSON.stringify({
        format: 3,
        application: "clubkeep",
        sha: SHA,
        architecture: "linux-arm64",
        runtime: "node24",
        packageLockSha256: "b".repeat(64),
      })
    );
    assert.throws(() => verifyRelease(root, SHA), /unsupported Node runtime/);
  });
});
