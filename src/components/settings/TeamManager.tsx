"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteMember, revokeInvitation } from "@/lib/actions/team";
import { INVITABLE_ROLES } from "@/lib/constants";

export interface TeamMemberView {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string;
  isYou: boolean;
}

export interface PendingInviteView {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
}

export function TeamManager({
  members,
  invites,
  canEdit,
}: {
  members: TeamMemberView[];
  invites: PendingInviteView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("member");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function invite() {
    setError(null);
    setInfo(null);
    setInviteLink(null);
    startTransition(async () => {
      const res = await inviteMember({ email, role });
      if (!res.ok) {
        setError(res.error ?? "Could not send the invitation.");
        return;
      }
      setEmail("");
      setInfo(res.emailed ? "Invitation emailed ✓" : "Invitation created — share the link below.");
      if (!res.emailed && res.inviteUrl) setInviteLink(res.inviteUrl);
      router.refresh();
    });
  }

  function revoke(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await revokeInvitation(id);
      if (!res.ok) {
        setError(res.error ?? "Could not revoke the invitation.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="card mt-6 p-6">
      <h2 className="text-base font-semibold text-gray-900">Team</h2>
      <p className="mt-1 text-sm text-gray-500">
        People with access to this organization. Admins can edit; members have read-only access.
      </p>

      <div className="mt-4 divide-y divide-gray-100">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-2 text-sm">
            <div>
              <span className="font-medium text-gray-900">{m.fullName || m.email || "Member"}</span>
              {m.email && m.fullName && <span className="ml-2 text-gray-500">{m.email}</span>}
              {m.isYou && <span className="ml-2 text-xs text-gray-400">(you)</span>}
            </div>
            <span className="badge bg-gray-100 capitalize text-gray-700">{m.role}</span>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Pending invitations</p>
          <div className="mt-2 divide-y divide-gray-100">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <span className="text-gray-900">{inv.email}</span>
                  <span className="ml-2 text-xs capitalize text-gray-400">{inv.role}</span>
                </div>
                {canEdit && (
                  <button className="text-xs text-red-600 hover:underline" onClick={() => revoke(inv.id)} disabled={pending}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {canEdit && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Invite a teammate</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              className="input flex-1"
              placeholder="teammate@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select className="input sm:w-36" value={role} onChange={(e) => setRole(e.target.value)}>
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>{r === "admin" ? "Admin" : "Member"}</option>
              ))}
            </select>
            <button className="btn-primary sm:w-auto" onClick={invite} disabled={pending || !email.trim()}>
              {pending ? "Sending…" : "Send invite"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {info && <p className="mt-2 text-sm text-brand-700">{info}</p>}
          {inviteLink && (
            <p className="mt-2 break-all rounded-lg bg-gray-50 p-2 text-xs text-gray-600">{inviteLink}</p>
          )}
        </div>
      )}
    </div>
  );
}
