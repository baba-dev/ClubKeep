"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck, UserRoundPlus } from "lucide-react";

export function MemberCreateForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/clubs/${clubId}/members`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, phoneE164: phone.trim() }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Registration failed");
      router.push(`/clubs/${clubId}/members/${body.member.id}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration could not be completed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mt-8 max-w-2xl overflow-hidden rounded-[1.75rem] border border-[#f6dc9b]/20 bg-gradient-to-br from-[#281b11] to-[#150e09] p-6 shadow-xl sm:p-9"
    >
      <div className="flex size-12 items-center justify-center rounded-2xl bg-[#f26b00]/15">
        <UserRoundPlus aria-hidden="true" className="size-6 text-[#ffb56d]" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold">Walk-in registration</h2>
      <p className="mt-2 text-sm leading-6 text-[#b9a08b]">
        Register someone at reception without making them create an account. You can link an
        independently verified ClubKeep account later.
      </p>
      <div className="mt-7 grid gap-5">
        <div>
          <label htmlFor="b1-name" className="mb-2 block text-sm font-semibold text-[#f4dfb0]">
            Full name <span className="text-[#f89a61]">*</span>
          </label>
          <input
            id="b1-name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Aarav Sharma"
            className="min-h-12 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0907] px-4 text-[#fbf1e6] outline-none placeholder:text-[#746658] focus:border-[#e9a446]"
          />
        </div>
        <div>
          <label htmlFor="b1-phone" className="mb-2 block text-sm font-semibold text-[#f4dfb0]">
            Mobile number <span className="font-normal text-[#af9781]">(optional)</span>
          </label>
          <input
            id="b1-phone"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+919876543210"
            pattern="\+[1-9][0-9]{7,14}"
            title="Include your international dialing prefix, e.g. +91…"
            className="min-h-12 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0c0907] px-4 text-[#fbf1e6] outline-none placeholder:text-[#746658] focus:border-[#e9a446]"
          />
          <p className="mt-2 text-xs text-[#aa9079]">
            For club contact only. This number is unverified and never used for authentication or
            account linking.
          </p>
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-[#f57c45]/30 bg-[#f57c45]/10 p-3 text-sm text-[#ffb591]"
        >
          {error}
        </p>
      )}
      <button
        disabled={busy || name.trim().length < 2}
        type="submit"
        className="mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f1bb5c] to-[#f26b00] px-6 py-3 font-bold text-[#281607] shadow-lg shadow-orange-900/20 hover:brightness-110 disabled:opacity-50"
      >
        {busy ? "Registering…" : "Register member"} <ArrowRight className="size-4" />
      </button>
      <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-[#a9937e]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#d7a95b]" />
        Private roster. No SMS, no automatic account creation, and no medical information collected.
      </p>
    </form>
  );
}
