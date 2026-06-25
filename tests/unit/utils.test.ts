import { describe, it, expect } from "vitest";
import { safeInternalPath, round2, toNumber } from "@/lib/utils";

describe("safeInternalPath (open-redirect guard)", () => {
  it("allows root-relative in-app paths", () => {
    expect(safeInternalPath("/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/quotes/123?tab=edit")).toBe("/quotes/123?tab=edit");
  });
  it("rejects absolute URLs", () => {
    expect(safeInternalPath("https://attacker.com", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("http://evil", "/dashboard")).toBe("/dashboard");
  });
  it("rejects protocol-relative and backslash tricks", () => {
    expect(safeInternalPath("//attacker.com", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("/\\attacker.com", "/dashboard")).toBe("/dashboard");
  });
  it("rejects non-paths and empties, returning the fallback", () => {
    expect(safeInternalPath(null, "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath(undefined, "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("dashboard", "/dashboard")).toBe("/dashboard");
    expect(safeInternalPath("")).toBe("/");
  });
});

describe("round2 / toNumber sanity", () => {
  it("round2 fixes float drift", () => {
    expect(round2(107.335)).toBe(107.34);
    expect(round2(1.005)).toBe(1.01);
  });
  it("toNumber coerces and defaults", () => {
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber("", 3)).toBe(3);
    expect(toNumber("abc", 7)).toBe(7);
  });
});
