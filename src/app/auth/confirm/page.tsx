"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { ClubKeepBrand } from "@/components/human-motion/media-components";

export default function ConfirmEmailPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "verifying" | "invalid">("loading");

  useEffect(() => {
    const fragment = window.location.hash.slice(1);
    const parsed = new URLSearchParams(fragment);
    const candidate = parsed.get("token");
    // The bearer token must not survive in history or referrer logs.
    window.history.replaceState(null, "", window.location.pathname);
    // Read from browser location after mount, then schedule a state update.
    // Avoid a synchronous React effect render cascade.
    queueMicrotask(() => {
      if (candidate && /^[A-Za-z0-9._~-]{16,1024}$/.test(candidate)) {
        setToken(candidate);
        setState("ready");
      } else {
        setState("invalid");
      }
    });
  }, []);

  async function confirm() {
    if (!token || state !== "ready") return;
    setState("verifying");
    try {
      // POST body, never Better Auth's browser GET with ?token=... in access logs.
      const response = await fetch("/api/clubkeep/confirm-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "same-origin",
        cache: "no-store",
        redirect: "error",
      });
      setToken(null);
      if (!response.ok) {
        setState("invalid");
        return;
      }
      router.replace(window.sessionStorage.getItem("clubkeep:pending-invite") ? "/join" : "/home");
      router.refresh();
    } catch {
      setToken(null);
      setState("invalid");
    }
  }

  return (
    <main className="hm-app hm-auth">
      <section className="hm-surface w-full max-w-md p-8">
        <div className="mb-10 flex items-center justify-between gap-4"><ClubKeepBrand /><ClubThemeToggle /></div>
        <ShieldCheck aria-hidden="true" className="mb-5 size-9 text-[var(--hm-sage-deep)]" />
        <h1 className="hm-display text-3xl">Confirm your sign-in</h1>
        <p className="hm-muted mt-3 text-sm leading-6">
          This private email link is single-use and expires after five minutes. Continue only if you
          requested access to ClubKeep.
        </p>
        {state === "ready" && (
          <button
            onClick={confirm}
            className="hm-button hm-button-primary mt-7 w-full"
          >
            Continue securely <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        )}
        {(state === "loading" || state === "verifying") && (
          <p role="status" className="hm-muted mt-6 text-sm">
            {state === "loading" ? "Checking the link…" : "Verifying your sign-in…"}
          </p>
        )}
        {state === "invalid" && (
          <div role="alert" className="hm-auth-alert mt-6 space-y-3 text-sm">
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
