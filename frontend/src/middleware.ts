import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/admin-auth";
import { SHIPPER_COOKIE_NAME } from "@/lib/shipper-auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/ship")) {
    if (pathname === "/ship/login" || pathname.startsWith("/ship/login/")) {
      const token = request.cookies.get(SHIPPER_COOKIE_NAME)?.value;
      if (token) {
        return NextResponse.redirect(new URL("/ship", request.url));
      }
      return NextResponse.next();
    }

    const token = request.cookies.get(SHIPPER_COOKIE_NAME)?.value;
    if (!token) {
      const login = new URL("/ship/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    if (token) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/ship", "/ship/:path*"],
};
