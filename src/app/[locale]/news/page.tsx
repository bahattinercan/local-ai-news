import { getNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsList } from "@/components/NewsList";
import { dictionary, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";

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

  const headline = await getNews({ ...query, limit: 20, page: 1 });

  return (
    <>
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

      <header className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t(dict, "news.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(dict, "news.subtitle")}</p>
      </header>

      <NewsList locale={locale} query={{ ...query, scope: "news" }} />
    </>
  );
}
