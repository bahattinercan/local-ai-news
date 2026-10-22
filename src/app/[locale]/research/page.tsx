import type { Metadata } from "next";
import { getNews, countNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsList } from "@/components/NewsList";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { dictionary, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, canonicalUrl, descriptionCount, listMetadata } from "@/lib/seo";

const RESEARCH_FILTER_KEYS = ["window", "scope", "category", "kind", "limit"] as const;

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
  const total = await countNews({ ...query, scope: "research" });
  const title =
    locale === "tr"
      ? "Açık ağırlıklı AI makaleleri - günlük araştırma akışı"
      : "Open-weight AI papers - daily research feed";
  const description =
    locale === "tr"
      ? `Hugging Face günlük akışından ${descriptionCount(total, locale)} makale; yerelde çalıştırılabilir açık ağırlıklar yayınlayan işlere odaklanır.`
      : `${descriptionCount(total, locale)} papers from the Hugging Face daily feed, focused on work that ships open weights you can run.`;
  const canonical = canonicalUrl(locale, "/research");
  const meta = listMetadata(locale, { path: "/research", raw, filterKeys: RESEARCH_FILTER_KEYS, pageIsIndexable: false });

  return {
    title,
    description,
    alternates: meta.alternates,
    robots: meta.robots,
    openGraph: { type: "website", url: canonical, title: `${title} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
}

/**
 * Papers live here, not on /news. The feed was 72% papers (150/209), which
 * buried the local-AI signal; the two surfaces now own disjoint kind sets
 * (docs/en/NEWS-PLAN.md §8).
 */
export default async function ResearchPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  // The scope comes from the route, never from the query string.
  const query = parseNewsQuery(await searchParams);

  const headline = await getNews({ ...query, scope: "research", limit: 20, page: 1 });
  const total = await countNews({ ...query, scope: "research" });

  return (
    <>
      <DeskNav locale={locale} section="research" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t(dict, "research.title"),
          itemListElement: headline.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: item.url,
            name: item.title
          }))
        }}
      />

      <PageHeader
        title={t(dict, "research.title")}
        kicker={t(dict, "edition.window", { days: query.windowDays })}
        lede={t(dict, "research.subtitle")}
        aside={
          <span className="font-mono text-sm text-muted">
            {total} {t(dict, "research.items")}
          </span>
        }
      />

      <NewsList locale={locale} query={{ ...query, scope: "research" }} />
    </>
  );
}
