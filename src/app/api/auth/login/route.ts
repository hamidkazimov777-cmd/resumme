import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword, verifyPasswordDecoy } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setSessionCookie } from "@/server/auth";
import { enforceRateLimit, RateLimitError } from "@/server/ratelimit";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

// Behind a proxy the client address arrives in a forwarded header. The header
// is client controlled unless a proxy overwrites it, so it is used only for the
// wider secondary bucket; the per-email bucket carries the real throttle.
function clientAddress(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || null;
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  const email = parsed.data.email.toLowerCase().trim();

  // Throttle before the lookup, so a guessing run spends attempts rather than
  // our bcrypt time.
  try {
    await enforceRateLimit(`email:${email}`, "login");
    const address = clientAddress(req);
    if (address) await enforceRateLimit(`ip:${address}`, "loginAddress");
  } catch (e) {
    if (e instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many sign in attempts. Try again later." },
        { status: 429, headers: { "retry-after": String(e.retryAfterSec) } }
      );
    }
    throw e;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  // An address with no account has to cost the same as a wrong password,
  // otherwise the response time says whether the account exists.
  const ok = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPasswordDecoy(parsed.data.password);
  if (!user || !ok) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

  const { token } = await createSession(user.id);
  const res = NextResponse.json({ id: user.id, email: user.email, name: user.name });
  setSessionCookie(res, token);
  return res;
}
