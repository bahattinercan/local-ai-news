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

/** Query parameters that only ever described the model index (see `lib/query.ts`). */
export const FEED_PARAMS = ["window", "sort", "gate", "runner", "maxParams", "license", "q", "page"] as const;

function detectLocale(request: NextRequest): Locale {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const code = part.split(";")[0].trim().slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return "en";
}

/**
 * A locale redirect depends on `Accept-Language`, so it must say so or a CDN can
 * serve the Turkish redirect to an English reader. 308 (not 307) because these
 * are permanent addresses: `/` is the site, `/{path}` is `/{locale}/{path}`.
 */
function permanentLocaleRedirect(request: NextRequest, target: URL): NextResponse {
  const response = NextResponse.redirect(target, 308);
  response.headers.set("Vary", "Accept-Language");
  return response;
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
    return permanentLocaleRedirect(request, new URL(`/${detectLocale(request)}`, request.url));
  }

  if (!isLocale(segments[0])) {
    return permanentLocaleRedirect(request, new URL(`/${detectLocale(request)}${path}`, request.url));
  }

  /* The index moved from `/` to `/models` (docs/en/DESIGN-V3.md D3). A URL that
     carries feed filters is a query against the index, not a request for the
     front page, so it is redirected permanently (`/` itself is left alone — the
     front page reads no search params). */
  if (segments.length === 1) {
    const url = new URL(request.url);
    if (FEED_PARAMS.some((param) => url.searchParams.has(param))) {
      const target = new URL(`/${segments[0]}/models`, request.url);
      target.search = url.search;
      return NextResponse.redirect(target, 308);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/((?!_next/static|_next/image).*)"
};
