#!/usr/bin/env node
/**
 * DEMO-ONLY offline bootstrap. Never runs inside public HTTP routes.
 * Requires a distinct, empty database named clubkeep_demo or clubkeep_demo_ci.
 * Four independent passwords are piped over stdin; never argv, env or stdout.
 */
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { hashPassword } from "better-auth/crypto";
import { parseDemoSeedTarget, parseDemoSeedPasswords } from "./seed-demo-guards.mjs";

const emails = [
  "review-owner@demo.clubkeep.invalid",
  "review-member@demo.clubkeep.invalid",
  "review-manager@demo.clubkeep.invalid",
  "review-staff@demo.clubkeep.invalid",
];
const names = ["Apex Owner", "Apex Member", "Apex Manager", "Apex Reception"];
const roles = ["owner", "member", "manager", "staff"];

async function readStdin() {
  if (process.stdin.isTTY) throw new Error("Use a silent protected password prompt piped through stdin");
  let text = "";
  for await (const chunk of process.stdin) {
    text += chunk.toString("utf8");
    if (text.length > 4096) throw new Error("Credential input too large");
  }
  return parseDemoSeedPasswords(text, roles);
}
async function seed(dbUrl, target, passphrases) {
  const db = new Client({ connectionString: dbUrl, application_name: "clubkeep-sandbox-seed" });
  let opened = false;
  try {
    await db.connect();
    const check = await db.query("SELECT current_database() AS db");
    if (check.rows[0]?.db !== target) throw new Error("Refusing to seed any database except the explicit demo target");
    const existing = await db.query('SELECT (SELECT COUNT(*) FROM "user")::int AS users, (SELECT COUNT(*) FROM "Club")::int AS clubs');
    if (existing.rows[0].users !== 0 || existing.rows[0].clubs !== 0)
      throw new Error("Demo DB is not empty; do not overwrite a shared or previously used database");
    const hashes = await Promise.all(roles.map(r => hashPassword(passphrases[r])));
    await db.query("BEGIN"); opened = true;
    // Defend against concurrent first-run provisioners.
    await db.query("SELECT pg_advisory_xact_lock(91344501)");
    const count = await db.query('SELECT (SELECT COUNT(*) FROM "user")::int AS users, (SELECT COUNT(*) FROM "Club")::int AS clubs');
    if (count.rows[0].users || count.rows[0].clubs) throw new Error("Demo already initialized");
    const ids = Object.fromEntries(roles.map(r => [r, randomUUID()]));
    for (let i=0; i<roles.length; i++) {
      const r = roles[i],id = ids[r];
      await db.query('INSERT INTO "user" ("id","name","email","emailVerified","platformRole","createdAt","updatedAt") VALUES ($1,$2,$3,true,$4,NOW(),NOW())',[
        id,names[i],emails[i],r==="owner"?"PLATFORM_ADMIN":"USER",
      ]);
      await db.query('INSERT INTO "account" ("id","accountId","providerId","userId","password","createdAt","updatedAt") VALUES ($1,$2,\'credential\',$2,$3,NOW(),NOW())',[
        randomUUID(),id,hashes[i],
      ]);
      await db.query('INSERT INTO "PersonalProfile" ("userId","updatedAt") VALUES ($1,NOW())',[id]);
    }
    // Different clubs for owner/member perspectives: both reviewer accounts
    // receive real, correctly scoped owner AND linked member access.
    const clubs = [
      {id:randomUUID(),name:"Ironworks Athletic Club",slug:"ironworks-sandbox-fixture"},
      {id:randomUUID(),name:"Summit Training Academy",slug:"summit-sandbox-fixture"},
    ];
    const memberships = new Map();
    const roster = new Map();
    const activeMonth = new Date();
    const seasonStart = new Date(Date.UTC(activeMonth.getUTCFullYear(),activeMonth.getUTCMonth(),1));
    const seasonEnd = new Date(seasonStart);
    seasonEnd.setUTCMonth(seasonEnd.getUTCMonth()+3);
    const termStart = new Date(Date.now()-14*86400000);
    const termEnd = new Date(Date.now()+75*86400000);
    for (let idx=0;idx<clubs.length;idx++) {
      const club=clubs[idx];
      await db.query('INSERT INTO "Club" ("id","slug","name","status","businessTier","vertical","setupStatus","timeZone","memberSequence","receiptSequence","updatedAt") VALUES ($1,$2,$3,\'ACTIVE\',\'PRO\',\'GYM\',\'READY\',\'Asia/Kolkata\',7,2,NOW())',[club.id,club.slug,club.name]);
      await db.query('INSERT INTO "ClubSetupProgress" ("clubId","currentStep","version","typeConfirmed","detailsConfirmed","identityConfirmed","countryCode","currencyCode","operatingMode","city","updatedAt") VALUES ($1,4,1,true,true,true,\'IN\',\'INR\',\'PHYSICAL\',\'Bengaluru\',NOW())',[club.id]);
      const clubRoles=idx===0?{owner:"OWNER",member:"MEMBER",manager:"MANAGER",staff:"STAFF"}:{owner:"MEMBER",member:"OWNER",manager:"MANAGER",staff:"STAFF"};
      for(const r of roles) {
        const id=randomUUID();
        memberships.set(club.id+":"+r,id);
        await db.query('INSERT INTO "ClubMembership" ("id","clubId","userId","role","status","joinedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,\'ACTIVE\',NOW(),NOW(),NOW())',[
          id,club.id,ids[r],clubRoles[r],
        ]);
      }
      const athlete=idx===0?"member":"owner";
      const recordId=randomUUID();
      roster.set(club.id,recordId);
      await db.query('INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","membershipId","joinedAt","createdAt","updatedAt") VALUES ($1,$2,1,$3,$4,NOW(),NOW(),NOW())',[
        recordId,club.id,idx===0?"Apex Member":"Apex Owner",memberships.get(club.id+":"+athlete),
      ]);
      for(let n=2;n<=7;n++){
        await db.query('INSERT INTO "ClubMemberRecord" ("id","clubId","memberNumber","displayName","joinedAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,NOW(),NOW(),NOW())',[
          randomUUID(),club.id,n,["Fictional","Athlete","Demo","Runner","Participant","Student"][n-2]+" "+n,
        ]);
      }
      const planId=randomUUID(),termId=randomUUID(),seasonId=randomUUID(),metricId=randomUUID(),scoreId=randomUUID();
      await db.query('INSERT INTO "ClubPlan" ("id","clubId","name","durationUnit","durationCount","priceMinor","currency","createdAt","updatedAt") VALUES ($1,$2,\'Strength Pro\',\'MONTHS\',3,300000,\'INR\',NOW(),NOW())',[
        planId,club.id,
      ]);
      await db.query('INSERT INTO "MemberSubscription" ("id","clubId","memberRecordId","planId","planName","priceMinor","currency","startAt","endAt","operationKey","createdByUserId") VALUES ($1,$2,$3,$4,\'Strength Pro\',300000,\'INR\',$5,$6,$7,$8)',[
        termId,club.id,recordId,planId,termStart,termEnd,randomUUID(),ids[idx===0?"owner":"member"],
      ]);
      await db.query('INSERT INTO "ClubPayment" ("id","clubId","memberRecordId","subscriptionId","receiptNo","operationKey","amountMinor","currency","method","recordedByUserId","clubName","memberName","memberNumber","planName","termPriceMinor","termStartsAt","termEndsAt") VALUES ($1,$2,$3,$4,1,$5,150000,\'INR\',\'UPI\',$6,$7,$8,1,\'Strength Pro\',300000,$9,$10)',[
        randomUUID(),club.id,recordId,termId,randomUUID(),ids[idx===0?"owner":"member"],club.name,idx===0?"Apex Member":"Apex Owner",termStart,termEnd,
      ]);
      for(let d=1;d<=5;d++){
        const visit=new Date(Date.now()-d*86400000);
        const day= new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(visit);
        await db.query('INSERT INTO "ClubAttendance" ("id","clubId","memberRecordId","localDate","checkedInAt","method","checkedInByUserId") VALUES ($1,$2,$3,$4,$5,\'MANUAL\',$6)',[
          randomUUID(),club.id,recordId,day,visit,ids.staff,
        ]);
      }
      await db.query('INSERT INTO "ClubSeason" ("id","clubId","name","startAt","endAt","createdByUserId") VALUES ($1,$2,\'Apex Performance Season\',$3,$4,$5)',[
        seasonId,club.id,seasonStart,seasonEnd,ids[idx===0?"owner":"member"],
      ]);
      await db.query('INSERT INTO "ClubSeasonMetric" ("id","clubId","seasonId","metric") VALUES ($1,$2,$3,\'GYM_STRENGTH_KG\')',[
        metricId,club.id,seasonId,
      ]);
      await db.query('INSERT INTO "ClubRankingConsent" ("clubId","memberRecordId","enabled","consentedAt","changedByUserId","updatedAt") VALUES ($1,$2,true,NOW(),$3,NOW())',[
        club.id,recordId,ids[athlete],
      ]);
      const reviewedAt=new Date();
      await db.query('INSERT INTO "ClubScore" ("id","clubId","seasonMetricId","memberRecordId","value","operationKey","status","submittedAt","submittedByUserId","decidedAt","decidedByUserId") VALUES ($1,$2,$3,$4,115,$5,\'APPROVED\',NOW(),$6,$7,$8)',[
        scoreId,club.id,metricId,recordId,randomUUID(),ids[athlete],reviewedAt,ids.manager,
      ]);
      await db.query('INSERT INTO "ClubLeaderboardBest" ("clubId","seasonMetricId","memberRecordId","scoreId","value","approvedAt") VALUES ($1,$2,$3,$4,115,$5)',[
        club.id,metricId,recordId,scoreId,reviewedAt,
      ]);
      const challengeId=randomUUID();
      await db.query('INSERT INTO "ClubChallenge" ("id","clubId","seasonId","title","kind","target","startAt","endAt","createdByUserId") VALUES ($1,$2,$3,\'Five sessions of progress\',\'ATTENDANCE\',5,$4,$5,$6)',[
        challengeId,club.id,seasonId,seasonStart,seasonEnd,ids[idx===0?"owner":"member"],
      ]);
      await db.query('INSERT INTO "ClubChallengeEntry" ("clubId","challengeId","memberRecordId","active","joinedAt","updatedAt") VALUES ($1,$2,$3,true,NOW(),NOW())',[
        club.id,challengeId,recordId,
      ]);
      await db.query('INSERT INTO "ClubPublicProfile" ("clubId","draft","city","status","updatedAt") VALUES ($1,$2::jsonb,\'Bengaluru\',\'HIDDEN\',NOW())',[club.id,JSON.stringify({name:club.name,city:"Bengaluru"})]);
    }
    const [clubA] = clubs;
    await db.query('INSERT INTO "MemberRenewalRequest" ("id","clubId","memberRecordId","requestedByUserId","operationKey","status","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,\'PENDING\',NOW(),NOW())',[
      randomUUID(),clubA.id,roster.get(clubA.id),ids.member,randomUUID(),
    ]);
    await db.query("COMMIT");opened=false;
    return { clubs: clubs.map(c=>c.name), emails };
  } catch(e){
    if(opened) await db.query("ROLLBACK").catch(()=>{});
    throw e;
  } finally { await db.end().catch(()=>{}); }
}
async function main() {
  try {
    const target=parseDemoSeedTarget(process.argv.slice(2),process.env);
    const passwords=await readStdin();
    const result=await seed(process.env.DATABASE_URL,target,passwords);
    console.log("Demo sandbox seeded with fictional ClubKeep records.");
    console.log("Club names:",result.clubs.join(", "));
    console.log("Reviewer logins:",result.emails.join(", "));
    console.log("Passwords were not logged. No changes were made outside this isolated database.");
  } catch(e) {
    console.error("Demo sandbox seeding refused:",e instanceof Error?e.message:"Unknown error");
    process.exitCode=1;
  }
}
if (process.argv[1] && import.meta.url === new URL("file://"+process.argv[1]).href) await main();
