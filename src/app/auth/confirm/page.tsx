"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function ConfirmEmailPage() {
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "verifying" | "invalid">("loading");

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    const parsed = new URLSearchParams(fragment);
    const candidate = parsed.get("token");
    // The bearer token must not survive in history or referrer logs.
    window.history.replaceState(null, "", window.location.pathname);
    if (candidate && /^[A-Za-z0-9._~-]{16,1024}$/.test(candidate)) {
      setToken(candidate);
      setState("ready");
    } else {
      setState("invalid");
    }
  }, []);

  async function confirm() {
    if (!token || state !== "ready") return;
    setState("verifying");
    const result = await authClient.magicLink.verify({ query: { token } });
    setToken(null);
    if (result.error) {
      setState("invalid");
      return;
    }
    window.location.replace("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-5 py-14 text-neutral-100">
      <section className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl">
        <ShieldCheck aria-hidden="true" className="mb-5 size-9 text-amber-400" />
        <h1 className="text-3xl font-bold tracking-tight">Confirm your sign-in</h1>
        <p className="mt-3 text-sm leading-6 text-neutral-300">
          This private email link is single-use and expires after five minutes.
          Continue only if you requested access to ClubKeep.
        </p>
        {state === "ready" && (
          <button onClick={confirm}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-neutral-950 hover:bg-amber-400">
            Continue securely <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
        {(state === "loading" || state === "verifying") && (
          <p role="status" className="mt-6 text-sm text-amber-200">
            {state === "loading" ? "Checking the link…" : "Verifying your sign-in…"}
          </p>
        )}
        {state === "invalid" && (
          <div role="alert" className="mt-6 space-y-3 text-sm text-amber-100">
            <p>This link is missing, expired or already used. Request a fresh email link.</p>
            <Link href="/auth/sign-in" className="underline underline-offset-4">
              Return to sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
