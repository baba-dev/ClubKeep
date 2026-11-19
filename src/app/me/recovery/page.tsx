import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listRecovery } from "@/lib/personal/wellness-recovery";
import { localDate } from "@/lib/personal/wellness-rules";
import { RecoveryForm } from "@/components/personal/wellness-recovery";

export default async function RecoveryPage() {
  const userId = await requireWellnessPage();
  const [checkIns, profile] = await Promise.all([
    listRecovery(prisma, userId),
    prisma.personalProfile.findUnique({ where: { userId }, select: { timezone: true } }),
  ]);
  const today = localDate(new Date(), profile?.timezone ?? "UTC");
  return (
    <>
      <header>
        <p className="hm-small">A mindful check-in</p>
        <h1>Recovery</h1>
      </header>
      <RecoveryForm today={today} />
      <section className="hm-me-card" aria-label="Previous check-ins">
        <h2>History</h2>
        {checkIns.length === 0 ? (
          <p className="hm-small">
            No check-ins yet. The journal never treats missing data as poor recovery.
          </p>
        ) : (
          checkIns.map((x) => (
            <div className="hm-me-row" key={x.id}>
              <strong>{x.localDate}</strong>
              <span className="hm-small">
                Energy {x.energy ?? "—"} · Soreness {x.soreness ?? "—"} · Stress {x.stress ?? "—"}
              </span>
            </div>
          ))
        )}
      </section>
    </>
  );
}
