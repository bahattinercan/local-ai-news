import type { MetadataRoute } from "next";
import { ANSWER_ENGINE_CRAWLERS, SITE_URL, TRAINING_CRAWLERS } from "@/lib/seo";

/**
 * `/api/` is JSON, not content: disallow it so crawl budget stays on pages.
 *
 * Filters and `?page=` are deliberately **not** disallowed. Every filtered view
 * carries `noindex, follow` (lib/seo.ts `listMetadata`), and a crawler must be
 * able to fetch the URL to read that directive.
 *
 * Decision Q2 (docs/en/SEO-PLAN.md §14, v3) replaced the old "allow the AI
 * crawlers" policy with **search only**:
 *
 *  - the wildcard rule serves every unnamed crawler, search engines included -
 *    Googlebot, Bingbot, DuckDuckBot, Applebot and YandexBot match `*` and are
 *    never denied;
 *  - the training/fetch crawlers in `TRAINING_CRAWLERS` get their own group
 *    that disallows `/` in full - no `Allow` line, because an equal-length
 *    `Allow` wins the tie in the major engines' matchers;
 *  - the answer engines in `ANSWER_ENGINE_CRAWLERS` keep the wildcard
 *    behaviour: they cite and link the page they read, which is search, not
 *    training. Moving one of them into `TRAINING_CRAWLERS` is a one-line flip.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      /* Denied: trains on the content, or answers without citing it. */
      { userAgent: [...TRAINING_CRAWLERS], disallow: "/" },
      /* Allowed on purpose: answer engines that cite and link (Q2 judgement call). */
      { userAgent: [...ANSWER_ENGINE_CRAWLERS], allow: "/", disallow: ["/api/"] }
    ],
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
