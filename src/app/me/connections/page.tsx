import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listHealthConnections } from "@/lib/personal/health-connect/connections";
import { listImportedFitness } from "@/lib/personal/health-connect/ingestion";
import { HealthConnectControls } from "@/components/personal/health-connect-controls";

export default async function HealthConnectPage() {
  if (process.env.PERSONAL_HEALTH_CONNECT_ENABLED !== "true") notFound();
  const userId = await requireWellnessPage();
  const [connections, records] = await Promise.all([
    listHealthConnections(prisma, userId),
    listImportedFitness(prisma, userId),
  ]);
  return (
    <>
      <header>
        <p className="hm-small">Connected sources</p>
        <h1>Android Health Connect</h1>
        <p className="hm-small">Only fitness records you permit. Private to you and separate from every club.</p>
      </header>
      <HealthConnectControls connections={connections.map(x => ({
        id: x.id, label: x.label, grantedTypes: x.grantedTypes,
        lastSyncAt: x.lastSyncAt?.toISOString() ?? null,
        revokedAt: x.revokedAt?.toISOString() ?? null,
        tokenExpiresAt: x.tokenExpiresAt.toISOString(),
      }))} />
      <section className="hm-me-card" aria-label="Imported fitness records">
        <h2>Recently imported records</h2>
        <p className="hm-small">Imported entries preserve their source. They do not replace manual workouts or medical history.</p>
        {records.length === 0 ? <p className="hm-small">Nothing imported yet. Pair the Android companion, choose permissions, then tap Sync.</p> :
          <ul className="hm-me-insight-days">
            {records.slice(0, 25).map(x => (
              <li key={x.id}>
                <span><strong>{x.recordType.replaceAll("_", " ").toLowerCase()}</strong> · {x.endedAt.toLocaleDateString()}</span>
                <span className="hm-small">{x.value === null ? "No numeric value" : x.value + (
                  x.recordType === "STEPS_DAILY" ? " steps" : x.recordType === "HYDRATION" ? " mL" : " kcal"
                )} · {x.sourcePackage}</span>
              </li>
            ))}
          </ul>}
      </section>
    </>
  );
}
