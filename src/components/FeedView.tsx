import { FeedCard } from "./FeedCard";
import { FilterBar } from "./FilterBar";
import { EmptyState, DataNotice } from "./EmptyState";
import { SavedFilters } from "./SavedFilters";
import { Pagination } from "./Pagination";
import { PulseStrip } from "./PulseStrip";
import { getFeed, countFeed } from "@/lib/store";
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
  const total = await countFeed(query);

  const formValues: Record<string, string | undefined> = {
    ...raw,
    window: raw.window ?? (query.windowDays === 1 ? "24h" : `${query.windowDays}d`),
    sort: raw.sort ?? query.sort,
    gate: raw.gate ?? query.gate
  };

  const maxDownloads = models.reduce((max, model) => Math.max(max, model.downloads ?? 0), 0);

  return (
    <>
      <PulseStrip locale={locale} days={query.windowDays} />
      <DataNotice locale={locale} />
      <FilterBar locale={locale} category={category} query={formValues} gateForced={query.gateForced} />
      <SavedFilters locale={locale} currentQuery={new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString()} />

      {models.length === 0 ? (
        <div className="mt-4">
          <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {models.map((model, index) => (
            <div key={model.externalId} className="fade-up" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
              <FeedCard model={model} locale={locale} maxDownloads={maxDownloads} />
            </div>
          ))}
        </div>
      )}

      <Pagination locale={locale} page={query.page} total={total} limit={query.limit} formValues={formValues} />
    </>
  );
}
