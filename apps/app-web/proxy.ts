import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const TOKEN_COOKIE_NAME = "asi_access_token";

const STATIC_EXTENSIONS = [
  ".ico",
  ".png",
  ".jpg",
  ".jpeg",
  ".svg",
  ".webp",
  ".woff",
  ".woff2",
  ".ttf",
  ".css",
  ".js",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Allow internal assets, static assets and favicon
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname === "/api" ||
    pathname.startsWith("/fonts") ||
    STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isLandingPage = pathname === "/";

  // 2. If logged in and visiting login/signup, redirect to /dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. If NOT logged in and trying to access ANY dashboard route, redirect to /login
  // Public routes: / (landing page), /login, /signup
  if (!isLandingPage && !isAuthPage && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
