import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { getOverview } from "@/lib/personal/personal-service";
import { MEASUREMENT_KINDS, displayUnit, type MeasurementKind } from "@/lib/personal/measurements";
import { MEASUREMENT_LABEL } from "@/lib/personal/measurement-muscles";
import { MeasurementForm, RemoveMeasurement } from "@/components/personal/measurement-form";
import { WellnessInsightsSection } from "@/components/personal/wellness-insights";

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 96},${26 - ((v - min) / span) * 24}`)
    .join(" ");
  return (
    <svg className="hm-me-spark" viewBox="0 0 96 28" aria-hidden="true">
      <polyline points={points} />
    </svg>
  );
}

export default async function ProgressPage() {
  const session = await requireSession();
  const o = await getOverview(prisma, session.user.id);
  const reason =
    o.profile.birthYear === null
      ? "Add your birth year in Profile to log body measurements."
      : "Body measurements are only available to adults for now.";

  return (
    <>
      <header>
        <h1 style={{ margin: 0, fontFamily: "var(--font-hm-display, inherit)" }}>Progress</h1>
      </header>
      {process.env.PERSONAL_WELLNESS_ENABLED === "true" && o.canLogMeasurements && (
        <WellnessInsightsSection userId={session.user.id} />
      )}
      <MeasurementForm units={o.profile.units} enabled={o.canLogMeasurements} reason={reason} />
      {MEASUREMENT_KINDS.filter((k) => o.measurements[k]?.length).map((kind: MeasurementKind) => {
        const list = o.measurements[kind]; // newest first
        const unit = displayUnit(kind, o.profile.units);
        const change = Math.round((list[0].value - list[list.length - 1].value) * 10) / 10;
        return (
          <section key={kind} className="hm-me-card" aria-label={MEASUREMENT_LABEL[kind]}>
            <div className="hm-me-row">
              <div>
                <h3>{MEASUREMENT_LABEL[kind]}</h3>
                <p className="hm-small" style={{ margin: 0 }}>
                  {list[0].value} {unit}
                  {list.length > 1
                    ? ` · ${change > 0 ? "+" : ""}${change} ${unit} since ${list[list.length - 1].measuredAt.slice(0, 10)}`
                    : ""}
                </p>
              </div>
              <Sparkline
                values={list
                  .slice(0, 12)
                  .map((m) => m.value)
                  .reverse()}
              />
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {list.slice(0, 5).map((m) => (
                <li key={m.id} className="hm-me-row">
                  <span>
                    {m.value} {unit} <span className="hm-small">{m.measuredAt.slice(0, 10)}</span>
                  </span>
                  <RemoveMeasurement
                    id={m.id}
                    label={`${MEASUREMENT_LABEL[kind]} ${m.measuredAt.slice(0, 10)}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
