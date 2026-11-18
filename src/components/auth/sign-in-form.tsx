"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight, CheckCircle2, Eye, EyeOff, Fingerprint, KeyRound,
  LockKeyhole, Mail, ShieldCheck,
} from "lucide-react";
import type { AuthFeatures } from "@/lib/auth-config";
import { authClient } from "@/lib/auth-client";
import { MINIMUM_ACCOUNT_AGE, PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";
import { ClubThemeToggle } from "@/components/clubs/theme-toggle";
import { ClubKeepBrand, ThemeArtwork } from "@/components/human-motion/media-components";
import { HM_MEDIA } from "@/components/human-motion/media";

type Mode = "email" | "password";
const REMEMBERED_EMAIL = "clubkeep:remembered-email";

function destination() {
  return window.sessionStorage.getItem("clubkeep:pending-invite") ? "/join" : "/home";
}

function rememberEmail(email: string, allow: boolean) {
  try {
    if (allow) window.localStorage.setItem(REMEMBERED_EMAIL, email.trim().toLowerCase());
    else window.localStorage.removeItem(REMEMBERED_EMAIL);
  } catch {
    // Local storage may be blocked in private browsing; sign-in still works.
  }
}

export function SignInForm({
  features, oauthError,
}: {
  features: AuthFeatures;
  oauthError: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(features.emailLink ? "email" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [rememberAccount, setRememberAccount] = useState(false);
  const [knownAccount, setKnownAccount] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(
    oauthError === "account_not_linked"
      ? "That email is already registered. Sign in using your existing method, then link Google in Account Security."
      : oauthError ? "Your sign-in could not be completed. Please try again." : ""
  );
  const [mailSent, setMailSent] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    let previous = "";
    try { previous = window.localStorage.getItem(REMEMBERED_EMAIL) ?? ""; }
    catch { /* optional storage */ }
    queueMicrotask(() => {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(previous) && previous.length <= 254) {
        setEmail(previous);
        setRememberAccount(true);
        setKnownAccount(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!cooldownUntil) return;
    const interval = window.setInterval(() => {
      setCooldownSeconds(Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  function forgetAccount() {
    rememberEmail("", false);
    setRememberAccount(false);
    setKnownAccount(false);
    setEmail("");
    setPassword("");
    setMailSent(false);
  }

  async function google() {
    setBusy(true);
    setNotice("");
    try {
      const { error } = await authClient.signIn.social({
        provider: "google",
        callbackURL: destination(),
        errorCallbackURL: "/auth/sign-in",
      });
      if (error) setNotice("Google sign-in could not be started.");
    } catch {
      setNotice("Google sign-in is temporarily unavailable.");
    } finally { setBusy(false); }
  }

  async function passkey() {
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) setNotice("The passkey was cancelled or could not be verified.");
      else {
        router.replace(destination());
        router.refresh();
      }
    } catch {
      setNotice("The passkey was cancelled or could not be verified.");
    } finally { setBusy(false); }
  }

  async function emailLink() {
    if (!email || busy || Date.now() < cooldownUntil) return;
    setBusy(true);
    setNotice("");
    try {
      await authClient.signIn.magicLink({
        email: email.trim(),
        callbackURL: destination(),
        newUserCallbackURL: destination(),
        errorCallbackURL: "/auth/sign-in",
      });
    } catch {
      // Do not reveal SMTP status or whether an email account exists.
    } finally {
      rememberEmail(email, rememberAccount);
      setMailSent(true);
      setCooldownUntil(Date.now() + 60_000);
      setCooldownSeconds(60);
      setBusy(false);
    }
  }

  async function passwordSignIn() {
    if (!email || !password || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const { error } = await authClient.signIn.email({
        email: email.trim(),
        password,
        rememberMe,
        callbackURL: destination(),
      });
      if (error) setNotice("Could not sign in. Check your credentials and try again.");
      else {
        rememberEmail(email, rememberAccount);
        setPassword("");
        router.replace(destination());
        router.refresh();
      }
    } catch {
      setNotice("Password sign-in could not be completed.");
    } finally { setBusy(false); }
  }

  const withEmail = features.emailLink || features.legacyPassword;
  const usingPassword = mode === "password" || !features.emailLink;
  return (
    <main className="hm-app hm-auth">
      <a href="#auth-form" className="hm-skip-link">Skip to sign-in form</a>
      <div className="hm-auth-shell">
        <section className="hm-auth-story" aria-label="ClubKeep introduction">
          <div className="hm-auth-story-top"><ClubKeepBrand /></div>
          <div className="hm-auth-story-body">
            <p className="hm-kicker">Human Motion 2.0 · ClubKeep</p>
            <h2 className="hm-display">Every move starts with belonging.</h2>
            <p>One thoughtfully designed place for your clubs, memberships, and personal progress.</p>
            <div className="hm-auth-story-caption">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Your personal account. Your communities. Your choice.
            </div>
          </div>
          <ThemeArtwork pair={HM_MEDIA.illustrations.sidebarLandscape} className="hm-auth-landscape" />
          <ThemeArtwork pair={HM_MEDIA.illustrations.botanicalCorner} className="hm-auth-botanical" />
        </section>
        <section className="hm-auth-panel" id="auth-form" aria-label="Sign in">
          <div className="hm-auth-toolbar">
            <span className="hm-kicker hm-muted">Members · Clubs · Teams</span>
            <ClubThemeToggle />
          </div>
          <div className="hm-auth-mobile-brand"><ClubKeepBrand /></div>
          <p className="hm-kicker hm-auth-eyebrow"><ShieldCheck className="size-4" aria-hidden="true" /> Your secure space</p>
          <h1 className="hm-display hm-auth-heading">{knownAccount ? "Welcome back." : "Welcome to ClubKeep."}</h1>
          <p className="hm-auth-description">
            {knownAccount ? "Your email is ready. Choose how you'd like to continue." :
              "Sign in, or create your account with Google or a secure email link."}
          </p>
          {knownAccount && (
            <button type="button" onClick={forgetAccount} className="hm-auth-forget">
              Not your account? Remove saved email
            </button>
          )}
          {!features.google && !features.emailLink && (
            <p role="status" className="hm-auth-note">
              New account registration is not activated. Existing password accounts can sign in.
            </p>
          )}
          {notice && <p role="alert" className="hm-auth-alert">{notice}</p>}
          {(features.google || features.passkey) && (
            <div className="hm-auth-methods">
              {features.google && (
                <button className="hm-button hm-button-secondary hm-auth-method" type="button" disabled={busy} onClick={google}>
                  <KeyRound className="size-5" aria-hidden="true" /> Continue with Google
                </button>
              )}
              {features.passkey && (
                <button className="hm-button hm-button-secondary hm-auth-method" type="button" disabled={busy} onClick={passkey}>
                  <Fingerprint className="size-5" aria-hidden="true" /> Sign in with passkey
                </button>
              )}
            </div>
          )}
          {withEmail && (
            <div className="hm-auth-email">
              {features.google || features.passkey ? <p className="hm-auth-divider"><span>or continue with email</span></p> : null}
              {features.emailLink && features.legacyPassword && (
                <div className="hm-auth-tabs" role="group" aria-label="Email sign-in method">
                  <button type="button" aria-pressed={!usingPassword} onClick={() => { setMode("email"); setMailSent(false); setNotice(""); }}>
                    Email link
                  </button>
                  <button type="button" aria-pressed={usingPassword} onClick={() => { setMode("password"); setMailSent(false); setNotice(""); }}>
                    Password
                  </button>
                </div>
              )}
              {mailSent && !usingPassword ? (
                <div className="hm-auth-mail-sent" role="status">
                  <Mail className="size-7" aria-hidden="true" />
                  <h3 className="hm-display">Check your inbox.</h3>
                  <p>If this email is eligible, a private sign-in link is on its way. It works once and expires in five minutes.</p>
                  <div className="hm-auth-mail-actions">
                    <button type="button" onClick={() => setMailSent(false)}>Change email</button>
                    <button type="button" disabled={busy || cooldownSeconds > 0} onClick={emailLink}>
                      {cooldownSeconds > 0 ? "Resend in " + cooldownSeconds + "s" : "Resend link"}
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(event) => { event.preventDefault(); void (usingPassword ? passwordSignIn() : emailLink()); }} className="hm-auth-fields">
                  <label htmlFor="ck-email">Email address</label>
                  <input id="ck-email" name="email" type="email" autoComplete="email" inputMode="email" required value={email}
                    onChange={(event) => { setEmail(event.target.value); setKnownAccount(false); }}
                    placeholder="you@example.com" className="hm-auth-input" />
                  {usingPassword && (
                    <>
                      <div className="hm-auth-label-line">
                        <label htmlFor="ck-password">Password</label>
                        {features.passwordReset && <Link href="/auth/reset-password">Forgot password?</Link>}
                      </div>
                      <div className="hm-auth-password">
                        <input id="ck-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
                          required value={password} onChange={(event) => setPassword(event.target.value)}
                          onKeyUp={(event) => setCapsLock(event.getModifierState("CapsLock"))} className="hm-auth-input" />
                        <button type="button" onClick={() => setShowPassword((value) => !value)}
                          aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                          {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                        </button>
                      </div>
                      {capsLock && <p className="hm-auth-hint">Caps Lock appears to be on.</p>}
                      <label className="hm-auth-check">
                        <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                        Keep me signed in on this device
                      </label>
                    </>
                  )}
                  <label className="hm-auth-check">
                    <input type="checkbox" checked={rememberAccount} onChange={(event) => {
                      setRememberAccount(event.target.checked);
                      if (!event.target.checked) rememberEmail("", false);
                    }} />
                    Remember my email on this device
                  </label>
                  <button type="submit" disabled={busy || (mailSent && cooldownSeconds > 0)} className="hm-button hm-button-primary hm-auth-submit">
                    {busy ? "Working…" : usingPassword ? "Sign in securely" : "Send secure sign-in link"}
                    {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
                  </button>
                </form>
              )}
            </div>
          )}
          <Link href="/demo?role=owner&view=overview" className="hm-auth-demo">
            <Eye className="size-4" aria-hidden="true" /> Explore ClubKeep without signing in
          </Link>
          <p className="hm-auth-legal">
            By continuing, you agree to the <Link href={TERMS_PATH}>Terms of Use</Link> and
            <Link href={PRIVACY_PATH}> Privacy Notice</Link>, and confirm you are {MINIMUM_ACCOUNT_AGE} or older.
          </p>
          <p className="hm-auth-footnote"><LockKeyhole className="size-4" aria-hidden="true" />
            We never store passwords in your browser. A saved email is optional and can be removed anytime.
          </p>
        </section>
      </div>
    </main>
  );
}
