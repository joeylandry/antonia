import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIES = ["__Host-antonia_session", "antonia_session"];

/**
 * Bounces visitors without a session cookie to /login. This is an optimistic
 * check only; every page, route and server action re-verifies the session
 * against the server-side store (lib/auth.ts).
 */
export function proxy(request: NextRequest) {
  const hasCookie = SESSION_COOKIES.some((name) => request.cookies.has(name));
  const path = request.nextUrl.pathname;
  if (!hasCookie && path !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
