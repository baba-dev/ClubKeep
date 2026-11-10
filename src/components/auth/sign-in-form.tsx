"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Fingerprint, KeyRound, Mail, ShieldCheck } from "lucide-react";
import type { AuthFeatures } from "@/lib/auth-config";
import { authClient } from "@/lib/auth-client";

type Mode = "email" | "password";
export function SignInForm({
  features,
  oauthError,
}: {
  features: AuthFeatures;
  oauthError: string | null;
}) {
  const router = useRouter();
  function postSignInDestination() {
    return window.sessionStorage.getItem("clubkeep:pending-invite") ? "/join" : "/home";
  }
  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    oauthError === "account_not_linked"
      ? "This email is already registered. Sign in with your existing method, then link Google in Account Security."
      : oauthError
        ? "This sign-in could not be completed. Please try again."
        : ""
  );
  const [mailSent, setMailSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = window.setInterval(() => {
      setCooldownSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  async function google() {
    setBusy(true);
    setNotice("");
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: postSignInDestination(),
        errorCallbackURL: "/auth/sign-in",
      });
      if (error) setNotice("Google sign-in could not be started.");
    } catch {
      setNotice("Google sign-in is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        setNotice("Passkey sign-in was cancelled or could not be verified.");
      } else {
        router.replace(postSignInDestination());
        router.refresh();
      }
    } catch {
      setNotice("Passkey sign-in was cancelled or could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function emailLink() {
    if (!email || busy || Date.now() < cooldownUntil) return;
    setBusy(true);
    setNotice("");
    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: postSignInDestination(),
        newUserCallbackURL: postSignInDestination(),
        errorCallbackURL: "/auth/sign-in",
      });
      // Generic success regardless of whether the mailbox exists.
      setMailSent(true);
      setCooldownUntil(Date.now() + 60_000);
      setCooldownSeconds(60);
    } catch {
      // The UI must not expose SMTP or account-existence details.
      setMailSent(true);
      setCooldownUntil(Date.now() + 60_000);
      setCooldownSeconds(60);
    } finally {
      setBusy(false);
    }
  }

  async function legacyPassword() {
    if (!email || !password || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        callbackURL: postSignInDestination(),
      });
      if (error) {
        setNotice("Could not sign in. Check your credentials and try again.");
      } else {
        router.replace(postSignInDestination());
        router.refresh();
      }
    } catch {
      setNotice("Password sign-in could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const newMethodsAvailable = features.google || features.emailLink || features.passkey;
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0705] px-5 py-14 text-[#fbf1e6]">
      <div className="pointer-events-none absolute -top-40 left-1/3 size-[35rem] rounded-full bg-[#f26b00]/10 blur-[110px]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-[#f6dc9b]/15 bg-[#17100b] shadow-2xl lg:grid-cols-[1fr_1.05fr]">
        <section className="hidden flex-col justify-between border-r border-[#f6dc9b]/10 bg-gradient-to-br from-[#25160d] via-[#17100b] to-[#090604] p-12 lg:flex">
          <div className="text-2xl font-bold tracking-tight">
            <span className="mr-3 inline-flex size-11 items-center justify-center rounded-2xl bg-[#f26b00] text-[#2a1608]">
              CK
            </span>
            ClubKeep
          </div>
          <div>
            <p className="mb-3 text-xs font-semibold tracking-[.25em] text-[#f1d58b] uppercase">
              Personal + Business
            </p>
            <h2 className="max-w-md text-5xl leading-tight font-semibold tracking-tight">
              Your progress. <span className="text-[#ffa451]">Your club.</span> One account.
            </h2>
            <p className="mt-6 max-w-md leading-7 text-[#b8a08c]">
              One private Personal space. Every club you belong to. A safer way to sign in, without
              SMS.
            </p>
          </div>
          <p className="text-sm text-[#b8a08c]">Built around your privacy, not a phone number.</p>
        </section>
        <section className="px-6 py-10 sm:px-10 sm:py-12">
          <Link
            href="/"
            className="mb-9 inline-flex items-center gap-2 text-xl font-bold lg:hidden"
          >
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#f26b00] text-[#2a1608]">
              CK
            </span>
            ClubKeep
          </Link>
          <div className="flex items-center gap-2 text-xs tracking-[.18em] text-[#f1d58b] uppercase">
            <ShieldCheck size={15} aria-hidden="true" /> Secure account
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to ClubKeep
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
            Continue with an existing account or choose a secure sign-in method.
          </p>
          {!newMethodsAvailable && (
            <p
              role="status"
              className="mt-6 rounded-xl border border-[#f6dc9b]/20 bg-[#2a1d12] p-4 text-sm text-[#f1d58b]"
            >
              New account registration is not yet activated. Existing password users can still sign
              in.
            </p>
          )}
          {notice && (
            <p
              role="alert"
              className="mt-6 rounded-xl border border-[#f26b00]/25 bg-[#28170d] p-3 text-sm text-[#ffbf86]"
            >
              {notice}
            </p>
          )}
          <div className="mt-8 space-y-3">
            {features.google && (
              <button
                type="button"
                disabled={busy}
                onClick={google}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#f6dc9b]/20 bg-[#fff8f1] px-5 py-3.5 font-semibold text-[#2a1608] hover:bg-white disabled:opacity-60"
              >
                <KeyRound className="size-5" aria-hidden="true" /> Continue with Google
              </button>
            )}
            {features.passkey && (
              <button
                type="button"
                disabled={busy}
                onClick={passkey}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#f6dc9b]/25 px-5 py-3.5 font-medium hover:bg-[#2b1b10] disabled:opacity-60"
              >
                <Fingerprint className="size-5 text-[#f1d58b]" aria-hidden="true" /> Sign in with
                passkey
              </button>
            )}
          </div>
          {(features.emailLink || features.legacyPassword) && (
            <div className="mt-7 border-t border-[#f6dc9b]/10 pt-7">
              <div className="mb-4 flex items-center gap-5">
                {features.emailLink && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("email");
                      setMailSent(false);
                    }}
                    className={
                      mode === "email"
                        ? "border-b-2 border-[#f26b00] pb-2 text-sm font-semibold"
                        : "pb-2 text-sm text-[#b8a08c]"
                    }
                  >
                    Email link
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMode("password");
                    setMailSent(false);
                  }}
                  className={
                    mode === "password" || !features.emailLink
                      ? "border-b-2 border-[#f26b00] pb-2 text-sm font-semibold"
                      : "pb-2 text-sm text-[#b8a08c]"
                  }
                >
                  Existing password
                </button>
              </div>
              {mailSent && mode === "email" ? (
                <div className="space-y-4 rounded-xl border border-[#f6dc9b]/15 bg-[#23180f] p-5">
                  <Mail className="size-6 text-[#ffa451]" aria-hidden="true" />
                  <h3 className="font-semibold">Check your inbox</h3>
                  <p className="text-sm leading-6 text-[#b8a08c]">
                    If this email is eligible, a private sign-in link is on its way. It expires in
                    five minutes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setMailSent(false)}
                    className="text-sm text-[#ffa451] underline"
                  >
                    Use another email
                  </button>
                  <button
                    type="button"
                    disabled={busy || cooldownSeconds > 0}
                    onClick={emailLink}
                    className="ml-4 text-sm text-[#f1d58b] underline disabled:opacity-40"
                  >
                    Resend link
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void (mode === "password" || !features.emailLink
                      ? legacyPassword()
                      : emailLink());
                  }}
                  className="space-y-4"
                >
                  <label htmlFor="ck-email" className="block text-sm font-medium">
                    Email address
                  </label>
                  <input
                    id="ck-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-[#f6dc9b]/20 bg-[#110c09] px-4 py-3 text-sm text-[#fbf1e6] outline-none focus:border-[#f26b00]"
                  />
                  {(mode === "password" || !features.emailLink) && (
                    <>
                      <label htmlFor="ck-password" className="block text-sm font-medium">
                        Password
                      </label>
                      <input
                        id="ck-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#f6dc9b]/20 bg-[#110c09] px-4 py-3 text-sm text-[#fbf1e6] outline-none focus:border-[#f26b00]"
                      />
                    </>
                  )}
                  <button
                    disabled={busy}
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#d4a84a] to-[#f26b00] px-5 py-3.5 font-semibold text-[#2a1608] hover:brightness-110 disabled:opacity-60"
                  >
                    {busy
                      ? "Working…"
                      : mode === "password" || !features.emailLink
                        ? "Sign in"
                        : "Email me a secure link"}
                    {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
                  </button>
                </form>
              )}
            </div>
          )}
          <p className="mt-7 text-xs leading-5 text-[#b8a08c]">
            No SMS verification. Never share your passkey or email link with others. Club
            invitations grant club membership only.
          </p>
        </section>
      </div>
    </main>
  );
}
