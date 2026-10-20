import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * `/api/` is JSON, not content: disallow it so crawl budget stays on pages.
 *
 * Filters and `?page=` are deliberately **not** disallowed. Every filtered view
 * carries `noindex, follow` (lib/seo.ts `listMetadata`), and a crawler must be
 * able to fetch the URL to read that directive.
 *
 * Allowing the AI crawlers is a product decision (docs/en/SEO-PLAN.md §6.2):
 * this site wants citations and referrals. Remove a block below to opt out of
 * that crawler's use without touching the rest of the file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      {
        userAgent: ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"],
        allow: "/",
        disallow: ["/api/"]
      }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
