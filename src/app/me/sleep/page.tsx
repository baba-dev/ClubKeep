import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listSleep } from "@/lib/personal/wellness-sleep";
import { sleepMinutes } from "@/lib/personal/wellness-rules";
import { SleepForm, RemoveSleep } from "@/components/personal/wellness-sleep";

export default async function SleepPage() {
  const userId = await requireWellnessPage();
  const entries = await listSleep(prisma, userId);
  return (
    <>
      <header>
        <p className="hm-small">Rest journal</p>
        <h1>Sleep</h1>
      </header>
      <SleepForm />
      <section className="hm-me-card" aria-label="Sleep history">
        <h2>Your rest</h2>
        {entries.length === 0 ? (
          <p className="hm-small">Your sleep history will appear after your first entry.</p>
        ) : (
          entries.map((s) => (
            <article key={s.id} className="hm-me-row">
              <div>
                <strong>
                  {Math.floor(sleepMinutes(s.startedAt, s.endedAt) / 60)}h{" "}
                  {sleepMinutes(s.startedAt, s.endedAt) % 60}m
                </strong>
                <p className="hm-small">
                  {s.endedAt.toLocaleDateString()} · {s.isNap ? "Nap" : "Main sleep"}
                  {s.quality ? " · Quality " + s.quality + "/5" : ""}
                </p>
              </div>
              <RemoveSleep id={s.id} />
            </article>
          ))
        )}
      </section>
    </>
  );
}
