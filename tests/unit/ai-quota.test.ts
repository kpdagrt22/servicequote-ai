import { describe, it, expect } from "vitest";
import { dailyAiQuota, checkDailyAiQuota, startOfUtcDayIso } from "@/lib/ai/quota";
import { AI_DAILY_QUOTA } from "@/lib/constants";

describe("daily AI quota", () => {
  it("uses higher limits for paid orgs", () => {
    expect(dailyAiQuota(false)).toBe(AI_DAILY_QUOTA.free);
    expect(dailyAiQuota(true)).toBe(AI_DAILY_QUOTA.paid);
  });

  it("allows generations under the limit and blocks at/over it", () => {
    const free = AI_DAILY_QUOTA.free;
    expect(checkDailyAiQuota(0, false).allowed).toBe(true);
    expect(checkDailyAiQuota(free - 1, false).allowed).toBe(true);
    const blocked = checkDailyAiQuota(free, false);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.reason).toMatch(/limit/i);
    expect(checkDailyAiQuota(free + 5, false).allowed).toBe(false);
  });

  it("reports remaining correctly and tolerates junk input", () => {
    const r = checkDailyAiQuota(3, true);
    expect(r.remaining).toBe(AI_DAILY_QUOTA.paid - 3);
    expect(checkDailyAiQuota(-10, false).used).toBe(0);
  });

  it("computes UTC start-of-day", () => {
    const d = new Date("2026-06-26T15:30:00.000Z");
    expect(startOfUtcDayIso(d)).toBe("2026-06-26T00:00:00.000Z");
  });
});
