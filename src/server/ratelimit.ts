import { prisma } from "@/lib/db";

// Fixed-window rate limiting per user + action. Portable (SQLite/Postgres).
// Defaults are generous for a personal service; tune per plan for SaaS.
export const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  analyze: { limit: 40, windowMs: 60 * 60 * 1000 },
  generate: { limit: 60, windowMs: 60 * 60 * 1000 },
  intelligence: { limit: 20, windowMs: 60 * 60 * 1000 },
};

export class RateLimitError extends Error {
  constructor(public retryAfterSec: number) {
    super("Rate limit exceeded.");
    this.name = "RateLimitError";
  }
}

// Throws RateLimitError when the caller is over the limit for this window.
export async function enforceRateLimit(ownerId: string, action: keyof typeof LIMITS): Promise<void> {
  const cfg = LIMITS[action];
  if (!cfg) return;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / cfg.windowMs) * cfg.windowMs);

  const row = await prisma.rateLimit.upsert({
    where: { ownerId_action_windowStart: { ownerId, action, windowStart } },
    create: { ownerId, action, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (row.count > cfg.limit) {
    const retryAfterSec = Math.ceil((windowStart.getTime() + cfg.windowMs - now) / 1000);
    throw new RateLimitError(retryAfterSec);
  }
}
