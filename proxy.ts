import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_HOST = "app.utopiadata.net";

function isAppHost(host: string) {
  return host === APP_HOST || host.startsWith("app.localhost");
}

function isMainHost(host: string) {
  return host === "utopiadata.net" || host === "www.utopiadata.net";
}

function isDataHost(host: string) {
  return host === "data.utopiadata.net";
}

function isAdminPath(pathname: string) {
  return pathname === "/adminmode" || pathname.startsWith("/adminmode/");
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = request.nextUrl;

  if (isAppHost(host)) {
    if (pathname.startsWith("/api") || isAdminPath(pathname)) {
      return NextResponse.next();
    }

    // Keep subdomain URLs canonical: app.utopiadata.net/app/x -> /x
    if (pathname === "/app" || pathname.startsWith("/app/")) {
      const stripped = pathname.slice("/app".length) || "/";
      return NextResponse.redirect(
        new URL(`${stripped}${search}`, request.url)
      );
    }

    const rewritten = pathname === "/" ? "/app" : `/app${pathname}`;
    return NextResponse.rewrite(new URL(`${rewritten}${search}`, request.url));
  }

  if (isAdminPath(pathname) && (isDataHost(host) || isMainHost(host))) {
    return NextResponse.redirect(
      new URL(`https://${APP_HOST}/adminmode${search}`)
    );
  }

  // Send /app/* on the marketing domain over to the app subdomain.
  if (isMainHost(host) && (pathname === "/app" || pathname.startsWith("/app/"))) {
    const stripped = pathname.slice("/app".length) || "/";
    return NextResponse.redirect(
      new URL(`https://${APP_HOST}${stripped}${search}`)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals and any path with a file extension (static assets).
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
