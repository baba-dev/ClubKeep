"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Archive, CalendarPlus, Check, Link2, Pencil, ShieldCheck, X } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  durationUnit: string;
  durationCount: number;
  currency: string;
  priceMinor: number;
};
type Candidate = { id: string; name: string };
export function MemberActions({
  clubId,
  memberId,
  memberName,
  phoneE164,
  canManage,
  canElevate,
  archived,
  hasCurrent,
  linked,
  plans,
  candidates,
}: {
  clubId: string;
  memberId: string;
  memberName: string;
  phoneE164: string;
  canManage: boolean;
  canElevate: boolean;
  archived: boolean;
  hasCurrent: boolean;
  linked: boolean;
  plans: Plan[];
  candidates: Candidate[];
}) {
  const router = useRouter(),
    key = useRef<string | null>(null);
  const [section, setSection] = useState<"none" | "edit" | "assign" | "link">("none");
  const [name, setName] = useState(memberName),
    [phone, setPhone] = useState(phoneE164);
  const [planId, setPlanId] = useState(plans[0]?.id ?? ""),
    [startDate, setStartDate] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function post(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Operation failed");
    return data;
  }
  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setSection("none");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Operation failed");
    } finally {
      setBusy(false);
    }
  }
  function submitMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void execute(async () => {
      await post(`/api/clubs/${clubId}/members/${memberId}`, {
        displayName: name,
        phoneE164: phone.trim(),
      });
      setNotice("Member details updated.");
    });
  }
  function submitTerm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key.current) key.current = crypto.randomUUID();
    void execute(async () => {
      const target = hasCurrent ? "renew" : "subscriptions";
      await post(`/api/clubs/${clubId}/members/${memberId}/${target}`, {
        planId,
        operationKey: key.current,
        ...(!hasCurrent && startDate ? { startDate } : {}),
      });
      key.current = null;
      setNotice(hasCurrent ? "Membership renewed and recorded." : "Membership term created.");
    });
  }
  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !window.confirm(
        "Link this member to the selected verified account? Contact details are NOT identity proof."
      )
    )
      return;
    void execute(async () => {
      await post(`/api/clubs/${clubId}/members/${memberId}/link`, { membershipId: candidateId });
      setNotice("Verified account linked after manual confirmation.");
    });
  }
  function archive() {
    if (
      !window.confirm(
        "Archive this member? Historical subscriptions and their Personal account are preserved."
      )
    )
      return;
    void execute(async () => {
      await post(`/api/clubs/${clubId}/members/${memberId}/archive`, {});
      setNotice("Member archived.");
    });
  }
  return (
    <section className="mt-7 rounded-3xl border border-[#f6dc9b]/20 bg-[#1d140e] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-[#f1c587] uppercase">
            Reception desk
          </p>
          <h2 className="mt-2 text-xl font-semibold">Quick actions</h2>
        </div>
        <span className="flex items-center gap-2 text-xs text-[#a9907b]">
          <ShieldCheck className="size-4 text-[#e3b76a]" />
          Secure club-only actions
        </span>
      </div>
      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-orange-500/10 p-3 text-sm text-orange-200">
          {error}
        </p>
      )}
      {canManage && !archived && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSection(section === "assign" ? "none" : "assign");
              setError("");
            }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#f0b65d] to-[#f26b00] px-4 font-semibold text-[#261807]"
          >
            <CalendarPlus className="size-4" />
            {hasCurrent ? "Renew membership" : "Assign a plan"}
          </button>
          <button
            type="button"
            onClick={() => setSection(section === "edit" ? "none" : "edit")}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f6dc9b]/25 px-4 text-sm text-[#ffd29d]"
          >
            <Pencil className="size-4" />
            Edit details
          </button>
          {canElevate && !linked && candidates.length > 0 && (
            <button
              type="button"
              onClick={() => setSection(section === "link" ? "none" : "link")}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#f6dc9b]/25 px-4 text-sm text-[#ffd29d]"
            >
              <Link2 className="size-4" />
              Link account
            </button>
          )}
          {canElevate && (
            <button
              type="button"
              onClick={archive}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm text-[#e9b5a0]"
            >
              <Archive className="size-4" />
              Archive
            </button>
          )}
        </div>
      )}
      {section !== "none" && (
        <div className="mt-6 rounded-2xl border border-[#f6dc9b]/15 bg-[#100b08] p-5">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-semibold">
              {section === "edit"
                ? "Edit member"
                : section === "link"
                  ? "Manually link verified account"
                  : hasCurrent
                    ? "Renew membership"
                    : "Assign membership plan"}
            </h3>
            <button
              type="button"
              onClick={() => setSection("none")}
              aria-label="Close actions"
              className="rounded-lg p-2 text-[#c6a389] hover:bg-[#39281b]"
            >
              <X className="size-4" />
            </button>
          </div>
          {section === "edit" && (
            <form onSubmit={submitMember} className="grid gap-4">
              <label className="text-sm text-[#efcfac]">
                Member name
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#1c130e] px-4 text-[#fbf1e6]"
                />
              </label>
              <label className="text-sm text-[#efcfac]">
                Phone (optional, unverified)
                <input
                  inputMode="tel"
                  pattern="\+[1-9][0-9]{7,14}"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#1c130e] px-4 text-[#fbf1e6]"
                />
              </label>
              <button
                disabled={busy}
                className="min-h-11 rounded-xl bg-[#f5bd6c] px-5 font-bold text-[#261807]"
              >
                {busy ? "Saving…" : "Save details"}
              </button>
            </form>
          )}
          {section === "assign" && (
            <form onSubmit={submitTerm} className="grid gap-4">
              {plans.length === 0 ? (
                <p className="text-sm text-[#e7b99b]">
                  Create an active plan in Plan Studio before assigning a membership.
                </p>
              ) : (
                <>
                  <label className="text-sm text-[#efcfac]">
                    Membership plan
                    <select
                      required
                      value={planId}
                      onChange={(event) => {
                        setPlanId(event.target.value);
                        key.current = null;
                      }}
                      className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#1c130e] px-4 text-[#fbf1e6]"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} · {plan.durationCount} {plan.durationUnit.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!hasCurrent && (
                    <label className="text-sm text-[#efcfac]">
                      Start date{" "}
                      <span className="text-[#ab9279]">(optional; default today UTC)</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          key.current = null;
                        }}
                        className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#1c130e] px-4 text-[#fbf1e6]"
                      />
                    </label>
                  )}
                  <p className="text-xs leading-5 text-[#bba089]">
                    Memberships are recorded as historical terms. Recording or renewing access does
                    not collect a payment.
                  </p>
                  <button
                    disabled={busy || !planId}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#f5bd6c] px-5 font-bold text-[#261807]"
                  >
                    {busy ? "Working…" : hasCurrent ? "Confirm renewal" : "Assign plan"}
                    <Check className="size-4" />
                  </button>
                </>
              )}
            </form>
          )}
          {section === "link" && (
            <form onSubmit={submitLink} className="grid gap-4">
              <p className="text-sm leading-6 text-[#bba089]">
                Choose an authenticated club member after confirming their identity in person. No
                phone-number-based matching is performed.
              </p>
              <label className="text-sm text-[#efcfac]">
                Verified ClubKeep account
                <select
                  required
                  value={candidateId}
                  onChange={(event) => setCandidateId(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#1c130e] px-4 text-[#fbf1e6]"
                >
                  <option value="">Select an account…</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={busy || !candidateId}
                className="min-h-11 rounded-xl bg-[#f5bd6c] px-5 font-bold text-[#261807]"
              >
                Confirm link
              </button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
