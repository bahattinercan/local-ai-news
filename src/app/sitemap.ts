import type { MetadataRoute } from "next";
import { CATEGORY_RULES } from "@/lib/classify/rules";
import { loadSnapshot } from "@/lib/store";
import { GLOSSARY } from "@/lib/glossary";
import { isIndexableModel, isIndexableNews, languageAlternates, modelPath, newsPath } from "@/lib/seo";

/**
 * The discovery contract (docs/en/SEO-PLAN.md §6.1).
 *
 * Measured 2026-10-20: this file advertised 252 URLs and **zero** model pages,
 * while 1 402 model pages existed per locale. It also hard-capped news at 200.
 * The rules now:
 *
 *  - every indexable model page is advertised (the predicate lives in
 *    `lib/seo.ts`, so the sitemap and the `noindex` tag cannot disagree);
 *  - every news detail page is advertised, not the first 200;
 *  - every entry carries the real `lastModified`, never the build time;
 *  - every entry carries `en`, `tr` and `x-default` alternates;
 *  - images are advertised only when the snapshot actually has one.
 */
const LOCALES = ["en", "tr"] as const;

function alternates(path: string) {
  return { languages: languageAlternates(path) };
}

function absoluteImage(url: string | null | undefined): string[] {
  if (!url) return [];
  return /^https:\/\//i.test(url) ? [url] : [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const snapshot = await loadSnapshot();
  const lastModified = snapshot?.generatedAt;
  const entries: MetadataRoute.Sitemap = [];

  const corePaths = [
    "/",
    "/models",
    ...CATEGORY_RULES.filter((rule) => rule.key !== "news").map((rule) => `/c/${rule.key}`),
    "/news",
    "/research",
    "/glossary",
    "/stats",
    "/compare"
  ];

  for (const path of corePaths) {
    for (const locale of LOCALES) {
      entries.push({
        url: languageAlternates(path)[locale],
        alternates: alternates(path),
        lastModified,
        changeFrequency: path === "/" || path === "/models" || path.startsWith("/c/") ? "hourly" : "daily"
      });
    }
  }

  for (const entry of GLOSSARY) {
    const path = `/glossary/${entry.slug}`;
    for (const locale of LOCALES) {
      entries.push({
        url: languageAlternates(path)[locale],
        alternates: alternates(path),
        changeFrequency: "monthly"
      });
    }
  }

  for (const model of snapshot?.models ?? []) {
    if (!isIndexableModel(model)) continue;
    const path = modelPath(model);
    for (const locale of LOCALES) {
      entries.push({
        url: languageAlternates(path)[locale],
        alternates: alternates(path),
        lastModified: model.updatedAt || model.firstSeenAt,
        changeFrequency: "weekly",
        images: absoluteImage(model.sampleImages[0])
      });
    }
  }

  for (const item of snapshot?.news ?? []) {
    if (!isIndexableNews(item)) continue;
    const path = newsPath(item);
    const images = absoluteImage(item.thumbnail);
    for (const locale of LOCALES) {
      entries.push({
        url: languageAlternates(path)[locale],
        alternates: alternates(path),
        lastModified: item.publishedAt,
        changeFrequency: "weekly",
        images
      });
    }
  }

  return entries;
}

/** The snapshot changes every ten minutes; the sitemap may lag one cache window. */
export const revalidate = 900;
