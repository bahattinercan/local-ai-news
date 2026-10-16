import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware.ts";
import { RATE_LIMIT_MAX, resetRateLimit } from "../src/lib/rateLimit.ts";

function request(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(path, "http://localhost:3000"), { headers });
}

const passesThrough = (response: ReturnType<typeof middleware>) => response.headers.get("x-middleware-next") === "1";
const redirectedTo = (response: ReturnType<typeof middleware>) => {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
};

/**
 * Regression (measured 2026-10-16): `/icon.svg` and `/apple-icon.png` were
 * redirected to `/en/icon.svg` → 404 while the layout kept advertising both, so
 * two of the three declared icons in the document head were dead links.
 */
test("a root-level static file is served, never given a locale prefix", () => {
  for (const path of ["/icon.svg", "/apple-icon.png", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/feed.rss", "/og.png"]) {
    const response = middleware(request(path));
    assert.equal(redirectedTo(response), null, `${path} was redirected`);
    assert.equal(passesThrough(response), true, `${path} did not pass through`);
  }
});

test("a page without a locale is redirected using Accept-Language", () => {
  assert.equal(redirectedTo(middleware(request("/"))), "/en");
  assert.equal(redirectedTo(middleware(request("/", { "accept-language": "tr-TR,tr;q=0.9" }))), "/tr");
  assert.equal(redirectedTo(middleware(request("/news", { "accept-language": "de-DE,de;q=0.9" }))), "/en/news");
  assert.equal(redirectedTo(middleware(request("/c/image", { "accept-language": "tr" }))), "/tr/c/image");
});

test("an already-localised path passes through untouched", () => {
  for (const path of ["/tr", "/en/news", "/tr/c/multimodal", "/en/m/some-model"]) {
    assert.equal(passesThrough(middleware(request(path))), true, path);
  }
});

test("api requests are rate limited per ip and recover after the window", () => {
  resetRateLimit();
  const hit = (ip: string) => middleware(request("/api/feed", { "x-forwarded-for": ip })).status;
  const allowed = RATE_LIMIT_MAX;
  const other = "198.51.100.7";

  for (let i = 0; i < allowed; i++) assert.equal(hit("203.0.113.9"), 200, `request ${i + 1} was limited`);
  assert.equal(hit("203.0.113.9"), 429);
  // A different caller is unaffected, and the window resets on time.
  assert.equal(hit(other), 200);
  resetRateLimit();
  assert.equal(hit("203.0.113.9"), 200);
});
