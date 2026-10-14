import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, type Locale } from "@/i18n";
import { isRateLimited } from "@/lib/rateLimit";

const EXCLUDED = ["/sitemap.xml", "/robots.txt", "/feed.rss", "/favicon.ico"];

function detectLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return "en";
}

export function middleware(request: NextRequest) {
  const path = new URL(request.url).pathname;

  if (path.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "rate limited" }, { status: 429 });
    }
    return NextResponse.next();
  }

  if (EXCLUDED.some((prefix) => path === prefix || path.startsWith(prefix))) {
    return NextResponse.next();
  }

  const segments = path.split("/").filter(Boolean);

  if (segments.length === 0) {
    return NextResponse.redirect(new URL(`/${detectLocale(request)}`, request.url));
  }

  if (!isLocale(segments[0])) {
    return NextResponse.redirect(new URL(`/${detectLocale(request)}${path}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image).*)"
};
