import { prisma } from "@/lib/prisma";
import { requireWellnessPage } from "@/lib/personal/wellness-page";
import { listNutrition } from "@/lib/personal/wellness-nutrition";
import { MealForm, HydrationForm, RemoveNutrition } from "@/components/personal/wellness-nutrition";

export default async function NutritionPage() {
  const userId = await requireWellnessPage();
  const { meals, hydration } = await listNutrition(prisma, userId);
  return <><header><p className="hm-small">Nourishment</p><h1>Nutrition</h1></header>
    <MealForm/><HydrationForm/>
    <section className="hm-me-card" aria-label="Food history"><h2>Recent meals</h2>
      {meals.length === 0 ? <p className="hm-small">Start with a simple meal entry.</p> :
        meals.slice(0, 15).map(m => <article className="hm-me-card" key={m.id}>
          <div className="hm-me-row"><strong>{m.mealType.toLowerCase()}</strong><span className="hm-small">{m.eatenAt.toLocaleDateString()}</span></div>
          <ul>{m.items.map(item => <li key={item.id}>{item.name}
            {item.portionGrams === null ? "" : " · " + item.portionGrams + " g"}
            {item.caloriesKcal === null ? "" : " · " + item.caloriesKcal + " kcal (entered)"}</li>)}</ul>
          <RemoveNutrition id={m.id} kind="meals" />
        </article>)}
    </section>
    <section className="hm-me-card" aria-label="Hydration history"><h2>Recent water entries</h2>
      {hydration.length === 0 ? <p className="hm-small">No water entries yet.</p> :
        hydration.slice(0, 10).map(w => <div className="hm-me-row" key={w.id}>
          <span>{w.volumeMl} mL · {w.takenAt.toLocaleString()}</span>
          <RemoveNutrition id={w.id} kind="hydration"/>
        </div>)}
    </section>
  </>;
}
