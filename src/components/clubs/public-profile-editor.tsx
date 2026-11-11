"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Globe2, ShieldCheck, EyeOff, Send, Save } from "lucide-react";
type Draft = {
  tagline: string;
  description: string;
  city: string;
  website: string;
  contactEmail: string;
  listed: boolean;
};
export function PublicProfileEditor({
  clubId,
  slug,
  initial,
  status,
}: {
  clubId: string;
  slug: string;
  initial: Draft;
  status: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const base = "/api/clubs/" + encodeURIComponent(clubId) + "/public-profile";
  const field =
    "mt-2 w-full min-h-12 rounded-xl border border-[#f6dc9b]/20 bg-[#110b08] px-4 py-3 text-[#fff2e3] focus-visible:outline-2 focus-visible:outline-[#f26b00]";
  async function mutation(url: string, body: unknown, method: string) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to save");
    return data;
  }
  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      await mutation(base, draft, "PATCH");
      setNote("Draft saved. Publication requires a separate review.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function action(which: "submit" | "unlist") {
    if (busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      if (which === "submit") await mutation(base, draft, "PATCH");
      await mutation(base + "/" + which, {}, "POST");
      setNote(
        which === "submit"
          ? "Sent for review. Your previously approved profile stays unchanged."
          : "Public profile hidden."
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }
  const update = (key: keyof Draft, value: string | boolean) =>
    setDraft((old) => ({ ...old, [key]: value }));
  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <form
        onSubmit={save}
        className="space-y-5 rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-6 sm:p-8"
      >
        <div>
          <p className="text-xs font-semibold tracking-widest text-[#ffbd78] uppercase">
            Public directory
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Tell your club&apos;s story</h2>
          <p className="mt-2 text-sm text-[#baa18d]">
            Only what you explicitly submit and the platform approves becomes public.
          </p>
        </div>
        <label className="block text-sm">
          Short introduction
          <input
            required
            maxLength={140}
            className={field}
            value={draft.tagline}
            onChange={(e) => update("tagline", e.target.value)}
            placeholder="Where your next chapter begins"
          />
        </label>
        <label className="block text-sm">
          About the club
          <textarea
            required
            rows={6}
            maxLength={1800}
            className={field}
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What makes your club special?"
          />
        </label>
        <label className="block text-sm">
          Public city
          <input
            required
            maxLength={100}
            className={field}
            value={draft.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="Your city"
          />
        </label>
        <label className="block text-sm">
          Public website (optional)
          <input
            type="url"
            className={field}
            value={draft.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://example.com"
          />
        </label>
        <label className="block text-sm">
          Public email (optional)
          <input
            type="email"
            className={field}
            value={draft.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            placeholder="hello@example.com"
          />
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-[#f6dc9b]/15 p-4 text-sm">
          <input
            type="checkbox"
            checked={draft.listed}
            onChange={(e) => update("listed", e.target.checked)}
            className="size-4 accent-orange-500"
          />
          List this club in public search after approval
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-red-950/30 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
        {note && (
          <p role="status" className="rounded-xl bg-emerald-950/30 p-3 text-sm text-emerald-200">
            {note}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={busy}
            type="submit"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#f6dc9b]/30 px-5 text-sm font-semibold"
          >
            <Save className="size-4" />
            Save draft
          </button>
          <button
            disabled={busy || status === "PENDING" || status === "SUSPENDED"}
            type="button"
            onClick={() => action("submit")}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f1be6e] to-[#f26b00] px-5 text-sm font-bold text-[#231406] disabled:opacity-50"
          >
            <Send className="size-4" />
            Submit for review
          </button>
          <button
            disabled={busy}
            type="button"
            onClick={() => action("unlist")}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-[#f6dc9b]/20 px-5 text-sm text-[#d5bca3]"
          >
            <EyeOff className="size-4" />
            Hide profile
          </button>
        </div>
      </form>
      <aside className="h-fit space-y-4 rounded-3xl border border-[#f6dc9b]/20 bg-[#1e160f] p-6">
        <Globe2 className="size-8 text-[#ffc37e]" />
        <h2 className="text-xl font-semibold">Publication</h2>
        <p className="text-sm text-[#c4ab93]">
          Status:{" "}
          <strong className="text-[#f5c28a]">{status.replaceAll("_", " ").toLowerCase()}</strong>
        </p>
        <p className="text-xs break-all text-[#aa9480]">Public path: /c/{slug}</p>
        <p className="text-sm leading-7 text-[#bda58e]">
          Your club works privately even when your profile is hidden. A public listing never
          authorizes membership or shares your member directory.
        </p>
        <div className="flex gap-2 border-t border-[#f6dc9b]/15 pt-4 text-xs text-[#bba28d]">
          <ShieldCheck className="size-4 shrink-0 text-[#f3c486]" /> Only approved revisions are
          published.
        </div>
      </aside>
    </div>
  );
}
