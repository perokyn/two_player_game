// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Protect /admin/* routes by requiring the presence of the HttpOnly admin cookie.
 * API routes still must enforce requireAdmin server-side (this middleware is just a UX guard).
 *
 * Adjust the allowlist here if you add public admin pages (e.g. /admin/signup for local dev).
 */

const ADMIN_COOKIE_NAME = "cg_admin_session";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only apply to /admin and its subpaths
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // Allow the login page itself (and static assets served under /admin if any)
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // If cookie is missing — redirect to admin login and preserve original target
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!cookieVal) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.search = `redirectTo=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(loginUrl);
  }

  // If cookie present, allow — server-side handlers will still validate token & role
  return NextResponse.next();
}

/**
 * Only match admin paths
 */
export const config = {
  matcher: ["/admin/:path*"],
};
