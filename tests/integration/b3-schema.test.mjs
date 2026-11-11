import assert from "node:assert/strict";
import test from "node:test";
import {randomUUID} from "node:crypto";
import pg from "pg";

assert.ok(process.env.DATABASE_URL,"Run against a disposable migrated ClubKeep PostgreSQL 17 database");
const {Client}=pg;
async function withTransaction(callback){
  const db=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
  await db.connect();
  try{await db.query("BEGIN");await callback(db);}finally{await db.query("ROLLBACK");await db.end();}
}
async function expectCode(db,sql,params,code){
  await db.query("SAVEPOINT rejected");
  try{await assert.rejects(()=>db.query(sql,params),e=>e.code===code);}finally{await db.query("ROLLBACK TO SAVEPOINT rejected");}
}
test("B3 new clubs require setup, legacy club statuses remain independent and vertical selection is constrained",async()=>{
  await withTransaction(async db=>{
    const s=randomUUID().slice(0,8),club="b3-a-"+s,other="b3-b-"+s;
    await db.query('INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Test Gym\',NOW()),($2,$2,\'Test Yoga\',NOW())',[club,other]);
    const row=(await db.query('SELECT "setupStatus","vertical","status" FROM "Club" WHERE "id"=$1',[club])).rows[0];
    assert.equal(row.setupStatus,"IN_PROGRESS");assert.equal(row.vertical,"OTHER");assert.equal(row.status,"ACTIVE");
    await db.query('UPDATE "Club" SET "vertical"=$2 WHERE "id"=$1',[club,"SPORTS"]);
    assert.equal((await db.query('SELECT "vertical" FROM "Club" WHERE "id"=$1',[club])).rows[0].vertical,"SPORTS");
    await expectCode(db,'UPDATE "Club" SET "vertical"=$2 WHERE "id"=$1',[club,"HOTEL"],"22P02");
    await db.query('INSERT INTO "ClubSetupProgress" ("clubId","currentStep","version","countryCode","currencyCode","operatingMode","updatedAt") VALUES ($1,2,1,\'IN\',\'INR\',\'PHYSICAL\',NOW())',[club]);
    const prog=(await db.query('SELECT "typeConfirmed","detailsConfirmed","identityConfirmed" FROM "ClubSetupProgress" WHERE "clubId"=$1',[club])).rows[0];
    assert.equal(prog.typeConfirmed,false);assert.equal(prog.detailsConfirmed,false);assert.equal(prog.identityConfirmed,false);
    await expectCode(db,'INSERT INTO "ClubSetupProgress" ("clubId","updatedAt") VALUES ($1,NOW())',["missing-"+s],"23503");
  });
});
test("B3 public profiles are tenant-owned and only one pending revision may exist per club",async()=>{
  await withTransaction(async db=>{
    const s=randomUUID().slice(0,8),club="b3-p-"+s,other="b3-o-"+s;
    await db.query('INSERT INTO "Club" ("id","slug","name","updatedAt") VALUES ($1,$1,\'Publisher\',NOW()),($2,$2,\'Other\',NOW())',[club,other]);
    const draft=JSON.stringify({tagline:"Great club",description:"Welcome to the academy",city:"Jaipur",listed:true});
    await db.query('INSERT INTO "ClubPublicProfile" ("clubId","draft","city","updatedAt") VALUES ($1,$2::jsonb,\'Jaipur\',NOW())',[club,draft]);
    await expectCode(db,'INSERT INTO "ClubPublicProfile" ("clubId","updatedAt") VALUES ($1,NOW())',[club],"23505");
    await db.query('INSERT INTO "ClubPublicRevision" ("id","clubId","content") VALUES ($1,$2,$3::jsonb)',["b3-rev-"+s,club,draft]);
    await expectCode(db,'INSERT INTO "ClubPublicRevision" ("id","clubId","content") VALUES ($1,$2,$3::jsonb)',["b3-dup-"+s,club,draft],"23505");
    await expectCode(db,'INSERT INTO "ClubPublicRevision" ("id","clubId","content") VALUES ($1,$2,$3::jsonb)',["b3-orphan-"+s,"missing-"+s,draft],"23503");
    await db.query('UPDATE "ClubPublicRevision" SET "status"=\'APPROVED\' WHERE "id"=$1',["b3-rev-"+s]);
    await db.query('INSERT INTO "ClubPublicRevision" ("id","clubId","content") VALUES ($1,$2,$3::jsonb)',["b3-next-"+s,club,draft]);
    const approvals=(await db.query('SELECT count(*)::int AS count FROM "ClubPublicRevision" WHERE "clubId"=$1',[club])).rows[0].count;
    assert.equal(approvals,2);
  });
});
