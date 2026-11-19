import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { getMuscleExplorer } from "@/lib/personal/muscle-explorer-service";
import { displayUnit, type MeasurementKind } from "@/lib/personal/measurements";
import { MEASUREMENT_LABEL, MEASUREMENT_MUSCLE } from "@/lib/personal/measurement-muscles";
import type { MuscleId } from "@/lib/personal/muscle-map";
import { MuscleExplorer } from "@/components/personal/body-map/muscle-explorer";

export default async function BodyPage() {
  const session = await requireSession();
  const { overview: o, logged } = await getMuscleExplorer(prisma, session.user.id);

  // Latest logged girth per muscle, across left and right.
  const notes: Partial<Record<MuscleId, string>> = {};
  const seen: Partial<Record<MuscleId, string>> = {};
  for (const [kind, muscle] of Object.entries(MEASUREMENT_MUSCLE) as [
    MeasurementKind,
    MuscleId,
  ][]) {
    const latest = o.measurements[kind]?.[0];
    if (!latest || (seen[muscle] && seen[muscle]! > latest.measuredAt)) continue;
    seen[muscle] = latest.measuredAt;
    notes[muscle] =
      `Latest ${MEASUREMENT_LABEL[kind].toLowerCase()}: ${latest.value} ${displayUnit(kind, o.profile.units)} ` +
      `(${latest.measuredAt.slice(0, 10)})`;
  }

  return (
    <>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-hm-display, inherit)" }}>My muscle map</h1>
        <p className="hm-small">Tap a muscle to see what trains it.</p>
      </header>
      <MuscleExplorer planned={o.load} logged={logged} measurementNotes={notes} />
    </>
  );
}
