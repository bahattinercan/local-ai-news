import type { MetadataRoute } from "next";
import { CATEGORY_RULES } from "@/lib/classify/rules";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openweightradar.com";
const LOCALES = ["en", "tr"];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE}/${locale}`,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}`])) },
      changeFrequency: "hourly"
    });

    for (const rule of CATEGORY_RULES) {
      entries.push({
        url: `${BASE}/${locale}/c/${rule.key}`,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}/c/${rule.key}`])) },
        changeFrequency: "hourly"
      });
    }

    for (const path of ["news", "stats", "compare"]) {
      entries.push({
        url: `${BASE}/${locale}/${path}`,
        alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE}/${l}/${path}`])) },
        changeFrequency: "hourly"
      });
    }
  }

  return entries;
}
