import type { NextRequest } from "next/server";
import { buildRss } from "@/lib/rss";
import { getNews } from "@/lib/store";

const CACHE = "public, s-maxage=300";

export async function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") ?? "en";
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openweightradar.com";

  // The feed mirrors /news, which excludes papers since the two surfaces split.
  const items = await getNews({ windowDays: 7, scope: "news", category, limit: 50 });

  const xml = buildRss({
    title: `OpenWeight Radar${category ? ` — ${category}` : ""}`,
    link: `${base}/${lang}/news`,
    description: "New open-weight models you can run locally",
    language: lang,
    items: items.map((item) => ({
      title: item.title,
      link: item.url,
      pubDate: item.publishedAt,
      description: item.summary ?? item.kind,
      guid: `${lang}:${item.externalId}`
    }))
  });

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": CACHE
    }
  });
}
