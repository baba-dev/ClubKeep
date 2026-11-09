"use client";
import { useCallback, useEffect, useState } from "react";
import { Fingerprint, KeyRound, Mail, Plus, Trash2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { AuthFeatures } from "@/lib/auth-config";

type PasskeyItem = { id: string; name?: string | null; createdAt?: Date | string | null };
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (features.passkey) {
      const { data, error } = await authClient.passkey.listUserPasskeys();
      if (!error && data) setPasskeys(data);
    }
    const accounts = await authClient.listAccounts();
    if (!accounts.error && accounts.data) {
      setGoogleLinked(accounts.data.some((account) => account.providerId === "google"));
    }
  }, [features.passkey]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [refresh]);

  async function addPasskey() {
    setBusy(true);
    setNotice("");
    try {
      const result = await authClient.passkey.addPasskey({ name: "My passkey" });
      setNotice(
        result.error
          ? "Passkey registration was cancelled or could not be verified."
          : "Passkey registered."
      );
      await refresh();
    } catch {
      setNotice("Passkey registration was cancelled or could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    if (
      !window.confirm(
        "Remove this passkey? Another recovery method and a recent sign-in are required."
      )
    )
      return;
    setBusy(true);
    try {
      const result = await authClient.passkey.deletePasskey({ id });
      setNotice(
        result.error
          ? "Sign in again and confirm another recovery method first."
          : "Passkey removed."
      );
      await refresh();
    } catch {
      setNotice("Passkey could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  async function renamePasskey(id: string, oldName: string | null | undefined) {
    const name = window.prompt("Passkey name", oldName || "My passkey")?.trim();
    if (!name || name.length > 60) return;
    setBusy(true);
    try {
      const result = await authClient.passkey.updatePasskey({ id, name });
      setNotice(result.error ? "Unable to rename passkey." : "Passkey renamed.");
      await refresh();
    } catch {
      setNotice("Unable to rename passkey.");
    } finally {
      setBusy(false);
    }
  }

  async function linkGoogle() {
    setBusy(true);
    try {
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: "/account/security",
      });
      if (result.error) setNotice("Please sign in again before linking your Google account.");
    } catch {
      setNotice("Google account linking is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      {notice && (
        <p
          role="status"
          className="rounded-xl border border-[#f1d58b]/20 bg-[#28190f] p-4 text-sm text-[#ffa451]"
        >
          {notice}
        </p>
      )}
      <section className="rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Mail className="size-5 text-[#f1d58b]" aria-hidden="true" /> Verified email
        </h2>
        <p className="mt-3 text-sm text-[#b8a08c]">{email}</p>
        <p className="mt-2 text-sm text-[#f1d58b]">
          {verified
            ? "Email verified"
            : "Email not yet verified; use your existing password until verified."}
        </p>
      </section>
      {features.google && (
        <section className="rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <KeyRound className="size-5 text-[#f1d58b]" aria-hidden="true" /> Google account
          </h2>
          <p className="mt-3 text-sm text-[#b8a08c]">
            {googleLinked
              ? "Your Google identity is linked."
              : "Link Google after signing in with your existing credentials."}
          </p>
          {!googleLinked && (
            <button
              disabled={busy}
              onClick={linkGoogle}
              className="mt-4 rounded-xl border border-[#f6dc9b]/25 px-4 py-2 text-sm text-[#f1d58b] hover:bg-[#2d1d12] disabled:opacity-50"
            >
              Link Google
            </button>
          )}
        </section>
      )}
      {features.passkey && (
        <section className="rounded-3xl border border-[#f6dc9b]/15 bg-[#17100b] p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Fingerprint className="size-5 text-[#f1d58b]" aria-hidden="true" /> Passkeys
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#b8a08c]">
            Use your device fingerprint, face or PIN. ClubKeep stores public keys, not biometric
            samples. Keep a backup sign-in method.
          </p>
          <ul className="mt-5 space-y-3">
            {passkeys.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#25180f] px-4 py-3"
              >
                <span className="text-sm font-medium">{item.name || "Passkey"}</span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => renamePasskey(item.id, item.name)}
                    className="text-xs text-[#f1d58b] underline disabled:opacity-50"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removePasskey(item.id)}
                    aria-label={"Remove " + (item.name || "passkey")}
                    className="inline-flex items-center gap-1 text-xs text-[#ffad78] disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            disabled={busy}
            onClick={addPasskey}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#d4a84a] to-[#f26b00] px-5 py-3 font-semibold text-[#2a1608] disabled:opacity-50"
          >
            <Plus className="size-4" aria-hidden="true" /> Add a passkey
          </button>
        </section>
      )}
    </div>
  );
}
