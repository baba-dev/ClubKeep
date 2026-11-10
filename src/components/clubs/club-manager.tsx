"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Plus, ShieldCheck, UserMinus, XCircle } from "lucide-react";
import { InviteQr } from "@/components/clubs/invite-qr";

type Invite = { id: string; expiresAt: string; claimedAt: string | null; revokedAt: string | null; claimedBy: string | null };
type Member = { id: string; name: string; role: string; joinedAt: string };

export function ClubManager({
  clubId, owner, initialInvites, initialMembers,
}: {
  clubId: string; owner: boolean; initialInvites: Invite[]; initialMembers: Member[];
}) {
  const router = useRouter();
  const [invites, setInvites] = useState(initialInvites);
  const [members, setMembers] = useState(initialMembers);
  const [issued, setIssued] = useState<{ id: string; url: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function post(path: string) {
    const response = await fetch(path, {
      method: "POST", cache: "no-store", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: "{}",
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed");
    return payload;
  }

  async function execute(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try { await action(); } catch (e) {
      setError(e instanceof Error ? e.message : "The action could not be completed");
    } finally { setBusy(false); }
  }

  function createInvite() {
    void execute(async () => {
      setIssued(null);
      const next = await post(`/api/clubs/${clubId}/invites`);
      setIssued(next);
      setCopied(false);
      setInvites((previous) => [
        { id: next.id, expiresAt: next.expiresAt, claimedAt: null, revokedAt: null, claimedBy: null },
        ...previous,
      ]);
    });
  }

  function revokeInvite(id: string) {
    void execute(async () => {
      await post(`/api/clubs/${clubId}/invites/${id}/revoke`);
      setInvites((previous) => previous.map((item) =>
        item.id === id ? { ...item, revokedAt: new Date().toISOString() } : item
      ));
      if (issued?.id === id) setIssued(null);
      router.refresh();
    });
  }

  function revokeMember(id: string) {
    if (!window.confirm("Remove this member from the club? Their Personal account will remain intact.")) return;
    void execute(async () => {
      await post(`/api/clubs/${clubId}/members/${id}/revoke`);
      setMembers((previous) => previous.filter((member) => member.id !== id));
      router.refresh();
    });
  }

  function pending(invite: Invite) {
    return !invite.claimedAt && !invite.revokedAt && new Date(invite.expiresAt).getTime() > Date.now();
  }

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-[#f1d58b] uppercase">Private invitations</p>
            <h2 className="mt-2 text-2xl font-semibold">Bring your members in.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#b8a08c]">Each invitation works once, expires after seven days and grants member access only.</p>
          </div>
          <button type="button" onClick={createInvite} disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#f26b00] px-5 py-3 text-sm font-semibold text-[#231207] hover:brightness-110 disabled:opacity-50">
            <Plus className="size-4" /> New invitation
          </button>
        </div>
        {error && <p role="alert" className="mt-5 text-sm text-[#ffb985]">{error}</p>}
        {issued && (
          <div className="mt-7 grid items-center gap-6 rounded-2xl border border-[#f1d58b]/30 bg-[#26190e] p-5 sm:grid-cols-[auto_1fr]">
            <InviteQr url={issued.url} />
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-[#f1d58b]">
                <ShieldCheck className="size-4" /> Share this private invite now
              </p>
              <p className="mt-2 text-xs leading-5 text-[#b8a08c]">The link and QR are generated locally and shown only once. They cannot be recovered from the server.</p>
              <input readOnly aria-label="Single-use invitation link" value={issued.url}
                onFocus={(event) => event.currentTarget.select()}
                className="mt-4 w-full rounded-xl border border-[#f6dc9b]/20 bg-[#0b0705] px-3 py-3 text-xs" />
              <button type="button" onClick={() => {
                void navigator.clipboard.writeText(issued.url).then(
                  () => setCopied(true),
                  () => setError("Copy unavailable; select the link above.")
                );
              }} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#f6dc9b]/25 px-4 py-2 text-sm text-[#ffa451]">
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <p className="mt-3 text-xs text-[#b8a08c]">Expires {new Date(issued.expiresAt).toLocaleString()}</p>
            </div>
          </div>
        )}
        <div className="mt-6 space-y-2">
          {invites.length === 0 && <p className="rounded-xl border border-dashed border-[#f6dc9b]/20 p-5 text-sm text-[#b8a08c]">No invitations yet. Create one to invite your first member.</p>}
          {invites.map((invite) => (
            <div key={invite.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#f6dc9b]/10 px-4 py-3 text-sm">
              <div>
                <p className="flex items-center gap-2 font-medium"><Link2 className="size-4 text-[#ffa451]" /> Invitation {invite.id.slice(-7)}</p>
                <p className="mt-1 text-xs text-[#b8a08c]">
                  {invite.claimedAt ? `Claimed by ${invite.claimedBy || "a member"}` : invite.revokedAt ? "Revoked" : pending(invite) ? "Waiting for claim" : "Expired"}
                  {" · "}{new Date(invite.expiresAt).toLocaleDateString()}
                </p>
              </div>
              {pending(invite) && (
                <button type="button" disabled={busy} onClick={() => revokeInvite(invite.id)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#ffc391] hover:bg-[#2a1b12] disabled:opacity-50">
                  <XCircle className="size-4" /> Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-[#f6dc9b]/20 bg-[#17100b] p-6 sm:p-8">
        <p className="text-xs font-semibold tracking-widest text-[#f1d58b] uppercase">Membership</p>
        <h2 className="mt-2 text-2xl font-semibold">People in your club</h2>
        <div className="mt-6 space-y-2">
          {members.map((member) => (
            <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#25180f] px-4 py-4">
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="mt-1 text-xs text-[#b8a08c]">{member.role.toLowerCase()} · Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
              </div>
              {owner && member.role === "MEMBER" && (
                <button type="button" disabled={busy} onClick={() => revokeMember(member.id)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#ffba91] hover:bg-[#382014] disabled:opacity-50">
                  <UserMinus className="size-4" /> Remove member
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
