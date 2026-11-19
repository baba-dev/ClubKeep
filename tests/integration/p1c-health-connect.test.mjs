import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { register } from "node:module";
import pg from "pg";
assert.ok(process.env.DATABASE_URL, "Use disposable migrated PostgreSQL 17");
register("./helpers/src-alias-hook.mjs", import.meta.url);
process.env.PERSONAL_WELLNESS_ENABLED = "true";
process.env.PERSONAL_HEALTH_CONNECT_ENABLED = "true";
const { PrismaClient } = await import("../../src/generated/prisma/client.ts");
const { PrismaPg } = await import("@prisma/adapter-pg");
const [accounts, ingest, personal, schemas] = await Promise.all([
  import("../../src/lib/personal/health-connect/connections.ts"),
  import("../../src/lib/personal/health-connect/ingestion.ts"),
  import("../../src/lib/personal/personal-service.ts"),
  import("../../src/lib/validations/health-connect-batch.ts"),
]);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
test.after(() => pool.end());

test("P1-C pairing, replay-safety, owner-only reading, tombstones, purge and full erase", async () => {
  const me = await db.user.create({
    data: { name: "Fitness test", email: randomUUID() + "@example.invalid" },
  });
  const other = await db.user.create({
    data: { name: "Unrelated", email: randomUUID() + "@example.invalid" },
  });
  try {
    await personal.updateBio(db, me.id, { birthYear: 1990 });
    await personal.updateBio(db, other.id, { birthYear: 1990 });
    const pair = await accounts.beginHealthPairing(db, me.id);
    assert.match(pair.pairCode, /^[A-Za-z0-9_-]{43}$/);
    const install = randomUUID();
    const claim = await accounts.claimHealthPairing(db, {
      pairCode: pair.pairCode,
      installationId: install,
      label: "Android test",
    });
    assert.match(claim.token, /^[A-Za-z0-9_-]{43}$/);
    await assert.rejects(
      accounts.claimHealthPairing(db, {
        pairCode: pair.pairCode,
        installationId: randomUUID(),
        label: "Replay",
      }),
      (err) => err.status === 401
    );
    const [mine, theirs] = await Promise.all([
      accounts.listHealthConnections(db, me.id),
      accounts.listHealthConnections(db, other.id),
    ]);
    assert.equal(mine.length, 1);
    assert.equal(theirs.length, 0);
    assert.ok(!JSON.stringify(mine).includes(claim.token));
    assert.ok(!JSON.stringify(mine).includes(accounts.hashCapability(claim.token)));

    const item = {
      recordType: "STEPS_DAILY",
      externalId: "2026-11-18",
      sourcePackage: "health-connect-aggregate",
      startedAt: "2026-11-18T00:00:00Z",
      endedAt: "2026-11-18T23:59:00Z",
      value: 5000,
    };
    const body = schemas.healthBatchInput.parse({
      requestId: randomUUID(),
      grantedTypes: ["STEPS_DAILY"],
      records: [item],
      deletions: [],
    });
    const device = { id: claim.connectionId, userId: me.id };
    const first = await ingest.acceptHealthBatch(db, device, body);
    assert.equal(first.imported, 1);
    assert.equal((await ingest.acceptHealthBatch(db, device, body)).replayed, true);
    await assert.rejects(
      ingest.acceptHealthBatch(db, device, {
        ...body,
        records: [{ ...item, value: 7777 }],
      }),
      (err) => err.status === 409
    );
    assert.equal(await db.healthConnectRecord.count({ where: { userId: me.id } }), 1);
    assert.equal((await ingest.listImportedFitness(db, other.id)).length, 0);
    const exported = await personal.exportPersonalData(db, me.id);
    assert.equal(exported.healthConnect.importedFitness.length, 1);
    assert.ok(!JSON.stringify(exported).includes(claim.token));
    assert.ok(!JSON.stringify(exported).includes(accounts.hashCapability(claim.token)));

    const tombstone = schemas.healthBatchInput.parse({
      requestId: randomUUID(),
      grantedTypes: ["STEPS_DAILY"],
      records: [],
      deletions: [
        {
          recordType: "STEPS_DAILY",
          externalId: item.externalId,
          sourcePackage: item.sourcePackage,
        },
      ],
    });
    await ingest.acceptHealthBatch(db, device, tombstone);
    assert.equal((await ingest.listImportedFitness(db, me.id)).length, 0);
    await ingest.acceptHealthBatch(db, device, {
      ...body,
      requestId: randomUUID(),
    }); // stale snapshot must not resurrect deleted data
    assert.equal((await ingest.listImportedFitness(db, me.id)).length, 0);
    await accounts.purgeHealthImports(db, me.id);
    assert.equal(await db.healthConnectRecord.count({ where: { userId: me.id } }), 0);
    assert.ok(
      (await db.healthConnectConnection.findUnique({ where: { id: device.id } })).revokedAt
    );
    await assert.rejects(
      ingest.acceptHealthBatch(db, device, {
        ...body,
        requestId: randomUUID(),
      }),
      (err) => err.status === 401
    );

    const secondPair = await accounts.beginHealthPairing(db, me.id);
    const second = await accounts.claimHealthPairing(db, {
      pairCode: secondPair.pairCode,
      installationId: randomUUID(),
      label: "Second Android",
    });
    assert.ok(second.connectionId);
    await personal.deleteAllPersonalData(db, me.id);
    assert.equal(await db.healthConnectConnection.count({ where: { userId: me.id } }), 0);
    assert.equal(await db.healthConnectPairing.count({ where: { userId: me.id } }), 0);
    assert.equal(
      await db.healthConnectSyncBatch.count({ where: { connectionId: second.connectionId } }),
      0
    );
    assert.equal(await db.healthConnectRecord.count({ where: { userId: me.id } }), 0);
    assert.ok(await db.user.findUnique({ where: { id: me.id } }));
  } finally {
    await db.user.deleteMany({ where: { id: { in: [me.id, other.id] } } });
  }
});
