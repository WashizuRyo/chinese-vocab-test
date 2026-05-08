import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, computeAuthToken, isAuthEnabled } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

export async function proxy(req: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = await computeAuthToken();
  if (cookie && expected && cookie === expected) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
