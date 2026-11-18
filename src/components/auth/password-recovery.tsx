"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { ClubKeepBrand } from "@/components/human-motion/media-components";

export function PasswordRecovery({ enabled }: { enabled: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const candidate = fragment.get("token");
    // Reset tokens are never retained in browser history or server GET URLs.
    window.history.replaceState(null, "", window.location.pathname);
    queueMicrotask(() => {
      if (candidate && /^[A-Za-z0-9._~-]{16,1024}$/.test(candidate)) setToken(candidate);
      else if (candidate) setMessage("This recovery link is invalid. Request a new one.");
    });
  }, []);

  async function requestLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: window.location.origin + "/auth/reset-password",
      });
    } catch {
      // Respond identically whether the user exists, the mailbox works, or a limiter rejects.
    } finally {
      setSent(true);
      setBusy(false);
    }
  }

  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enabled || busy || !token) return;
    if (password.length < 12 || password.length > 128 || password !== confirm) {
      setMessage("Use 12–128 characters and make sure your passwords match.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await authClient.resetPassword({ token, newPassword: password });
      if (response.error) {
        setMessage("Password could not be reset. The link may have expired or been used.");
      } else {
        setComplete(true);
        setToken(null);
        setPassword("");
        setConfirm("");
      }
    } catch {
      setMessage("Password could not be reset. Request a fresh link if this continues.");
    } finally { setBusy(false); }
  }

  return (
    <main className="hm-app hm-auth">
      <div className="hm-surface w-full max-w-xl p-6 sm:p-10">
        <div className="flex items-center justify-between gap-4"><ClubKeepBrand /><ClubThemeToggle /></div>
        <p className="hm-kicker mt-10 flex items-center gap-2 text-[var(--hm-sage-deep)]">
          <ShieldCheck className="size-4" aria-hidden="true" /> Private account recovery
        </p>
        <h1 className="hm-display mt-4 text-4xl">Restore your access.</h1>
        <p className="hm-muted mt-3 text-sm leading-7">
          Only you can reset your ClubKeep password. Club managers cannot reset your personal identity.
        </p>
        {!enabled ? (
          <p role="status" className="hm-auth-note">Email recovery is not currently available. Sign in with an existing approved method.</p>
        ) : complete ? (
          <div role="status" className="hm-auth-mail-sent mt-7">
            <LockKeyhole className="size-7" aria-hidden="true" />
            <h2 className="hm-display">Password updated.</h2>
            <p>Your previous sessions have been revoked. Sign in again using your new password.</p>
            <Link href="/auth/sign-in" className="hm-button hm-button-primary">Return to sign in <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
        ) : token ? (
          <form onSubmit={reset} className="hm-auth-fields mt-7">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" className="hm-auth-input" type="password" autoComplete="new-password"
              minLength={12} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} />
            <p className="hm-small">Use 12 to 128 characters. A unique password or passphrase is recommended.</p>
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" className="hm-auth-input" type="password" autoComplete="new-password"
              minLength={12} maxLength={128} required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            <button className="hm-button hm-button-primary hm-auth-submit" type="submit" disabled={busy}>
              {busy ? "Updating…" : "Change password"} <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>
        ) : sent ? (
          <div role="status" className="hm-auth-mail-sent mt-7">
            <Mail className="size-7" aria-hidden="true" />
            <h2 className="hm-display">Check your inbox.</h2>
            <p>If that address is eligible, you'll receive a one-time reset link valid for ten minutes. Check spam as well.</p>
          </div>
        ) : (
          <form onSubmit={requestLink} className="hm-auth-fields mt-7">
            <label htmlFor="recovery-email">Your account email</label>
            <input id="recovery-email" type="email" autoComplete="email" inputMode="email"
              required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com" className="hm-auth-input" />
            <button className="hm-button hm-button-primary hm-auth-submit" type="submit" disabled={busy}>
              {busy ? "Working…" : "Email me a recovery link"} <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>
        )}
        {message && <p className="hm-auth-alert" role="alert">{message}</p>}
        <Link href="/auth/sign-in" className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--hm-sage-deep)]">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
        </Link>
      </div>
    </main>
  );
}
