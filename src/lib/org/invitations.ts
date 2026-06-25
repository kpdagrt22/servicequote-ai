/**
 * Pure helpers for team invitations. The DB writes + auth live in the server
 * action (src/lib/actions/team.ts); these encode the rules so they are tested.
 */
import { INVITABLE_ROLES, type InvitableRole } from "@/lib/constants";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const e = email.trim();
  // Deliberately simple; the real check is Supabase accepting the address.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function isInvitableRole(role: string): role is InvitableRole {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function isInvitationExpired(expiresAtIso: string, now: Date): boolean {
  const exp = Date.parse(expiresAtIso);
  if (Number.isNaN(exp)) return true;
  return now.getTime() > exp;
}

/** Case-insensitive equality used to confirm the signed-in user owns the invite. */
export function emailsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeEmail(a) === normalizeEmail(b);
}
