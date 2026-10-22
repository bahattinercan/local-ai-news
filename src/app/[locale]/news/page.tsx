import type { Metadata } from "next";
import { getNews, countNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsList } from "@/components/NewsList";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { dictionary, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, canonicalUrl, descriptionCount, listMetadata } from "@/lib/seo";

const NEWS_FILTER_KEYS = ["window", "scope", "category", "kind", "limit"] as const;

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = pickLocale((await params).locale);
  const raw = await searchParams;
  const query = parseNewsQuery(raw);
  const total = await countNews({ ...query, scope: "news" });
  const title =
    locale === "tr"
      ? "Yerel AI haberleri - sürümler, runtime'lar ve duyurular"
      : "Local AI news - releases, runtimes and announcements";
  const description =
    locale === "tr"
      ? `Son ${query.windowDays} günde ${descriptionCount(total, locale)} model sürümü ve runtime güncellemesi; kaynağı ve bahsettiği modelle birlikte.`
      : `${descriptionCount(total, locale)} model releases and runtime updates from the last ${query.windowDays} days, with the source and the model each one mentions.`;
  const canonical = canonicalUrl(locale, "/news");
  const meta = listMetadata(locale, { path: "/news", raw, filterKeys: NEWS_FILTER_KEYS, pageIsIndexable: false });

  return {
    title,
    description,
    alternates: meta.alternates,
    robots: meta.robots,
    openGraph: { type: "website", url: canonical, title: `${title} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
}

export default async function NewsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const query = parseNewsQuery(await searchParams);

  const headline = await getNews({ ...query, scope: "news", limit: 20, page: 1 });
  const total = await countNews({ ...query, scope: "news" });

  return (
    <>
      <DeskNav locale={locale} section="news" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t(dict, "news.title"),
          itemListElement: headline.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: item.url,
            name: item.title
          }))
        }}
      />

      <PageHeader
        title={t(dict, "news.title")}
        kicker={t(dict, "edition.window", { days: query.windowDays })}
        lede={t(dict, "news.subtitle")}
        aside={
          <span className="font-mono text-sm text-muted">
            {total} {t(dict, "news.items")}
          </span>
        }
      />

      <NewsList locale={locale} query={{ ...query, scope: "news" }} />
    </>
  );
}
