import Link from "next/link";
import { Activity, Dumbbell, LineChart, Users } from "lucide-react";
import { OperationsEmpty, OperationsStat } from "@/components/human-motion/operations-ui";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/required-session";
import { getOverview } from "@/lib/personal/personal-service";
import { muscleLabel, type MuscleId } from "@/lib/personal/muscle-map";
import { WellnessInsightsSection } from "@/components/personal/wellness-insights";

export default async function TodayPage() {
  const session = await requireSession();
  const o = await getOverview(prisma, session.user.id);
  const name = o.profile.displayName ?? session.user.name;
  const top = (Object.entries(o.load) as [MuscleId, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const clubVisits = o.clubs.reduce((n, c) => n + (c.visits28d ?? 0), 0);
  const logged = Object.values(o.measurements).reduce((n, list) => n + list.length, 0);
  const wellnessReady = process.env.PERSONAL_WELLNESS_ENABLED === "true" && o.canLogMeasurements;

  return (
    <>
      <header>
        <p className="hm-small">Your space</p>
        <h1 style={{ margin: 0, fontFamily: "var(--font-hm-display, inherit)" }}>Hello, {name}</h1>
      </header>

      {wellnessReady && (
        <>
          <section className="hm-me-card" aria-label="Wellness quick actions">
            <h2>Your wellness</h2>
            <p className="hm-small">
              Built around your actual records, not guessed readiness scores.
            </p>
            <nav className="hm-me-launch-grid" aria-label="Wellness destinations">
              <Link href="/me/workouts">Workouts</Link>
              <Link href="/me/goals">Goals</Link>
              <Link href="/me/sleep">Sleep</Link>
              <Link href="/me/nutrition">Nutrition</Link>
              <Link href="/me/recovery">Recovery</Link>
              <Link href="/me/insights">Insights</Link>
                {process.env.PERSONAL_HEALTH_CONNECT_ENABLED === "true" && (
                  <Link href="/me/connections">Connected sources</Link>
                )}
            </nav>
          </section>
          <WellnessInsightsSection userId={session.user.id} />
        </>
      )}
      <div className="hm-me-stats">
        <OperationsStat label="Activities" value={o.activities.length} icon={Activity} />
        <OperationsStat
          label="Club visits, 28 days"
          value={clubVisits}
          detail={o.clubs.some((c) => c.enabled) ? undefined : "Turn on in Activity"}
          icon={Users}
          tone="cocoa"
        />
        <OperationsStat label="Measurements" value={logged} icon={LineChart} tone="terracotta" />
      </div>

      {top.length > 0 ? (
        <section className="hm-me-card" aria-label="Most worked muscles">
          <h2>Most worked</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {top.map(([id, v]) => (
              <li key={id} className="hm-me-row">
                <span>{muscleLabel(id)}</span>
                <span>{Math.round(v * 100)}%</span>
              </li>
            ))}
          </ul>
          <Link href="/me/body" className="hm-button hm-button-secondary">
            Open my muscle map
          </Link>
        </section>
      ) : (
        <OperationsEmpty
          icon={Dumbbell}
          title="Your muscle map is waiting"
          detail="Pick the sports and activities you do, and your map lights up with what you train."
        >
          <Link href="/me/activity" className="hm-button hm-button-primary">
            Choose activities
          </Link>
        </OperationsEmpty>
      )}
    </>
  );
}
