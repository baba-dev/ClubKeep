import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { getOverview } from "@/lib/personal/personal-service";
import { ACTIVITIES } from "@/lib/personal/muscle-map";
import { ActivityPicker } from "@/components/personal/activity-picker";
import { ClubSignalToggle } from "@/components/personal/club-signal-toggle";

export default async function ActivityPage() {
  const session = await requireSession();
  const o = await getOverview(prisma, session.user.id);
  const label = (k: string) => ACTIVITIES.find((a) => a.key === k)?.label ?? k;

  return (
    <>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-hm-display, inherit)" }}>Activity</h1>
      </header>
      <ActivityPicker initial={o.activities} />
      {o.clubs.length > 0 && (
        <section className="hm-me-card" aria-label="Club visits">
          <h2>Add my club visits</h2>
          <p className="hm-small">
            Let your own visits to a club shape your muscle map. Only you see this. The club is
            never told, and you can turn it off at any time.
          </p>
          {o.clubs.map((c) => (
            <ClubSignalToggle
              key={c.clubId}
              clubId={c.clubId}
              name={c.name}
              enabled={c.enabled}
              detail={
                c.mapsTo.length === 0
                  ? "This club type has no automatic mapping; declare your sport above."
                  : c.enabled
                    ? `${c.visits28d ?? 0} visits in 28 days, counted as ${c.mapsTo.map(label).join(", ")}.`
                    : `Would count as ${c.mapsTo.map(label).join(", ")}.`
              }
            />
          ))}
        </section>
      )}
    </>
  );
}
