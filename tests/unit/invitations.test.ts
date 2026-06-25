import { describe, it, expect } from "vitest";
import {
  normalizeEmail,
  isValidEmail,
  isInvitableRole,
  isInvitationExpired,
  emailsMatch,
} from "@/lib/org/invitations";

describe("invitation helpers", () => {
  it("normalizes emails (trim + lowercase)", () => {
    expect(normalizeEmail("  Jordan@Example.COM ")).toBe("jordan@example.com");
  });

  it("validates basic email shape", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("only allows admin/member roles (never owner)", () => {
    expect(isInvitableRole("admin")).toBe(true);
    expect(isInvitableRole("member")).toBe(true);
    expect(isInvitableRole("owner")).toBe(false);
    expect(isInvitableRole("superuser")).toBe(false);
  });

  it("detects expiry against an injected now", () => {
    const now = new Date("2026-06-26T12:00:00.000Z");
    expect(isInvitationExpired("2026-06-25T12:00:00.000Z", now)).toBe(true);
    expect(isInvitationExpired("2026-06-27T12:00:00.000Z", now)).toBe(false);
    expect(isInvitationExpired("not-a-date", now)).toBe(true);
  });

  it("matches emails case-insensitively and rejects nulls", () => {
    expect(emailsMatch("A@B.com", "a@b.com")).toBe(true);
    expect(emailsMatch("a@b.com", "x@y.com")).toBe(false);
    expect(emailsMatch(null, "a@b.com")).toBe(false);
    expect(emailsMatch("a@b.com", undefined)).toBe(false);
  });
});
