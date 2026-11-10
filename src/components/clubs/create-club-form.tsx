"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

export function CreateClubForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await fetch("/api/clubs", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await result.json();
      if (!result.ok) {
        setMessage(payload.error || "Could not create club");
        return;
      }
      router.replace(`/clubs/${encodeURIComponent(payload.club.id)}`);
      router.refresh();
    } catch {
      setMessage("Couldn't create your club. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={create}
      className="mt-9 space-y-5 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-6 shadow-2xl sm:p-9"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f26b00]/15">
        <Building2 aria-hidden="true" className="size-6 text-[#ffa451]" />
      </div>
      <div>
        <label htmlFor="club-name" className="block text-sm font-semibold text-[#f1d58b]">
          Club name
        </label>
        <p className="mt-1 text-xs leading-5 text-[#b8a08c]">
          Use the name your members will recognize. You can manage memberships after creation.
        </p>
      </div>
      <input
        id="club-name"
        name="club-name"
        required
        minLength={3}
        maxLength={100}
        autoComplete="organization"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="e.g. Orange Fitness Studio"
        className="w-full rounded-xl border border-[#f6dc9b]/25 bg-[#0b0705] px-4 py-3 text-[#fbf1e6] outline-none focus:border-[#f26b00]"
      />
      {message && (
        <p role="alert" className="text-sm text-[#ffbd87]">
          {message}
        </p>
      )}
      <button
        disabled={busy || name.trim().length < 3}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4a84a] to-[#f26b00] px-6 py-3 font-semibold text-[#2a1608] hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Creating club…" : "Create your club"}{" "}
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
      <p className="text-xs leading-5 text-[#b8a08c]">
        Only your authenticated account becomes the owner. No membership fees are charged or
        collected by ClubKeep.
      </p>
    </form>
  );
}
