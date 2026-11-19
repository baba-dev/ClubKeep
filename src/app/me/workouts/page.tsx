import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listWorkouts } from "@/lib/personal/wellness-workouts";
import { WorkoutLogForm, RemoveWorkout } from "@/components/personal/wellness-workouts";

export default async function WorkoutsPage() {
  const userId = await requireWellnessPage();
  const workouts = await listWorkouts(prisma, userId);
  return (
    <>
      <header>
        <p className="hm-small">Training journal</p>
        <h1>My workouts</h1>
      </header>
      <WorkoutLogForm />
      <section className="hm-me-card" aria-label="Workout history">
        <div className="hm-me-row">
          <h2>Completed sessions</h2>
          <Link href="/me/goals" className="hm-button hm-button-secondary">
            My goals
          </Link>
        </div>
        {workouts.length === 0 ? (
          <p className="hm-small">
            Log your first completed session to start a real progress history.
          </p>
        ) : (
          workouts.map((w) => (
            <article key={w.id} className="hm-me-card">
              <div className="hm-me-row">
                <strong>{w.title}</strong>
                <span>{w.durationMinutes} min</span>
              </div>
              <p className="hm-small">
                {w.activityKey.replaceAll("-", " ")} · {w.endedAt.toLocaleDateString()}
              </p>
              {w.exercises.length > 0 && (
                <ul>
                  {w.exercises.map((e) => (
                    <li key={e.id}>
                      {e.name} · {e.sets.length} {e.sets.length === 1 ? "set" : "sets"}
                    </li>
                  ))}
                </ul>
              )}
              <RemoveWorkout id={w.id} />
            </article>
          ))
        )}
      </section>
    </>
  );
}
