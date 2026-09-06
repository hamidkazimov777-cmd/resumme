import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_TTL_DAYS, validateSession, type SessionUser } from "@/lib/auth/session";

// Resolve the current user from the session cookie (server components + routes).
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return validateSession(store.get(SESSION_COOKIE)?.value);
}

/** For API routes: returns the user id or null (caller returns 401). */
export async function currentUserId(): Promise<string | null> {
  const user = await getSessionUser();
  return user?.id ?? null;
}

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    ...cookieOpts,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOpts, maxAge: 0 });
}

/** 401 JSON helper for API routes. */
export function unauthorized() {
  return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
}
