import type { MetadataRoute } from "next";
import { CATEGORY_RULES } from "@/lib/classify/rules";
import { loadSnapshot } from "@/lib/store";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openweightradar.com";
const LOCALES = ["en", "tr"];

/** The newest news detail pages, which are canonical since decision D1. */
const NEWS_DETAIL_CAP = 200;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE}/${locale}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}`])) },
      changeFrequency: "hourly"
    });

    // `news` is a rule key but not a user-facing category: getCategories()
    // already filters it out, so the sitemap must not advertise /c/news.
    for (const rule of CATEGORY_RULES.filter((r) => r.key !== "news")) {
      entries.push({
        url: `${BASE}/${locale}/c/${rule.key}`,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}/c/${rule.key}`])) },
        changeFrequency: "hourly"
      });
    }

    for (const path of ["news", "research", "stats", "compare"]) {
      entries.push({
        url: `${BASE}/${locale}/${path}`,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}/${path}`])) },
        changeFrequency: "hourly"
      });
    }
  }

  const snapshot = await loadSnapshot();
  for (const item of (snapshot?.news ?? []).slice(0, NEWS_DETAIL_CAP)) {
    const segment = `n/${encodeURIComponent(item.externalId)}`;
    entries.push({
      url: `${BASE}/en/${segment}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}/${segment}`])) },
      lastModified: item.publishedAt,
      changeFrequency: "weekly"
    });
  }

  return entries;
}
