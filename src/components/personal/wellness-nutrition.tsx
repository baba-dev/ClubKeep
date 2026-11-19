"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postJson } from "./post-json";

export function MealForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  function submit(data: FormData) {
    const lines = String(data.get("foods") ?? "").split("\n").map(x => x.trim()).filter(Boolean);
    const items = lines.map(line => {
      const [name, portion, calories, protein] = line.split("|").map(x => x.trim());
      return { name,
        ...(portion ? { portionGrams: Number(portion) } : {}),
        ...(calories ? { caloriesKcal: Number(calories) } : {}),
        ...(protein ? { proteinGrams: Number(protein) } : {}),
      };
    });
    if (!items.length) { setMessage("Add at least one food."); return; }
    start(async () => {
      const result = await postJson("/api/me/wellness/meals", {
        requestId, mealType: String(data.get("mealType")),
        eatenAt: new Date().toISOString(), items,
      });
      setMessage(result.ok ? "Meal added." : result.error);
      if (result.ok) { setRequestId(crypto.randomUUID()); router.refresh(); }
    });
  }
  return <form action={submit} className="hm-me-card" aria-busy={pending}>
    <h2>Food journal</h2>
    <p className="hm-small">Write one food per line. Optionally add | grams | calories | protein grams. Unknown nutrients stay unknown, never zero.</p>
    <label className="hm-me-field">Meal
      <select name="mealType"><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option>
        <option value="DINNER">Dinner</option><option value="SNACK">Snack</option></select>
    </label>
    <label className="hm-me-field">Foods
      <textarea name="foods" rows={4} required maxLength={1000} placeholder={"Dosa | 200\nChai | 150 | 90 | 3"} />
    </label>
    <div className="hm-me-row"><button className="hm-button hm-button-primary" disabled={pending}>Save meal</button>
      {message && <span role="status" className="hm-small">{message}</span>}</div>
  </form>;
}

export function HydrationForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  function submit(data: FormData) {
    start(async () => {
      const res = await postJson("/api/me/wellness/hydration", {
        requestId, volumeMl: Number(data.get("volume")), takenAt: new Date().toISOString(),
      });
      setMessage(res.ok ? "Water logged." : res.error);
      if (res.ok) { setRequestId(crypto.randomUUID()); router.refresh(); }
    });
  }
  return <form action={submit} className="hm-me-card" aria-busy={pending}><h2>Hydration</h2>
    <label className="hm-me-field">Water in mL<input name="volume" type="number" defaultValue={250} min={1} max={5000} required /></label>
    <div className="hm-me-row"><button disabled={pending} className="hm-button hm-button-secondary">Log water</button>
      {message && <span role="status" className="hm-small">{message}</span>}</div>
  </form>;
}

export function RemoveNutrition({ id, kind }: { id: string; kind: "meals" | "hydration" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return <span><button type="button" disabled={pending} className="hm-button hm-button-secondary"
    onClick={() => start(async () => {
      const res = await postJson("/api/me/wellness/" + kind + "/remove", { id });
      setMessage(res.ok ? "Removed." : res.error);
      if (res.ok) router.refresh();
    })}>Remove</button>{message && <span role="status" className="hm-small">{message}</span>}</span>;
}
