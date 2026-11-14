import test from "node:test";
import assert from "node:assert/strict";
import { parseDemoSeedTarget,parseDemoSeedPasswords } from "../../prisma/seed-demo-guards.mjs";

const safe={ CLUBKEEP_DEMO_SANDBOX:"true", DATABASE_URL:"postgresql://ci:synthetic@127.0.0.1:5432/clubkeep_demo_ci",BETTER_AUTH_URL:"https://demo.clubkeep.invalid",NODE_ENV:"production" };
test("demo seed is refused on production DB, untrusted origin, unapproved target and missing flag",()=>{
  assert.equal(parseDemoSeedTarget(["--expect-db","clubkeep_demo_ci"],safe),"clubkeep_demo_ci");
  assert.throws(()=>parseDemoSeedTarget(["--expect-db","clubkeep"],safe),/--expect-db/);
  assert.throws(()=>parseDemoSeedTarget(["--expect-db","clubkeep_demo_ci"],{...safe,DATABASE_URL:"postgresql://ci:synthetic@127.0.0.1:5432/clubkeep"}),/Database URL/);
  assert.throws(()=>parseDemoSeedTarget(["--expect-db","clubkeep_demo_ci"],{...safe,CLUBKEEP_DEMO_SANDBOX:"false"}),/mandatory/);
  assert.throws(()=>parseDemoSeedTarget(["--expect-db","clubkeep_demo_ci"],{...safe,BETTER_AUTH_URL:"https://clubkeep.bababuilds.com"}),/non-demo/);
});
test("demo seed requires distinct passwords without accepting command-line secrets",()=>{
  const vals={owner:"synthetic-owner-password",member:"synthetic-member-password",manager:"synthetic-manager-password",staff:"synthetic-staff-password"};
  assert.deepEqual(parseDemoSeedPasswords(JSON.stringify(vals),["owner","member","manager","staff"]),vals);
  assert.throws(()=>parseDemoSeedPasswords(JSON.stringify({...vals,staff:vals.owner}),["owner","member","manager","staff"]),/independent/);
  assert.throws(()=>parseDemoSeedPasswords(JSON.stringify({...vals,staff:"123"}),["owner","member","manager","staff"]),/12/);
});
