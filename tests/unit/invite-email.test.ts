import { describe, it, expect } from "vitest";
import { buildInviteEmail } from "@/lib/email/invite-email";

describe("buildInviteEmail", () => {
  const base = {
    businessName: "Sparks Electric",
    role: "member",
    inviteUrl: "https://app.example.com/invite/tok",
  };

  it("includes the business, role and accept link", () => {
    const m = buildInviteEmail(base);
    expect(m.subject).toContain("Sparks Electric");
    expect(m.text).toContain("https://app.example.com/invite/tok");
    expect(m.html).toContain("https://app.example.com/invite/tok");
    expect(m.text).toContain("team member");
  });

  it("describes admins distinctly", () => {
    const m = buildInviteEmail({ ...base, role: "admin" });
    expect(m.text).toContain("an admin");
  });

  it("escapes HTML in the business name", () => {
    const m = buildInviteEmail({ ...base, businessName: "<b>x</b>" });
    expect(m.html).not.toContain("<b>x</b>");
    expect(m.html).toContain("&lt;b&gt;x&lt;/b&gt;");
  });
});
