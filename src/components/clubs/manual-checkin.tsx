"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, Search, UserRoundCheck, UserRoundPlus } from "lucide-react";

type Candidate = { id: string; name: string; number: number; active: boolean };
type Feedback = { ok: boolean; title: string; detail: string } | null;

export function ManualCheckIn({ clubId, canOverride }: { clubId: string; canOverride: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [override, setOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [searching, setSearching] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const abort = new AbortController();
    controller.current?.abort();
    controller.current = abort;
    const id = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/clubs/${clubId}/attendance/candidates?q=${encodeURIComponent(query.trim())}`,
          {
            signal: abort.signal,
            cache: "no-store",
            credentials: "same-origin",
          }
        );
        const data = (await res.json()) as { members?: Candidate[] };
        if (!abort.signal.aborted) setResults(res.ok ? (data.members ?? []) : []);
      } catch {
        if (!abort.signal.aborted) setResults([]);
      } finally {
        if (!abort.signal.aborted) setSearching(false);
      }
    }, 260);
    return () => {
      clearTimeout(id);
      abort.abort();
    };
  }, [clubId, query]);

  async function checkIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || working) return;
    setWorking(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/clubs/${clubId}/attendance/check-in`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "MANUAL",
          memberRecordId: selected.id,
          ...(!selected.active && canOverride && override ? { overrideReason: reason.trim() } : {}),
        }),
      });
      const result = (await res.json()) as {
        error?: string;
        member?: { displayName: string; memberNumber: number };
        overridden?: boolean;
      };
      if (!res.ok) throw new Error(result.error || "Check-in was not recorded");
      setFeedback({
        ok: true,
        title: `Welcome, ${result.member?.displayName ?? selected.name}!`,
        detail: result.overridden
          ? "Entry recorded with a manager override."
          : "Attendance recorded successfully.",
      });
      setQuery("");
      setResults([]);
      setSelected(null);
      setOverride(false);
      setReason("");
    } catch (error) {
      setFeedback({
        ok: false,
        title: "Could not check in",
        detail: error instanceof Error ? error.message : "Try again",
      });
    } finally {
      setWorking(false);
    }
  }

  return (
    <section
      aria-label="Manual member check-in"
      className="rounded-[1.8rem] border border-[#f6dc9b]/20 bg-gradient-to-br from-[#21170f] to-[#120d09] p-5 shadow-[0_20px_55px_rgba(0,0,0,.15)] sm:p-7"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#f3b75b]/10 text-[#ffc98a]">
          <UserRoundCheck className="size-6" />
        </span>
        <div>
          <h2 className="text-xl font-semibold">A personal welcome</h2>
          <p className="mt-1 text-sm leading-6 text-[#b8a08c]">
            Check in someone by name or member number. Walk-in members don&apos;t need a phone or
            app.
          </p>
        </div>
      </div>
      <div className="mt-6">
        <label
          htmlFor="manual-member-search"
          className="block text-xs font-semibold tracking-[.18em] text-[#e7ba7d] uppercase"
        >
          Find a member
        </label>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute top-3.5 left-4 size-4 text-[#b9a088]" />
          <input
            id="manual-member-search"
            type="search"
            autoComplete="off"
            value={query}
            maxLength={80}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setResults([]);
              setFeedback(null);
            }}
            placeholder="Name or member number…"
            className="min-h-12 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0d0907] pr-4 pl-11 text-sm outline-none placeholder:text-[#77614f] focus:border-[#f2b765]"
          />
        </div>
        <p className="mt-2 text-xs text-[#a78e76]">
          {searching
            ? "Searching your club…"
            : query.trim().length < 2
              ? "Type at least two characters"
              : "Choose the correct member below"}
        </p>
        {query.trim().length >= 2 && !selected && (
          <div
            role="listbox"
            aria-label="Matching members"
            className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-[#f6dc9b]/15 bg-[#0e0907] p-2"
          >
            {results.map((item) => (
              <button
                key={item.id}
                role="option"
                aria-selected={false}
                type="button"
                onClick={() => {
                  setSelected(item);
                  setQuery(item.name);
                  setResults([]);
                  setOverride(false);
                }}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-[#322216] focus-visible:bg-[#322216]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-[#fff0df]">{item.name}</span>
                  <span className="mt-1 block text-xs text-[#bba28a]">
                    Member #{String(item.number).padStart(4, "0")}
                  </span>
                </span>
                <span
                  className={`shrink-0 rounded-full px-2 py-1 text-[11px] ${item.active ? "bg-emerald-500/10 text-emerald-300" : "bg-orange-500/10 text-orange-200"}`}
                >
                  {item.active ? "Active plan" : "Needs review"}
                </span>
              </button>
            ))}
            {!searching && results.length === 0 && (
              <p className="p-3 text-sm text-[#bfa68c]">No matching member in this club.</p>
            )}
          </div>
        )}
      </div>
      {selected && (
        <form
          onSubmit={checkIn}
          className="mt-5 rounded-2xl border border-[#efb75c]/25 bg-[#f1ad56]/5 p-5"
        >
          <p className="text-xs font-semibold tracking-[.17em] text-[#dbac74] uppercase">
            Selected member
          </p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{selected.name}</p>
              <p className="mt-1 text-xs text-[#bba28a]">
                Member #{String(selected.number).padStart(4, "0")}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs ${selected.active ? "bg-emerald-500/10 text-emerald-300" : "bg-orange-500/10 text-orange-200"}`}
            >
              {selected.active ? "Plan active" : "Inactive plan"}
            </span>
          </div>
          {!selected.active && (
            <div className="mt-4 rounded-xl border border-orange-400/20 bg-orange-400/5 p-3 text-sm leading-6 text-[#edbfa2]">
              <p className="flex items-center gap-2 font-semibold">
                <AlertCircle className="size-4" />
                No valid membership term
              </p>
              <p className="mt-1 text-xs">
                Check-in is blocked until renewed, unless an owner or manager explicitly authorizes
                an exception.
              </p>
              {canOverride && (
                <div className="mt-3">
                  <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={override}
                      onChange={(e) => setOverride(e.target.checked)}
                      className="accent-[#f3a950]"
                    />{" "}
                    Allow a one-time exception
                  </label>
                  {override && (
                    <label className="mt-3 block text-xs text-[#e7bfa1]">
                      Reason for exception (required)
                      <textarea
                        required
                        minLength={8}
                        maxLength={240}
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Approved guest trial by manager…"
                        className="mt-2 w-full rounded-xl border border-orange-400/20 bg-[#0e0907] p-3 text-sm text-white focus:border-[#f5bb77]"
                      />
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={
              working ||
              (!selected.active && (!canOverride || !override || reason.trim().length < 8))
            }
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f2c27b] to-[#ef711c] px-5 font-bold text-[#261505] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <UserRoundPlus className="size-4" />
            {working
              ? "Checking in…"
              : selected.active
                ? "Record arrival"
                : "Record approved exception"}
          </button>
        </form>
      )}
      <div aria-live="polite" aria-atomic="true" className="mt-5">
        {feedback && (
          <div
            role={feedback.ok ? "status" : "alert"}
            className={`rounded-2xl border p-4 ${feedback.ok ? "border-emerald-500/25 bg-emerald-500/10" : "border-orange-500/25 bg-orange-500/10"}`}
          >
            <p className="flex items-center gap-2 font-semibold">
              {feedback.ok ? (
                <CheckCircle2 className="size-5 text-emerald-300" />
              ) : (
                <AlertCircle className="size-5 text-orange-300" />
              )}
              {feedback.title}
            </p>
            <p className="mt-2 text-sm text-[#dec4a9]">{feedback.detail}</p>
          </div>
        )}
      </div>
    </section>
  );
}
