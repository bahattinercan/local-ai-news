import { FeedCard } from "./FeedCard";
import { FilterBar } from "./FilterBar";
import { EmptyState, DataNotice } from "./EmptyState";
import { SavedFilters } from "./SavedFilters";
import { getFeed } from "@/lib/store";
import { dictionary, t, type Locale } from "@/i18n";
import type { normalizeFeedQuery } from "@/lib/query";

export async function FeedView({
  locale,
  category,
  query,
  raw
}: {
  locale: Locale;
  category?: string;
  query: ReturnType<typeof normalizeFeedQuery>;
  raw: Record<string, string | undefined>;
}) {
  const dict = dictionary(locale);
  const models = await getFeed(query);

  const formValues: Record<string, string | undefined> = {
    ...raw,
    window: raw.window ?? (query.windowDays === 1 ? "24h" : `${query.windowDays}d`),
    sort: raw.sort ?? query.sort,
    gate: raw.gate ?? query.gate
  };

  return (
    <>
      <DataNotice locale={locale} />
      <FilterBar locale={locale} category={category} query={formValues} gateForced={query.gateForced} />
      <SavedFilters locale={locale} currentQuery={new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString()} />

      {models.length === 0 ? (
        <div className="mt-4">
          <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {models.map((model) => (
            <FeedCard key={model.externalId} model={model} locale={locale} />
          ))}
        </div>
      )}

      {models.length === query.limit ? (
        <p className="mt-4 flex flex-wrap gap-3 text-sm">
          <a
            href={`?${new URLSearchParams({ ...formValues, page: String(query.page + 1) })}`}
            className="rounded border border-border px-3 py-1.5"
          >
            {t(dict, "common.loadMore")}
          </a>
          <span className="text-muted">{t(dict, "common.page", { page: query.page })}</span>
        </p>
      ) : null}
    </>
  );
}
