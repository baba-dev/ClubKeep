import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { wellnessInsights } from "@/lib/personal/wellness-insights";

export async function WellnessInsightsSection({ userId }: { userId: string }) {
  const insights = await wellnessInsights(prisma, userId);
  return (
    <section className="hm-me-card" aria-label="Wellness progress">
      <div className="hm-me-row">
        <h2>Wellness progress</h2>
        <Link className="hm-button hm-button-secondary" href="/me/goals">
          Goals
        </Link>
      </div>
      <p className="hm-small">{insights.disclosure}</p>
      <div className="hm-me-grid">
        <div className="hm-me-card">
          <span className="hm-small">Workouts this week</span>
          <strong>{insights.thisWeek.workouts}</strong>
        </div>
        <div className="hm-me-card">
          <span className="hm-small">Active minutes this week</span>
          <strong>{insights.thisWeek.activityMinutes}</strong>
        </div>
        <div className="hm-me-card">
          <span className="hm-small">Logged sleep this week</span>
          <strong>{insights.thisWeek.sleepMinutes} min</strong>
        </div>
        <div className="hm-me-card">
          <span className="hm-small">Water logged this week</span>
          <strong>{insights.thisWeek.hydrationMl} mL</strong>
        </div>
      </div>
      {process.env.PERSONAL_HEALTH_CONNECT_ENABLED === "true" && (
        <div className="hm-me-card" aria-label="Imported device fitness">
          <div className="hm-me-row">
            <h3>Health Connect</h3>
            <Link href="/me/connections" className="hm-button hm-button-secondary">
              Manage sources
            </Link>
          </div>
          <div className="hm-me-grid">
            <p>
              <strong>{insights.importedThisWeek.steps}</strong>
              <span className="hm-small"> steps reported this week</span>
            </p>
            <p>
              <strong>{insights.importedThisWeek.workoutRecords}</strong>
              <span className="hm-small"> imported exercise records</span>
            </p>
            <p>
              <strong>{insights.importedThisWeek.waterMl}</strong>
              <span className="hm-small"> mL imported hydration</span>
            </p>
          </div>
          <p className="hm-small">
            Imported workouts can overlap across source apps and are not added to manual goals
            automatically.
          </p>
        </div>
      )}
      <h3>Active goals</h3>
      {insights.goals.length === 0 ? (
        <p className="hm-small">Add a goal to see your measured progress.</p>
      ) : (
        insights.goals.map((g) => (
          <div key={g.id} className="hm-me-card">
            <div className="hm-me-row">
              <strong>{g.title}</strong>
              <span>
                {g.achieved} / {g.target}
              </span>
            </div>
            <progress
              value={Math.min(g.achieved, g.target)}
              max={g.target}
              aria-label={g.title + " progress"}
            />
          </div>
        ))
      )}
      <h3>Last recorded days</h3>
      <ul className="hm-me-insight-days">
        {insights.days.slice(-14).map((d) => (
          <li key={d.date}>
            <span>{d.date}</span>
            <span>
              {d.workouts} sessions · {d.minutes} min
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
