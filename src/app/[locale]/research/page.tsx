import { getNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsList } from "@/components/NewsList";
import { TabBar } from "@/components/TabBar";
import { dictionary, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";

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

  return (
    <>
      <TabBar locale={locale} />
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

      <header className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t(dict, "research.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(dict, "research.subtitle")}</p>
      </header>

      <NewsList locale={locale} query={{ ...query, scope: "research" }} />
    </>
  );
}
