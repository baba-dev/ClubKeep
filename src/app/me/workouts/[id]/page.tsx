import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { RemoveWorkout } from "@/components/personal/wellness-workouts";

export default async function WorkoutDetail({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireWellnessPage();
  const { id } = await params;
  const w = await prisma.workoutSession.findFirst({
    where: { id, userId },
    include: {
      exercises: {
        orderBy: { position: "asc" },
        include: { sets: { orderBy: { position: "asc" } } },
      },
    },
  });
  if (!w) notFound();
  return (
    <article className="hm-me-card">
      <h1>{w.title}</h1>
      <p>
        {w.durationMinutes} minutes · {w.endedAt.toLocaleString()}
      </p>
      <p className="hm-small">{w.notes ?? "Recorded manually."}</p>
      {w.exercises.map((e) => (
        <section key={e.id}>
          <h2>{e.name}</h2>
          <ul>
            {e.sets.map((s) => (
              <li key={s.id}>
                {s.reps ?? "—"} reps ·{" "}
                {s.weightGrams === null ? "No weight entered" : s.weightGrams / 1000 + " kg"}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <RemoveWorkout id={w.id} />
    </article>
  );
}
