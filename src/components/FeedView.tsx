import { FeedCard } from "./FeedCard";
import { FilterBar } from "./FilterBar";
import { EmptyState } from "./EmptyState";
import { SavedFilters } from "./SavedFilters";
import { Pagination } from "./Pagination";
import { PulseStrip } from "./PulseStrip";
import { getFeed, countFeed } from "@/lib/store";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { FEED_DEFAULTS, clampPage, type normalizeFeedQuery } from "@/lib/query";

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
  /* Count first, then clamp: `?page=999` on a 60-page result used to render an
     empty grid on a page number that does not exist. The clamped number is what
     the list, the strip and the "Page N" label all have to agree on. */
  const total = await countFeed(query);  const page = clampPage(query.page, total, query.limit);
  const models = await getFeed({ ...query, page });

  /* Built from the *parsed* query, not from the raw search params: the selects
     and the active-filter summary must show what the server actually filtered
     on, and a hand-edited `?window=abc` must not print a value that no option
     holds. `gate: "all"` is kept when the user asked for it so the "show
     everything was dialled back" notice stays visible. */
  const formValues: Record<string, string | undefined> = {
    ...raw,
    window: query.windowDays === 1 ? "24h" : `${query.windowDays}d`,
    sort: query.sort,
    gate: query.gateForced ? "all" : query.gate,
    runner: query.runner ?? "",
    maxParams: query.maxParams ? String(query.maxParams) : "",
    license: query.license ?? "",
    q: query.q ?? ""
  };

  /* Link targets, not form values: a link must not spend URL space on the values
     the page already defaults to (`?window=7d&sort=new&gate=passed&page=2`). */
  const linkValues: Record<string, string | undefined> = {
    window: formValues.window === FEED_DEFAULTS.window ? undefined : formValues.window,
    sort: formValues.sort === FEED_DEFAULTS.sort ? undefined : formValues.sort,
    gate: formValues.gate === FEED_DEFAULTS.gate ? undefined : formValues.gate,
    runner: query.runner,
    maxParams: query.maxParams ? String(query.maxParams) : undefined,
    license: query.license,
    q: query.q
  };

  const maxDownloads = models.reduce((max, model) => Math.max(max, model.downloads ?? 0), 0);

  return (
    <>
      <PulseStrip locale={locale} days={query.windowDays} category={category} />
      {/* No separate DataNotice here: the pulse card already states "last refresh"
          and the footer carries the source and the snapshot age. Rendering both
          cost 28 px of the first screen and repeated the same number. */}
      <FilterBar locale={locale} category={category} query={formValues} gateForced={query.gateForced}>
        <SavedFilters
          locale={locale}
          currentQuery={new URLSearchParams(Object.entries(raw).filter((entry): entry is [string, string] => entry[1] !== undefined)).toString()}
        />
      </FilterBar>

      {models.length === 0 ? (
        <section className="mt-6" aria-labelledby="models-heading">
          <h2 id="models-heading" className="mb-2 flex items-baseline gap-2 text-lg font-semibold tracking-tight">
            {t(dict, "feed.models")}
            <span className="font-mono text-xs font-normal text-muted">{total}</span>
          </h2>
          <EmptyState
            locale={locale}
            message={t(dict, "empty.noModels")}
            hint={t(dict, "empty.hintFilters")}
            action={{ href: category ? hrefFor(locale, `/c/${category}`) : hrefFor(locale, "/"), label: t(dict, "filters.clear") }}
          />
        </section>
      ) : (
        <section className="mt-6" aria-labelledby="models-heading">
          <h2 id="models-heading" className="mb-2 flex items-baseline gap-2 text-lg font-semibold tracking-tight">
            {t(dict, "feed.models")}
            <span className="font-mono text-xs font-normal text-muted">{total}</span>
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {models.map((model, index) => (
              /* `min-w-0` is load-bearing: a grid item defaults to `min-width: auto`,
                 so one card with an unbreakable 45-character repo id sized the whole
                 track at 753 px and pushed the page 424 px wide on a 360 px phone
                 (measured; the container is 361 px). */
              <div key={model.externalId} className="fade-up min-w-0" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                <FeedCard model={model} locale={locale} maxDownloads={maxDownloads} />
              </div>
            ))}
          </div>
        </section>
      )}

      <Pagination locale={locale} page={page} total={total} limit={query.limit} formValues={linkValues} />
    </>
  );
}
