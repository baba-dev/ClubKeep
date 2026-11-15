"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Layers3, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import { currencyDigits, formatMinorMoney, parseMinorMoney } from "@/lib/money-format";

export type PlanRow = {
  id: string;
  name: string;
  description: string | null;
  durationUnit: "DAYS" | "WEEKS" | "MONTHS";
  durationCount: number;
  priceMinor: number;
  currency: string;
  archivedAt: string | null;
};
type FormState = {
  name: string;
  description: string;
  durationUnit: PlanRow["durationUnit"];
  durationCount: string;
  price: string;
  currency: string;
};
const blank: FormState = {
  name: "",
  description: "",
  durationUnit: "MONTHS",
  durationCount: "1",
  price: "",
  currency: "INR",
};

export function PlanStudio({
  clubId,
  plans,
  canManage,
}: {
  clubId: string;
  plans: PlanRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function reset() {
    setEditing(null);
    setOpen(false);
    setForm(blank);
    setError("");
  }
  function edit(plan: PlanRow) {
    const digits = currencyDigits(plan.currency);
    setForm({
      name: plan.name,
      description: plan.description || "",
      durationUnit: plan.durationUnit,
      durationCount: String(plan.durationCount),
      price: (plan.priceMinor / 10 ** digits).toFixed(digits),
      currency: plan.currency,
    });
    setEditing(plan.id);
    setOpen(true);
    setError("");
    setNotice("");
  }
  async function post(url: string, body: unknown) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Plan update failed");
    return result;
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const priceMinor = parseMinorMoney(form.price, form.currency);
      if (priceMinor === null)
        throw new Error(
          "Enter an exact, positive price using the selected currency's decimal precision."
        );
      const input = {
        name: form.name,
        description: form.description,
        durationUnit: form.durationUnit,
        durationCount: Number(form.durationCount),
        priceMinor,
        currency: form.currency,
      };
      await post(
        editing ? `/api/clubs/${clubId}/plans/${editing}` : `/api/clubs/${clubId}/plans`,
        input
      );
      reset();
      setNotice(
        editing
          ? "Plan updated. Previous member terms remain unchanged."
          : "Plan created successfully."
      );
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save plan");
    } finally {
      setBusy(false);
    }
  }
  async function archive(id: string) {
    if (busy || !window.confirm("Archive this plan? Existing subscription history is preserved."))
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await post(`/api/clubs/${clubId}/plans/${id}/archive`, {});
      setNotice("Plan archived. Existing member subscriptions are preserved.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not archive plan");
    } finally {
      setBusy(false);
    }
  }
  const activePlans = plans.filter((plan) => !plan.archivedAt);
  const archivedPlans = plans.filter((plan) => Boolean(plan.archivedAt));
  return (
    <div className="mt-6 hm-ops-form">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-[var(--hm-muted)]">
          {plans.filter((plan) => !plan.archivedAt).length} available plans · {plans.length} total
        </p>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              reset();
              setOpen(true);
              setNotice("");
            }}
            className="hm-button hm-button-primary"
          >
            <Plus className="size-4" />
            Create a plan
          </button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-600/10 p-3 text-sm text-emerald-200"
        >
          {notice}
        </p>
      )}
      {error && !open && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-orange-500/20 p-3 text-sm text-orange-200"
        >
          {error}
        </p>
      )}
      {open && (
        <form
          onSubmit={save}
          className="hm-ops-section hm-ops-form mt-6"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-[var(--hm-terracotta)] uppercase">
                Plan studio
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {editing ? "Refine your plan" : "Create a membership plan"}
              </h2>
            </div>
            <button
              type="button"
              onClick={reset}
              aria-label="Close plan editor"
              className="flex size-10 items-center justify-center rounded-xl border border-[var(--hm-line)] text-[#debea1] hover:bg-[#49301f]"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm text-[var(--hm-text)] sm:col-span-2">
              Plan name
              <input
                required
                minLength={2}
                maxLength={90}
                placeholder="Monthly Gym Access"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              />
            </label>
            <label className="block text-sm text-[var(--hm-text)] sm:col-span-2">
              Description <span className="text-xs text-[var(--hm-muted)]">(optional)</span>
              <textarea
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Unlimited gym floor access…"
                className="mt-2 w-full resize-y rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] p-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              />
            </label>
            <label className="block text-sm text-[var(--hm-text)]">
              Duration
              <input
                required
                type="number"
                min={1}
                max={1200}
                step={1}
                value={form.durationCount}
                onChange={(e) => setForm((f) => ({ ...f, durationCount: e.target.value }))}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              />
            </label>
            <label className="block text-sm text-[var(--hm-text)]">
              Duration unit
              <select
                value={form.durationUnit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    durationUnit: e.target.value as PlanRow["durationUnit"],
                  }))
                }
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              >
                <option value="DAYS">Days</option>
                <option value="WEEKS">Weeks</option>
                <option value="MONTHS">Calendar months</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--hm-text)]">
              Price
              <input
                required
                inputMode="decimal"
                placeholder="999.00"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              />
            </label>
            <label className="block text-sm text-[var(--hm-text)]">
              Currency
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value, price: "" }))}
                className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hm-line)] bg-[var(--hm-surface)] px-4 text-[var(--hm-text)] outline-none focus:border-[var(--hm-terracotta)]"
              >
                <option value="INR">INR — India</option>
                <option value="USD">USD — International</option>
                <option value="AED">AED — UAE</option>
                <option value="OMR">OMR — Oman</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — UK</option>
                <option value="JPY">JPY — Japan</option>
              </select>
            </label>
          </div>
          {error && (
            <p role="alert" className="mt-5 text-sm text-orange-200">
              {error}
            </p>
          )}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="hm-button hm-button-primary disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save membership plan"}
              <Check className="size-4" />
            </button>
            <p className="flex items-center gap-2 text-xs text-[var(--hm-muted)]">
              <ShieldCheck className="size-4" />
              Previous membership pricing is immutable.
            </p>
          </div>
        </form>
      )}
      <section className="mt-8" aria-labelledby="hm-current-plans">
        <div className="flex items-center justify-between gap-3">
          <h2 id="hm-current-plans" className="hm-section-title">Available plans</h2>
          <span className="hm-ops-pill">{activePlans.length} current</span>
        </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {activePlans.length === 0 && (
          <div className="hm-ops-empty md:col-span-2">
            <Layers3 className="size-8 text-[#ecb873]" />
            <h3 className="mt-5 text-xl font-semibold">Your first plan starts here</h3>
            <p className="mt-3 text-sm text-[var(--hm-muted)]">
              Set up monthly, quarterly or annual memberships with flexible durations. Your price is
              always your decision.
            </p>
          </div>
        )}
        {activePlans.map((plan) => (
          <article
            key={plan.id}
            className="hm-ops-plan-card"
          >
            <div className="absolute -top-14 -right-14 size-36 rounded-full bg-[#f26b00]/10 blur-3xl" />
            <p className="text-xs font-semibold tracking-[.18em] text-[var(--hm-terracotta)] uppercase">
              {plan.archivedAt
                ? "Archived plan"
                : `${plan.durationCount} ${plan.durationUnit.toLowerCase()}`}
            </p>
            <h3 className="relative mt-4 text-xl font-semibold">{plan.name}</h3>
            <p className="hm-ops-plan-price mt-3">
              {formatMinorMoney(plan.priceMinor, plan.currency)}
            </p>
            <p className="mt-3 flex-1 text-sm leading-6 text-[var(--hm-muted)]">
              {plan.description || "A flexible membership for your club."}
            </p>
            {canManage && !plan.archivedAt && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--hm-line)] pt-4">
                <button
                  type="button"
                  onClick={() => edit(plan)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--hm-line)] px-4 text-xs text-[#f5c989] hover:bg-[var(--hm-raised)]"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void archive(plan.id)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs text-[#dfb6a4] hover:bg-[var(--hm-raised)] disabled:opacity-50"
                >
                  <Archive className="size-3.5" />
                  Archive
                </button>
              </div>
            )}
          </article>
        ))}
      </div>      </section>
      {archivedPlans.length > 0 && (
        <details className="hm-ops-section mt-6">
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="font-semibold">Archived plans <span className="hm-ops-pill ml-2">{archivedPlans.length}</span></span>
            <span className="hm-small">Show historical offers</span>
          </summary>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {archivedPlans.map((plan) => (
              <article key={plan.id} className="hm-ops-plan-card hm-ops-plan-card--archived">
                <span className="hm-ops-pill">Archived</span>
                <h3 className="mt-5 text-lg font-semibold">{plan.name}</h3>
                <p className="hm-ops-plan-price mt-4">{formatMinorMoney(plan.priceMinor, plan.currency)}</p>
                <p className="hm-small mt-3">{plan.durationCount} {plan.durationUnit.toLowerCase()}</p>
                <p className="hm-small mt-3">{plan.description || "A previous membership offer."}</p>
              </article>
            ))}
          </div>
        </details>
      )}

    </div>
  );
}
