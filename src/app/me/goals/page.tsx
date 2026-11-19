import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listGoals } from "@/lib/personal/wellness-goals";
import { GoalForm, GoalActions } from "@/components/personal/wellness-goals";

export default async function GoalsPage() {
  const userId = await requireWellnessPage();
  const goals = await listGoals(prisma, userId);
  return (
    <>
      <header>
        <p className="hm-small">A direction to grow</p>
        <h1>My goals</h1>
      </header>
      <GoalForm />
      <section className="hm-me-card" aria-label="My goals">
        <h2>My goals</h2>
        {goals.length === 0 ? (
          <p className="hm-small">You have not added a goal yet.</p>
        ) : (
          goals.map((goal) => (
            <article key={goal.id} className="hm-me-card">
              <div className="hm-me-row">
                <strong>{goal.title}</strong>
                <span className="hm-small">{goal.status.toLowerCase()}</span>
              </div>
              <p className="hm-small">
                {goal.target.toLocaleString()} {goal.metric.toLowerCase().replaceAll("_", " ")} ·{" "}
                {goal.cadence.toLowerCase()}
              </p>
              {goal.status !== "ARCHIVED" && <GoalActions id={goal.id} status={goal.status} />}
            </article>
          ))
        )}
      </section>
    </>
  );
}
