import { ChevronDown } from "lucide-react";
import { getNews, countNews } from "@/lib/store";
import { CATEGORY_RULES } from "@/lib/classify/rules";
import { clampPage } from "@/lib/query";
import { dictionary, t, type Locale } from "@/i18n";
import { EmptyState, DataNotice } from "./EmptyState";
import { NewsCard } from "./NewsCard";
import { Pagination } from "./Pagination";
import { Field, SubmitButton } from "./ui/Controls";
import type { NewsScope } from "@/lib/query";
import type { NewsQuery } from "@/lib/store";

const WINDOWS = [["24h", "24h"], ["7d", "7d"], ["30d", "30d"], ["90d", "90d"]];

/** The kind filter only lists what the surface owns, so it can never return nothing. */
const SCOPE_KINDS: Record<NewsScope, string[]> = {
  news: ["release", "announcement", "runtime", "community"],
  research: [],
  all: ["paper", "release", "announcement", "runtime", "community"]
};

export type NewsListQuery = NewsQuery & { scope: NewsScope; page: number };

/**
 * Shared by /news and /research. The scope decides which kinds the surface
 * owns and the kind filter offers only those, so a paper can never show up on
 * the news page or vice versa.
 */
export async function NewsList({ locale, query }: { locale: Locale; query: NewsListQuery }) {
  const dict = dictionary(locale);
  /* Same clamp as the feed: `?page=999` used to render an empty page under a
     "Page 999" heading instead of the last page that exists. */
  const total = await countNews(query);
  const page = clampPage(query.page, total, query.limit);
  const items = await getNews({ ...query, page });

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

  const kindOptions: string[][] = SCOPE_KINDS[query.scope].map((kind) => [kind, t(dict, `news.${kind}`)]);
  const formValues = {
    window: query.windowDays === 1 ? "24h" : `${query.windowDays}d`,
    scope: query.scope,
    kind: query.kind ?? "",
    category: query.category ?? ""
  };

  return (
    <>
      <form method="get" className="card p-3 mb-4 flex flex-wrap items-end gap-3 text-sm">
        <input type="hidden" name="scope" value={query.scope} />
        <Field
          name="window"
          label={t(dict, "filters.window")}
          value={formValues.window}
          options={WINDOWS}
        />
        {kindOptions.length > 1 ? (
          <Field
            name="kind"
            label={t(dict, "news.kind")}
            value={query.kind ?? ""}
            options={[["", "—"], ...kindOptions]}
          />
        ) : null}
        <Field
          name="category"
          label={t(dict, "filters.category")}
          value={query.category ?? ""}
          options={[["", "—"], ...CATEGORY_RULES.map((rule) => [rule.key, rule.labelEn])]}
        />
        <SubmitButton label={t(dict, "filters.apply")} />
      </form>

      <DataNotice locale={locale} />

      {items.length === 0 ? (
        <EmptyState
          locale={locale}
          message={t(dict, "empty.noNews")}
          hint={t(dict, "empty.hintNews")}
          action={{ href: `?window=30d&scope=${query.scope}`, label: t(dict, "empty.widen30") }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {[...groups.entries()].map(([day, dayItems], index) => (
            <details key={day} className="card p-4" open={index === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-2 text-xs text-muted font-mono">
                <span className="flex items-center gap-2">
                  <ChevronDown size={14} aria-hidden="true" className="chev" />
                  {formatter.format(new Date(day))}
                </span>
                <span>{dayItems.length}</span>
              </summary>
              <div className="mt-3 grid grid-cols-1 gap-3">
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
        page={page}
        total={total}
        limit={query.limit}
        /* Same rule as the feed: defaults stay out of the link. */
        formValues={{
          window: formValues.window === "7d" ? undefined : formValues.window,
          scope: formValues.scope,
          kind: formValues.kind || undefined,
          category: formValues.category || undefined
        }}
      />
    </>
  );
}
