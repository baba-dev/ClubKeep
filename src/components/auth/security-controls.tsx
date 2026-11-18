"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Fingerprint,
  KeyRound,
  Laptop2,
  LockKeyhole,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { AuthFeatures } from "@/lib/auth-config";

type PasskeyItem = { id: string; name?: string | null; createdAt?: Date | string | null };
type SessionItem = {
  token: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  expiresAt: Date | string;
  userAgent?: string | null;
};
function deviceLabel(agent: string | null | undefined): string {
  if (!agent) return "Unknown device";
  const platform = /android/i.test(agent)
    ? "Android"
    : /iphone|ipad|ios/i.test(agent)
      ? "iOS"
      : /windows/i.test(agent)
        ? "Windows"
        : /macintosh|mac os/i.test(agent)
          ? "Mac"
          : /linux/i.test(agent)
            ? "Linux"
            : "Device";
  const browser = /edg\//i.test(agent)
    ? "Edge"
    : /firefox\//i.test(agent)
      ? "Firefox"
      : /chrome\//i.test(agent)
        ? "Chrome"
        : /safari\//i.test(agent)
          ? "Safari"
          : "Browser";
  return browser + " on " + platform;
}
function activityDate(value: Date | string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Unknown";
}

export function SecurityControls({
  features,
  email,
  verified,
}: {
  features: AuthFeatures;
  email: string;
  verified: boolean;
}) {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [passwordLinked, setPasswordLinked] = useState(false);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [currentToken, setCurrentToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [accounts, allSessions, currentSession] = await Promise.all([
        authClient.listAccounts(),
        authClient.listSessions(),
        authClient.getSession(),
      ]);
      if (!accounts.error && accounts.data) {
        setGoogleLinked(accounts.data.some((account) => account.providerId === "google"));
        setPasswordLinked(accounts.data.some((account) => account.providerId === "credential"));
      }
      if (!allSessions.error && allSessions.data) setSessions(allSessions.data);
      if (!currentSession.error && currentSession.data?.session) {
        setCurrentToken(currentSession.data.session.token);
      }
      if (features.passkey) {
        const result = await authClient.passkey.listUserPasskeys();
        if (!result.error && result.data) setPasskeys(result.data);
      }
    } catch {
      setNotice("Account details could not be loaded. Please retry.");
    }
  }, [features.passkey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  async function withAction(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch {
      setNotice("That security change could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  function addPasskey() {
    void withAction(async () => {
      const result = await authClient.passkey.addPasskey({ name: "My passkey" });
      setNotice(
        result.error ? "Passkey registration could not be verified." : "Passkey registered."
      );
      await refresh();
    });
  }

  function removePasskey(id: string) {
    if (
      !window.confirm(
        "Remove this passkey? Another recovery method and a recent sign-in are required."
      )
    )
      return;
    void withAction(async () => {
      const result = await authClient.passkey.deletePasskey({ id });
      setNotice(
        result.error
          ? "A recent sign-in and another recovery method are required."
          : "Passkey removed."
      );
      await refresh();
    });
  }

  function renamePasskey(id: string, oldName: string | null | undefined) {
    const name = window.prompt("Passkey name", oldName || "My passkey")?.trim();
    if (!name || name.length > 60) return;
    void withAction(async () => {
      const result = await authClient.passkey.updatePasskey({ id, name });
      setNotice(result.error ? "Unable to rename passkey." : "Passkey renamed.");
      await refresh();
    });
  }

  function linkGoogle() {
    void withAction(async () => {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/account/security",
      });
      if (result.error) setNotice("Sign in again before linking Google.");
    });
  }

  function revokeSession(token: string) {
    if (!window.confirm("End this session? That device will need to sign in again.")) return;
    void withAction(async () => {
      const result = await authClient.revokeSession({ token });
      setNotice(result.error ? "Could not end that session." : "Session ended.");
      await refresh();
    });
  }

  function revokeOthers() {
    if (!window.confirm("Sign out every other device? Those devices will need to sign in again."))
      return;
    void withAction(async () => {
      const result = await authClient.revokeOtherSessions();
      setNotice(
        result.error ? "Other sessions could not be revoked." : "Other sessions signed out."
      );
      await refresh();
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword || newPassword.length < 12 || newPassword.length > 128) {
      setNotice("Use 12–128 characters and matching new passwords.");
      return;
    }
    void withAction(async () => {
      const result = await authClient.changePassword({
        currentPassword: oldPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      setNotice(
        result.error
          ? "Password could not be changed. Check your current password."
          : "Password changed. Sessions on other devices have been revoked."
      );
      if (!result.error) {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      await refresh();
    });
  }

  const otherSessions = sessions.filter((session) => session.token !== currentToken);

  return (
    <div className="mt-8 space-y-5">
      {notice && (
        <p role="status" className="hm-auth-alert">
          {notice}
        </p>
      )}
      <section className="hm-surface hm-security-card">
        <h2 className="flex items-center gap-2">
          <Mail className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" /> Account email
        </h2>
        <p className="mt-3 break-all">{email}</p>
        <p className="mt-1 font-semibold text-[var(--hm-sage-deep)]">
          {verified
            ? "Email verified"
            : "Email not yet verified. Your existing password remains available."}
        </p>
      </section>
      <section className="hm-surface hm-security-card">
        <h2 className="flex items-center gap-2">
          <Laptop2 className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" /> Signed-in
          devices
        </h2>
        <p className="mt-3">
          These are active ClubKeep sessions. End any session you don&apos;t recognize. Revocation
          is enforced by the server.
        </p>
        <div className="hm-security-list">
          {sessions.map((session) => (
            <div key={session.token} className="hm-security-row">
              <div className="hm-security-row-info">
                <div className="hm-security-row-title">
                  {deviceLabel(session.userAgent)}{" "}
                  {session.token === currentToken ? "· This session" : ""}
                </div>
                <div className="hm-security-row-note">
                  Last activity: {activityDate(session.updatedAt)} · Expires:{" "}
                  {activityDate(session.expiresAt)}
                </div>
              </div>
              {session.token !== currentToken && (
                <button
                  type="button"
                  className="hm-security-action hm-security-action-danger"
                  disabled={busy}
                  onClick={() => revokeSession(session.token)}
                >
                  End session
                </button>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="hm-small">No sessions could be loaded. Refresh to try again.</p>
          )}
        </div>
        {otherSessions.length > 0 && (
          <button
            type="button"
            className="hm-security-action hm-security-action-danger mt-5"
            disabled={busy}
            onClick={revokeOthers}
          >
            Sign out all other devices
          </button>
        )}
      </section>
      {passwordLinked && (
        <section className="hm-surface hm-security-card">
          <h2 className="flex items-center gap-2">
            <LockKeyhole className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" /> Change
            password
          </h2>
          <p className="mt-3">
            Changing your password signs out all other sessions. Keep your new password unique.
          </p>
          <form onSubmit={changePassword} className="mt-5 grid gap-4">
            <label className="hm-security-field">
              Current password
              <input
                className="hm-security-input"
                type="password"
                autoComplete="current-password"
                required
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
              />
            </label>
            <label className="hm-security-field">
              New password
              <input
                className="hm-security-input"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </label>
            <label className="hm-security-field">
              Confirm new password
              <input
                className="hm-security-input"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </label>
            <button type="submit" disabled={busy} className="hm-button hm-button-primary w-fit">
              Update password
            </button>
          </form>
        </section>
      )}
      {features.google && (
        <section className="hm-surface hm-security-card">
          <h2 className="flex items-center gap-2">
            <KeyRound className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" /> Google
            account
          </h2>
          <p className="mt-3">
            {googleLinked
              ? "Your Google identity is linked."
              : "Link Google only after signing in with your existing credentials."}
          </p>
          {!googleLinked && (
            <button
              type="button"
              className="hm-security-action mt-4"
              disabled={busy}
              onClick={linkGoogle}
            >
              Link Google
            </button>
          )}
        </section>
      )}
      {features.passkey && (
        <section className="hm-surface hm-security-card">
          <h2 className="flex items-center gap-2">
            <Fingerprint className="size-5 text-[var(--hm-sage-deep)]" aria-hidden="true" />{" "}
            Passkeys
          </h2>
          <p className="mt-3">
            Use your device fingerprint, face or PIN. ClubKeep stores public keys, not biometric
            samples. Keep a backup method.
          </p>
          <div className="hm-security-list">
            {passkeys.map((item) => (
              <div key={item.id} className="hm-security-row">
                <div className="hm-security-row-info">
                  <span className="hm-security-row-title">{item.name || "Passkey"}</span>
                  {item.createdAt && (
                    <div className="hm-security-row-note">Added {activityDate(item.createdAt)}</div>
                  )}
                </div>
                <div className="hm-security-actions">
                  <button
                    type="button"
                    disabled={busy}
                    className="hm-security-action"
                    onClick={() => renamePasskey(item.id, item.name)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    className="hm-security-action hm-security-action-danger inline-flex items-center gap-1"
                    onClick={() => removePasskey(item.id)}
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={addPasskey}
            className="hm-button hm-button-primary mt-5"
          >
            <Plus className="size-4" aria-hidden="true" /> Add a passkey
          </button>
        </section>
      )}
      <p className="hm-small flex items-center gap-2">
        <ShieldCheck className="size-4" aria-hidden="true" />
        All changes use your existing ClubKeep identity and server-side authorization.
      </p>
    </div>
  );
}
