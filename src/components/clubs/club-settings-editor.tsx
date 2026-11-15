"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Save, Building2 } from "lucide-react";
const names = {
  GYM: "Gym & Fitness",
  YOGA: "Yoga & Wellness",
  DANCE: "Dance Academy",
  SPORTS: "Sports Academy",
  OTHER: "General Club",
} as const;
type ClubType = keyof typeof names;
export function ClubSettingsEditor({
  clubId,
  initial,
}: {
  clubId: string;
  initial: { vertical: ClubType; countryCode: string; city: string };
}) {
  const router = useRouter();
  const [vertical, setVertical] = useState<ClubType>(initial.vertical);
  const [country, setCountry] = useState(initial.countryCode);
  const [city, setCity] = useState(initial.city);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const field =
    "mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--hm-terracotta)]";
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/clubs/" + encodeURIComponent(clubId) + "/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vertical,
          countryCode: country.trim().toUpperCase(),
          city: city.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Unable to save");
      setMessage("Club settings saved.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="hm-ops-section hm-ops-form mt-0">
      <Building2 className="size-7 text-[var(--hm-sage-deep)]" />
      <h2 className="mt-3 text-xl font-semibold">Club category and location</h2>
      <p className="hm-small mt-2">
        Adjust your club type without rewriting historical attendance, plans or membership records.
      </p>
      <div className="mt-6 space-y-4">
        <label className="block text-sm">
          Club type
          <select
            className={field}
            value={vertical}
            onChange={(e) => setVertical(e.target.value as ClubType)}
          >
            {Object.entries(names).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Country code (ISO 2)
          <input
            required
            minLength={2}
            maxLength={2}
            className={field}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="IN"
          />
        </label>
        <label className="block text-sm">
          City
          <input
            maxLength={100}
            className={field}
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Your city"
          />
        </label>
      </div>
      {message && (
        <p role="status" className="mt-4 text-sm text-[var(--hm-terracotta)]">
          {message}
        </p>
      )}
      <button disabled={busy} className="hm-button hm-button-primary mt-6 disabled:opacity-50">
        <Save className="size-4" />
        {busy ? "Saving…" : "Save club settings"}
      </button>
    </form>
  );
}
