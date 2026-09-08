import { prisma } from "@/lib/db";

// Fixed-window rate limiting per key + action. Portable (SQLite/Postgres).
// The key is a User.id for actions behind a session, and an email or client
// address for actions that happen before one exists (sign in).
// Defaults are generous for a personal service; tune per plan for SaaS.
export const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  // Sign in is throttled on two keys. The email bucket is the one that stops
  // guessing against a named account and does not depend on the deployment.
  // The address bucket is wider on purpose: a forwarded header is only as
  // honest as the proxy in front of the app, and a whole office can share one
  // address, so it is there to slow spraying, not to be the primary control.
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  loginAddress: { limit: 50, windowMs: 15 * 60 * 1000 },
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
export async function enforceRateLimit(key: string, action: keyof typeof LIMITS): Promise<void> {
  const cfg = LIMITS[action];
  if (!cfg) return;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / cfg.windowMs) * cfg.windowMs);

  const row = await prisma.rateLimit.upsert({
    where: { ownerId_action_windowStart: { ownerId: key, action, windowStart } },
    create: { ownerId: key, action, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (row.count > cfg.limit) {
    const retryAfterSec = Math.ceil((windowStart.getTime() + cfg.windowMs - now) / 1000);
    throw new RateLimitError(retryAfterSec);
  }
}
