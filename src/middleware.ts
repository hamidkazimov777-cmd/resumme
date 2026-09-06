import { NextRequest, NextResponse } from "next/server";

// Keep in sync with SESSION_COOKIE in @/lib/auth/session (that module imports
// Prisma, which can't run in the edge middleware runtime).
const SESSION_COOKIE = "resumee_session";

// Lightweight gate: presence of the session cookie only (no DB at the edge).
// Real validation happens in route handlers / server components. Unauthenticated
// page requests are redirected to /login; API requests get a 401.
const PUBLIC_PAGES = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  const isAuthApi = pathname.startsWith("/api/auth/");
  const isPublicPage = PUBLIC_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isAuthApi || isPublicPage) {
    // Already signed in? Keep them out of the auth pages.
    if (hasSession && isPublicPage) return NextResponse.redirect(new URL("/", req.url));
    return NextResponse.next();
  }

  if (!hasSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|uploads/).*)"],
};
