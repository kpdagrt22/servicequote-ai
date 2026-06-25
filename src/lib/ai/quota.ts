/**
 * Per-organization daily AI-generation quota.
 *
 * Prevents an account (especially with a real provider key configured) from
 * running up unbounded AI cost. Pure helpers; the action counts today's
 * generations from ai_extraction_logs and calls these.
 */
import { AI_DAILY_QUOTA } from "@/lib/constants";

export function dailyAiQuota(paid: boolean): number {
  return paid ? AI_DAILY_QUOTA.paid : AI_DAILY_QUOTA.free;
}

export interface AiQuotaDecision {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  reason?: string;
}

export function checkDailyAiQuota(usedToday: number, paid: boolean): AiQuotaDecision {
  const limit = dailyAiQuota(paid);
  const used = Math.max(0, Math.floor(usedToday));
  const remaining = Math.max(0, limit - used);
  if (used < limit) return { allowed: true, used, limit, remaining };
  return {
    allowed: false,
    used,
    limit,
    remaining: 0,
    reason: `You've reached today's limit of ${limit} AI drafts. It resets tomorrow${
      paid ? "" : " — or upgrade for a higher limit"
    }.`,
  };
}

/** UTC start-of-day ISO timestamp for the given moment (pure — date injected). */
export function startOfUtcDayIso(now: Date): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}
