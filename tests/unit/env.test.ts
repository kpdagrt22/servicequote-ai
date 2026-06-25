import { describe, it, expect } from "vitest";
import { buildEnvReport, REQUIRED_PUBLIC_ENV } from "@/lib/env";

describe("buildEnvReport", () => {
  it("flags missing required Supabase keys", () => {
    const r = buildEnvReport({});
    expect(r.ok).toBe(false);
    expect(r.missingRequired).toEqual([...REQUIRED_PUBLIC_ENV]);
    expect(r.warnings.join(" ")).toMatch(/required/i);
  });

  it("is ok when both required keys are present", () => {
    const r = buildEnvReport({
      NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
    });
    expect(r.ok).toBe(true);
    expect(r.missingRequired).toEqual([]);
  });

  it("treats blank/whitespace as missing", () => {
    const r = buildEnvReport({
      NEXT_PUBLIC_SUPABASE_URL: "   ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
    });
    expect(r.ok).toBe(false);
    expect(r.missingRequired.length).toBe(2);
  });

  it("warns when AI_PROVIDER=openai but key missing", () => {
    const r = buildEnvReport({
      NEXT_PUBLIC_SUPABASE_URL: "u",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
      AI_PROVIDER: "openai",
    });
    expect(r.warnings.join(" ")).toMatch(/openai/i);
  });

  it("warns when Stripe secret is set without a webhook secret", () => {
    const r = buildEnvReport({
      NEXT_PUBLIC_SUPABASE_URL: "u",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
      STRIPE_SECRET_KEY: "sk_test_x",
    });
    expect(r.warnings.join(" ")).toMatch(/webhook/i);
  });

  it("reports present optional integrations", () => {
    const r = buildEnvReport({
      NEXT_PUBLIC_SUPABASE_URL: "u",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "a",
      RESEND_API_KEY: "re_x",
    });
    expect(r.presentOptional).toContain("RESEND_API_KEY");
  });
});
