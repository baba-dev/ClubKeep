import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const repo = process.cwd();
const file = (path) => readFileSync(join(repo, path), "utf8");

test("Node 26.13.1 and npm11 are pinned in source and lockfile", () => {
  const manifest = JSON.parse(file("package.json"));
  const lockfile = JSON.parse(file("package-lock.json"));
  assert.equal(file(".nvmrc").trim(), "26.13.1");
  assert.equal(manifest.engines.node, ">=26.13.1 <27");
  assert.equal(manifest.engines.npm, ">=11.20.0 <12");
  assert.deepEqual(lockfile.packages[""].engines, manifest.engines);
  assert.equal(manifest.dependencies.next, "16.4.5");
});

test("ARM64 packaged runtime is exactly Node26 and requires the same major in verifier", () => {
  const packager = file("infra/deploy/package-release.sh");
  const verifier = file("infra/deploy/verify-lean-release.mjs");
  assert.match(packager, /Pinned Node\.js 26\.13\.1 required/);
  assert.match(packager, /format: 3/);
  assert.match(packager, /runtime: "node26"/);
  assert.match(packager, /nodeVersion: "26\.13\.1"/);
  assert.match(verifier, /metadata\.format === 2/);
  assert.match(verifier, /metadata\.runtime === "node24"/);
  assert.match(verifier, /metadata\.nodeVersion === "26\.13\.1"/);
  assert.match(verifier, /external symlink/);
});

test("root helper supports both old v2 and new v3 without cross-app systemd modifications", () => {
  const helper = file("infra/deploy/clubkeep-release.sh");
  assert.match(helper, /clubkeep-release-formats: 1,2,3/);
  assert.match(helper, /--node26-ready/);
  assert.match(helper, /NODE26_SHA256=de21e5b6e081aa16f86413aeba8c77fac44670cb6fe2748cc7c00329e6e6aa3a/);
  assert.match(helper, /candidate_runtime=node24/);
  assert.match(helper, /nodeVersion === "26\.13\.1"/);
  assert.match(helper, /Node runtime transition cannot include database schema migrations/);
  assert.match(helper, /CLUBKEEP_RUNTIME_ROLLBACK_PASS/);
  assert.match(helper, /trap restore_previous_on_failure ERR/);
  assert.match(helper, /runtime_process_ok/);
  assert.match(helper, /50-bababuilds-node-runtime\.conf/);
  assert.doesNotMatch(helper, /systemctl restart menuminute/);
  assert.doesNotMatch(helper, /systemctl restart bababuilds-erp/);
});

test("retention protects exact root-only Node24 rollback release", () => {
  const retention = file("infra/deploy/clubkeep-cleanup.sh");
  const helper = file("infra/deploy/clubkeep-release.sh");
  const rollback = file("infra/deploy/clubkeep-node24-rollback.sh");
  assert.match(helper, /node24-release-sha/);
  assert.match(retention, /NODE24_ROLLBACK_PIN/);
  assert.match(retention, /"root:600"/);
  assert.match(retention, /"\$path" != "\$protected_rollback"/);
  assert.match(rollback, /--plan/);
  assert.match(rollback, /--apply/);
  assert.match(rollback, /Schema changed; code rollback is unsafe/);
  assert.match(rollback, /CLUBKEEP_NODE24_ROLLBACK_PASS/);
  assert.doesNotMatch(rollback, /DROP DATABASE|prisma migrate deploy/);
});

test("production deployment fails before upload unless installed v3 helper and runtime verify", () => {
  const deploy = file(".github/workflows/deploy-vps.yml");
  const ci = file(".github/workflows/ci.yml");
  assert.match(deploy, /clubkeep-release-formats: 1,2,3/);
  assert.match(deploy, /sudo -n \/usr\/local\/sbin\/clubkeep-release --node26-ready/);
  assert.match(deploy, /Node 26\.13\.1 on ARM64/);
  assert.match(deploy, /node -p 'process\.versions\.node'/);
  assert.match(ci, /Set up Node 26\.13\.1/g);
  assert.match(ci, /bash -n infra\/deploy\/clubkeep-node24-rollback\.sh/);
});
