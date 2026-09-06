import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, invalidateSession } from "@/lib/auth/session";
import { clearSessionCookie } from "@/server/auth";

export async function POST() {
  const store = await cookies();
  await invalidateSession(store.get(SESSION_COOKIE)?.value);
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
