import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, type Locale } from "@/i18n";
import { isRateLimited } from "@/lib/rateLimit";

const EXCLUDED = ["/sitemap.xml", "/robots.txt", "/feed.rss", "/favicon.ico"];

/**
 * A root-level file is not a page, so it must never take a locale prefix.
 * Measured 2026-10-16: `/icon.svg` and `/apple-icon.png` answered 307 to
 * `/en/icon.svg`, which is a 404 — the layout advertises both links, so two of
 * the three declared icons in the document head were dead. `/favicon.ico` only
 * worked because it happened to be listed above.
 */
const STATIC_FILE = /^\/[^/]+\.[a-z0-9]+$/i;

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

  if (EXCLUDED.some((prefix) => path === prefix || path.startsWith(prefix)) || STATIC_FILE.test(path)) {
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
