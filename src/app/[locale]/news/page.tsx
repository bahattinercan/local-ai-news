import { getNews, isDbConfigured } from "@/lib/db/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState, SnapshotNotice } from "@/components/EmptyState";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";

export default async function NewsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const query = parseNewsQuery(await searchParams);
  const dict = dictionary(locale);
  const items = await getNews(query);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: t(dict, "news.title"),
          itemListElement: items.slice(0, 20).map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: item.url,
            name: item.title
          }))
        }}
      />

      <h1 className="mb-3 text-xl font-semibold">{t(dict, "news.title")}</h1>

      <form method="get" className="mb-4 flex flex-wrap gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-muted">{t(dict, "filters.window")}</span>
          <select name="window" defaultValue={query.windowDays === 1 ? "24h" : `${query.windowDays}d`}>
            {["24h", "7d", "30d", "90d"].map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted">{t(dict, "news.kind")}</span>
          <select name="kind" defaultValue={query.kind ?? ""}>
            <option value="">—</option>
            <option value="paper">{t(dict, "news.paper")}</option>
            <option value="release">{t(dict, "news.release")}</option>
            <option value="announcement">{t(dict, "news.announcement")}</option>
          </select>
        </label>
        <button type="submit" className="rounded border border-border px-3 py-1.5">
          {t(dict, "filters.apply")}
        </button>
      </form>

      {!isDbConfigured() ? <SnapshotNotice locale={locale} /> : null}

      {items.length === 0 ? (
        <EmptyState locale={locale} message={t(dict, "empty.noNews")} />
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((item) => (
            <NewsCard key={item.externalId} item={item} locale={locale} />
          ))}
        </div>
      )}

      <p className="mt-6 text-sm">
        <a href={hrefFor(locale, "/news")} className="text-muted">RSS: <a href={`/feed.rss?lang=${locale}`}>/feed.rss</a></a>
      </p>
    </>
  );
}
