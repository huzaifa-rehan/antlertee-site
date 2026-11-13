// Sliding-window rate limit decision. Pure (the DB layer feeds it the recent event times) so it is unit tested.

export interface RateRule {
  limit: number;
  windowMs: number;
}

export interface RateDecision {
  allowed: boolean;
  /** Events left in the window after this one (0 when blocked). */
  remaining: number;
  /** Seconds until the oldest counted event leaves the window (0 when allowed). */
  retryAfterSeconds: number;
}

/** `eventTimes` are epoch ms of earlier events for this key (any order, may include old ones). */
export function decideRate(eventTimes: readonly number[], now: number, rule: RateRule): RateDecision {
  const start = now - rule.windowMs;
  const recent = eventTimes.filter((t) => t > start && t <= now).sort((a, b) => a - b);
  if (recent.length < rule.limit) {
    return { allowed: true, remaining: rule.limit - recent.length - 1, retryAfterSeconds: 0 };
  }
  // Blocked until enough events expire to get back under the limit.
  const unblockAt = (recent[recent.length - rule.limit] ?? now) + rule.windowMs;
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((unblockAt - now) / 1000)) };
}

export const RATE_RULES = {
  /** Public lead submissions per client. */
  lead: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Newsletter sign-ups per client. */
  subscribe: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Public file uploads (tokens or local uploads) per client. */
  upload: { limit: 40, windowMs: 60 * 60 * 1000 },
  /** Failed admin logins per client. */
  login: { limit: 8, windowMs: 15 * 60 * 1000 },
  /** Failed admin logins from everyone together (one admin account: slows distributed guessing). */
  loginGlobal: { limit: 60, windowMs: 15 * 60 * 1000 },
} as const satisfies Record<string, RateRule>;

export type RateBucket = keyof typeof RATE_RULES;
