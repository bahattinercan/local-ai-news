import { ChevronDown } from "lucide-react";
import { getNews, countNews } from "@/lib/store";
import { parseNewsQuery } from "@/lib/query";
import { NewsCard } from "@/components/NewsCard";
import { EmptyState, DataNotice } from "@/components/EmptyState";
import { dictionary, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { CATEGORY_RULES } from "@/lib/classify/rules";
import { Field, SubmitButton } from "@/components/ui/Controls";
import { Pagination } from "@/components/Pagination";

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
  const total = await countNews(query);

  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const day = item.publishedAt.slice(0, 10);
    groups.set(day, [...(groups.get(day) ?? []), item]);
  }

  const formatter = new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

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

      <h1 className="mb-3 text-2xl font-semibold tracking-tight">{t(dict, "news.title")}</h1>

      <form method="get" className="card p-3 mb-4 flex flex-wrap items-end gap-3 text-sm">
        <Field
          name="window"
          label={t(dict, "filters.window")}
          value={query.windowDays === 1 ? "24h" : `${query.windowDays}d`}
          options={[["24h", "24h"], ["7d", "7d"], ["30d", "30d"], ["90d", "90d"]]}
        />
        <Field
          name="kind"
          label={t(dict, "news.kind")}
          value={query.kind ?? ""}
          options={[
            ["", "—"],
            ["paper", t(dict, "news.paper")],
            ["release", t(dict, "news.release")],
            ["announcement", t(dict, "news.announcement")]
          ]}
        />
        <Field
          name="category"
          label={t(dict, "filters.category")}
          value={query.category ?? ""}
          options={[
            ["", "—"],
            ...CATEGORY_RULES.map((rule) => [rule.key, locale === "tr" ? rule.labelTr : rule.labelEn])
          ]}
        />
        <SubmitButton label={t(dict, "filters.apply")} />
      </form>

      <DataNotice locale={locale} />

      {items.length === 0 ? (
        <EmptyState locale={locale} message={t(dict, "empty.noNews")} />
      ) : (
        <div className="grid gap-3">
          {[...groups.entries()].map(([day, dayItems], index) => (
            <details key={day} className="card p-4" open={index === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs text-muted font-mono">
                <span className="flex items-center gap-2">
                  <ChevronDown size={14} aria-hidden="true" className="chev" />
                  {formatter.format(new Date(day))}
                </span>
                <span>{dayItems.length}</span>
              </summary>
              <div className="mt-3 grid gap-3">
                {dayItems.map((item) => (
                  <NewsCard key={item.externalId} item={item} locale={locale} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}

      <Pagination
        locale={locale}
        page={query.page}
        total={total}
        limit={query.limit}
        formValues={{
          window: query.windowDays === 1 ? "24h" : `${query.windowDays}d`,
          kind: query.kind ?? "",
          category: query.category ?? ""
        }}
      />

      <p className="mt-6 text-sm text-muted">
        RSS: <a href={`/feed.rss?lang=${locale}`} className="text-accent hover:text-text">/feed.rss</a>
      </p>
    </>
  );
}
