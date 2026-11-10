"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { isInviteToken } from "@/lib/invite-token";

const STORAGE_KEY = "clubkeep:pending-invite";

type Preview = { name: string; role: "MEMBER"; expiresAt: string };

export function JoinClubClient() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "working">("loading");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const fromUrl = fragment.get("invite");
    // Remove bearer from URL/history before any network request or navigation.
    window.history.replaceState(null, "", window.location.pathname);
    const value = fromUrl ?? window.sessionStorage.getItem(STORAGE_KEY);
    if (!isInviteToken(value)) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setState("invalid"));
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, value);
    queueMicrotask(() => setToken(value));
    void fetch("/api/invitations/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      body: JSON.stringify({ token: value }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Invalid invitation");
        return (await response.json()) as { club: Preview };
      })
      .then(({ club }) => {
        setPreview(club);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, []);

  async function claim() {
    if (!token || state !== "ready") return;
    setState("working");
    setNotice("");
    try {
      const response = await fetch("/api/invitations/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        setState("invalid");
        setNotice(data.error || "This invitation is unavailable");
        return;
      }
      window.sessionStorage.removeItem(STORAGE_KEY);
      setToken(null);
      router.replace(`/clubs/${encodeURIComponent(data.clubId)}`);
      router.refresh();
    } catch {
      setState("ready");
      setNotice("Something went wrong. You can retry safely.");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0b0705] px-5 py-14 text-[#fbf1e6]">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#f6dc9b]/20 bg-[#17100b] p-7 shadow-2xl sm:p-10">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#f26b00]/15"><Users aria-hidden="true" className="size-6 text-[#ffa451]" /></span>
        <p className="mt-7 text-xs font-semibold tracking-[.2em] text-[#f1d58b] uppercase">Your personal invitation</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{preview ? `Join ${preview.name}` : "Join a club"}</h1>
        <p className="mt-4 text-sm leading-7 text-[#b8a08c]">Your private ClubKeep account stays yours. Accepting an invite adds only a club membership and never shares your Personal records.</p>
        {state === "loading" && <p role="status" className="mt-8 text-sm text-[#f1d58b]">Checking invitation…</p>}
        {state === "invalid" && (
          <div role="alert" className="mt-8 rounded-2xl border border-[#f1d58b]/25 p-5 text-sm text-[#f1d58b]">
            <p>{notice || "This invitation is expired, revoked, already claimed or unavailable. Ask the club for a new one."}</p>
          </div>
        )}
        {state === "ready" && preview && (
          <div className="mt-7 rounded-2xl border border-[#f6dc9b]/15 bg-[#24180f] p-5 text-sm">
            <p className="font-semibold">{preview.name}</p>
            <p className="mt-1 text-[#b8a08c]">Member access · One-time invitation</p>
            <p className="mt-2 text-xs text-[#f1d58b]">Expires {new Date(preview.expiresAt).toLocaleDateString()}</p>
          </div>
        )}
        {!isPending && state === "ready" && !session?.user && (
          <Link href="/auth/sign-in" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f26b00] px-5 py-3 font-semibold text-[#251306]">Sign in to accept <ArrowRight className="size-4" /></Link>
        )}
        {!isPending && state === "ready" && session?.user && (
          session.user.emailVerified ? (
            <button disabled={!token} onClick={claim} className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4a84a] to-[#f26b00] px-5 py-3 font-semibold text-[#251306] disabled:opacity-50">Accept club invitation <ArrowRight className="size-4" /></button>
          ) : (
            <p className="mt-7 text-sm text-[#f1d58b]">Verify your email before claiming this invitation.</p>
          )
        )}
        {state === "working" && <p role="status" className="mt-7 text-[#f1d58b]">Joining club securely…</p>}
        {notice && state !== "invalid" && <p role="alert" className="mt-4 text-sm text-[#ffbd87]">{notice}</p>}
        <p className="mt-7 flex items-center gap-2 text-xs leading-5 text-[#b8a08c]"><ShieldCheck className="size-4 shrink-0 text-[#ffa451]" /> A club invite is not phone verification or account recovery.</p>
        <Link href="/home" className="mt-7 inline-block text-sm text-[#ffa451] underline underline-offset-4">Back to ClubKeep</Link>
      </section>
    </main>
  );
}
