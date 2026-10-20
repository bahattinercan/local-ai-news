import { getNews, countNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsList } from "@/components/NewsList";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
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
