import Link from "next/link";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { Hero } from "@/components/front/Hero";
import { StoryRow } from "@/components/front/StoryRow";
import { ModelRow } from "@/components/front/ModelRow";
import { PromoBox, RssBox } from "@/components/front/Rail";
import { EmptyState } from "@/components/EmptyState";
import { getFrontPage } from "@/lib/store";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";

/**
 * The front page (docs/en/DESIGN-V3.md §7.1).
 *
 * A broadsheet edit of the snapshot, not a query surface: the filterable index
 * lives at `/models` and the old query URLs 308 into it (`middleware.ts`). The
 * composition is the reference's three zones — left column of stories, centre
 * lead, right rail — followed by the ranked band and the wire.
 *
 * It reads no search params on purpose, so "the edition" is one page for
 * everybody; every element that could be filter-dependent either states its own
 * scope or links to the index with that scope.
 */
export default async function FrontPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const days = 7;

  const front = await getFrontPage(days);
  if (!front) {
    return (
      <>
        <DeskNav locale={locale} />
        <EmptyState
          locale={locale}
          message={t(dict, "empty.noModels")}
          hint={t(dict, "empty.hintFilters")}
          action={{ href: hrefFor(locale, "/models"), label: t(dict, "front.browse", { count: 0 }) }}
        />
      </>
    );
  }

  const lead = front.hero;
  const columnStories = front.stories.slice(0, 3);
  const railStories = front.wire.slice(0, 3);
  const wire = front.wire.slice(0, 6);
  /* The promo box advertises a pasteable command, so a 95-character repo id is a
     bad advertisement (measured p90 = 41, max = 95 characters). Prefer the most
     downloaded model whose name still fits on one line next to its figure. */
  const promo = front.hot.find((model) => model.name.length <= 32) ?? front.hot[0] ?? null;

  return (
    <>
      <DeskNav locale={locale} />

      {/* The h1 is a strap line, not a poster: the nameplate above already carries
          the display size, so this states the route in one line and hands the rest
          of the screen to the lead story. */}
      {/* The kicker names the *window*, not the lead story: `BAŞ HABER` printed
          here and again above the hero headline, i.e. the same label twice on one
          screen. The lead story's own kicker stays where it belongs. */}
      <PageHeader
        title={t(dict, "feed.title")}
        kicker={t(dict, "edition.window", { days })}
        aside={<span className="font-mono text-sm text-muted">{front.tracked} {t(dict, "edition.models")}</span>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.05fr)_minmax(0,1fr)]">
        {/* left column */}
        <div className="order-2 lg:order-none lg:border-r lg:border-rule lg:pr-5">
          <h2 className="section-title">
            {t(dict, "front.latest")}
            <span className="section-note font-mono">{front.stories.length}</span>
          </h2>
          {columnStories.length > 0 ? (
            columnStories.map((item) => <StoryRow key={item.externalId} item={item} locale={locale} art="plate" />)
          ) : (
            <p className="py-3 text-sm text-muted">{t(dict, "front.noStories")}</p>
          )}
          <Link href={hrefFor(locale, "/research")} className="arrow-link label text-accent">
            {t(dict, "front.viewAll", { label: t(dict, "nav.research") })}
          </Link>
        </div>

        {/* centre: the lead story and the ranked band */}
        <div className="order-1 lg:order-none">
          {lead ? <Hero item={lead} locale={locale} total={front.stories.length + 1} /> : null}

          {front.hot.length > 0 ? (
            <section className="mt-6" aria-labelledby="most-downloaded">
              <h2 id="most-downloaded" className="section-title">
                {t(dict, "front.mostDownloaded")}
                <span className="section-note">{t(dict, "front.mostDownloadedNote")}</span>
              </h2>
              <ol className="mt-1 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {front.hot.map((model, index) => (
                  <ModelRow
                    key={model.externalId}
                    model={model}
                    locale={locale}
                    rank={index + 1}
                    showsGrowth={front.showsGrowth}
                  />
                ))}
              </ol>
              <Link href={hrefFor(locale, "/models?sort=downloads")} className="arrow-link label mt-2 inline-block text-accent">
                {t(dict, "front.browse", { count: front.tracked })}
              </Link>
            </section>
          ) : null}
        </div>

        {/* right rail */}
        <div className="order-3 space-y-5 lg:order-none lg:border-l lg:border-rule lg:pl-5">
          {promo ? <PromoBox model={promo} locale={locale} /> : null}

          {railStories.length > 0 ? (
            <section aria-labelledby="rail-wire">
              <h2 id="rail-wire" className="section-title">
                {t(dict, "front.wire")}
              </h2>
              {railStories.map((item) => (
                <StoryRow key={item.externalId} item={item} locale={locale} size="lead" art="image" />
              ))}
            </section>
          ) : null}

          <RssBox locale={locale} />
        </div>
      </div>

      {/* the wire, across the page */}
      {wire.length > 0 ? (
        <section className="mt-6" aria-labelledby="wire">
          <h2 id="wire" className="section-title">
            {t(dict, "front.wire")}
            <span className="section-note">{t(dict, "front.wireNote")}</span>
          </h2>
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2 lg:grid-cols-3">
            {wire.map((item) => (
              <StoryRow key={item.externalId} item={item} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
