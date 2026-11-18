import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const script = readFileSync("infra/billing/clubkeep-billing-ops.sh", "utf8");
const service = readFileSync("infra/billing/clubkeep-billing-reconcile.service", "utf8");
const timer = readFileSync("infra/billing/clubkeep-billing-reconcile.timer", "utf8");

test("the ops script is strict, root-only and dry-run by default", () => {
  assert.match(script, /^#!\/usr\/bin\/env bash/);
  assert.match(script, /set -Eeuo pipefail/);
  assert.match(script, /\(\( EUID == 0 \)\)/);
  assert.match(script, /finish="ROLLBACK"/, "default mode rolls back");
  assert.match(script, /finish="COMMIT"/);
  assert.match(script, /\^clubkeep\(_\[a-z0-9_\]\+\)\?\$/, "database name must be ClubKeep-scoped");
});

test("the ops script never evals input, takes no secrets, and never deletes", () => {
  assert.doesNotMatch(script, /\beval\b/);
  assert.doesNotMatch(script, /DATABASE_URL|PASSWORD|SECRET|TOKEN/i);
  assert.doesNotMatch(script, /\bDELETE\s+FROM\b|\bDROP\b|\bTRUNCATE\b/i);
  assert.doesNotMatch(script, /--force|--no-verify/);
});

test("user values reach SQL only as psql-quoted variables", () => {
  for (const name of ["club", "tier", "ref"]) assert.match(script, new RegExp(`:'${name}'`));
  // Nothing from the command line is interpolated into the SQL text itself.
  assert.doesNotMatch(script, /\$\{?(club|tier|reason)\}?[^"']*\n[^\n]*FROM "Club"/);
});

test("time comparisons use UTC because stored timestamps carry no zone", () => {
  const nowUses = script.match(/NOW\(\)/g) ?? [];
  const utcUses = script.match(/NOW\(\) AT TIME ZONE 'UTC'/g) ?? [];
  assert.equal(nowUses.length, utcUses.length, "every NOW() is converted to UTC");
});

test("the reconcile units run the installed script, apply changes, and stay opt-in", () => {
  assert.match(
    service,
    /^ExecStart=\/usr\/local\/sbin\/clubkeep-billing-ops reconcile --execute$/m
  );
  assert.match(service, /^User=root$/m);
  assert.match(service, /^NoNewPrivileges=yes$/m);
  assert.match(timer, /^Unit=clubkeep-billing-reconcile\.service$/m);
  assert.match(timer, /^OnCalendar=/m);
  // Installing the units is a deliberate operator step; nothing enables them from the repo.
  assert.doesNotMatch(
    readFileSync("infra/deploy/clubkeep-release.sh", "utf8"),
    /billing-reconcile/
  );
});
