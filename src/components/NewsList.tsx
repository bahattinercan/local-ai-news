import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { getNews, countNews } from "@/lib/store";
import { CATEGORY_RULES, categoryLabel } from "@/lib/classify/rules";
import { clampPage } from "@/lib/query";
import { cn } from "@/lib/format";
import { dictionary, t, type Dictionary, type Locale } from "@/i18n";
import { EmptyState, DataNotice } from "./EmptyState";
import { Pagination } from "./Pagination";
import { GhostLink, SubmitButton } from "./ui/Controls";
import { Hero } from "./front/Hero";
import { StoryRow } from "./front/StoryRow";
import { RssBox } from "./front/Rail";
import type { NewsScope } from "@/lib/query";
import type { NewsQuery } from "@/lib/store";

const WINDOWS = [["24h", "24h"], ["7d", "7d"], ["30d", "30d"], ["90d", "90d"]];
const DEFAULT_WINDOW = "7d";

/**
 * One line of the filter slip.
 *
 * The three selects used to be content-sized boxes in a wrapping flex row, so
 * they landed on two ragged lines (WINDOW+KIND, then CATEGORY+Apply) and no two
 * edges lined up. Each field is now its own ruled line - label, then a control
 * that takes the rest of the line - at every width, so all three selects share
 * one column and the slip cannot re-flow per label length. (A responsive
 * `grid-cols-2` + `col-span-2` pairing was tried for phones: the spanning item
 * grows the implicit grid to two columns, the label column then inherits `auto`
 * sizing and the rows land side by side at desktop too. One layout, no spans.)
 *
 * Between the label and the control there used to be a dotted leader. With a
 * 9.5rem box pinned to the right it left ~180px of dots in the middle of the
 * rail, which read as a broken ellipsis rather than as typography - so the
 * leader is gone and the control now spans the rest of the line instead.
 */
function FilterRow({
  idPrefix,
  name,
  label,
  value,
  options,
  active
}: {
  /** The slip is rendered twice (a phone disclosure and the open desktop one),
   *  so `htmlFor`/`id` need a per-copy prefix to stay unique. */
  idPrefix: string;
  name: string;
  label: string;
  value: string;
  options: string[][];
  /** A filter the reader set, drawn in accent ink so the slip states its own state. */
  active: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <label htmlFor={`${idPrefix}-${name}`} className="label w-24 shrink-0 text-muted">
        {label}
      </label>
      <select
        id={`${idPrefix}-${name}`}
        name={name}
        defaultValue={value}
        className={cn(
          "h-10 min-w-0 flex-1 border bg-surface px-2 text-sm text-text",
          active ? "border-accent" : "border-control"
        )}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * The slip itself: three ruled lines and the action footer.
 *
 * Rendered twice on purpose - once inside the phone disclosure, once in the
 * desktop rail - because "collapse below `lg`, always open above it" cannot be
 * expressed in one DOM: a `<details>` keeps its body out of the tab order while
 * closed, and the two CSS-only escapes (forcing `display` on the body, or
 * swapping `open` per breakpoint) either break `Tab` on desktop or need client
 * JS and a hydration-safe measured width. Two copies of a form are cheap; a
 * filter nobody can reach by keyboard is not.
 *
 * A GET form with no `action`: the filter state is the URL, and every untouched
 * select submits `""` - `cleanSearch` drops those upstream.
 *
 * The `key` is not decoration: `Clear`, the lead's desk link and pagination are
 * all client-side navigations, and an uncontrolled `<select defaultValue>`
 * ignores a changed `defaultValue` on the same element - measured, `Clear`
 * emptied the URL while the slip went on printing `30d / release / video`.
 * Remounting on a change of the query is what keeps the printed state and the
 * URL the same thing.
 */
function FilterSlip({
  idPrefix,
  locale,
  dict,
  scope,
  windowValue,
  kindOptions,
  kind,
  category,
  setFilters
}: {
  idPrefix: string;
  locale: Locale;
  dict: Dictionary;
  scope: NewsScope;
  windowValue: string;
  kindOptions: string[][];
  kind: string;
  category: string;
  setFilters: number;
}) {
  return (
    <form key={`${windowValue}|${scope}|${kind}|${category}`} method="get" className="mt-2 text-sm">
      <input type="hidden" name="scope" value={scope} />

      <div className="grid grid-cols-1 divide-y divide-rule">
        <FilterRow
          idPrefix={idPrefix}
          name="window"
          label={t(dict, "filters.window")}
          value={windowValue}
          options={WINDOWS}
          active={windowValue !== DEFAULT_WINDOW}
        />
        {kindOptions.length > 1 ? (
          <FilterRow
            idPrefix={idPrefix}
            name="kind"
            label={t(dict, "news.kind")}
            value={kind}
            options={[["", "-"], ...kindOptions]}
            active={kind !== ""}
          />
        ) : null}
        {/* The desk names come from `categoryLabel`, the same helper the desk nav,
            the rows and the desk page use: a hand-written `labelTr : labelEn` here
            was a second place to keep the decision, and it drifted. */}
        <FilterRow
          idPrefix={idPrefix}
          name="category"
          label={t(dict, "filters.category")}
          value={category}
          options={[["", "-"], ...CATEGORY_RULES.map((rule) => [rule.key, categoryLabel(rule.key, locale)])]}
          active={category !== ""}
        />
      </div>

      {/* The action sits in its own footer instead of floating mid-slip, and
          `Clear` appears only when there is something to clear. */}
      <div className="mt-2 flex items-center gap-2 border-t border-rule pt-2">
        <SubmitButton label={t(dict, "filters.apply")} className="h-10 flex-1 text-[11px] uppercase tracking-[0.14em]" />
        {setFilters > 0 ? (
          <GhostLink
            href={`?scope=${scope}`}
            label={t(dict, "filters.clear")}
            className="h-10 shrink-0 px-3 text-[11px] uppercase tracking-[0.14em]"
          />
        ) : null}
      </div>
    </form>
  );
}

/** The kind filter only lists what the surface owns, so it can never return nothing. */
const SCOPE_KINDS: Record<NewsScope, string[]> = {
  news: ["release", "announcement", "runtime", "community"],
  research: [],
  all: ["paper", "release", "announcement", "runtime", "community"]
};

/**
 * Desk order, printer's logic rather than alphabetical: what the wire desk would
 * print above the fold first. A desk with no rows in the current page is not
 * rendered at all, so the page never promises a section it cannot fill.
 */
const KIND_ORDER = ["release", "announcement", "runtime", "community", "paper"];

export type NewsListQuery = NewsQuery & { scope: NewsScope; page: number };

/**
 * The wire list, shared by /news and /research (docs/en/DESIGN-V3.md §7.1).
 *
 * This is the front page's language applied to a query surface: one lead story in
 * the hero slot, then the rest of the page filed into desks by `kind`, each desk
 * on its own section rule and every row a `StoryRow`. Nothing here is a rounded
 * card - a printed page separates with hairlines, not with boxes (DESIGN-V3 D8).
 *
 * The scope decides which kinds the surface owns and the kind filter offers only
 * those, so a paper can never show up on /news or vice versa. The lead is only
 * promoted on page 1: on page 2 the newest item is simply the first row of its
 * desk, because a hero that repeats on every page is not a hero, it is a banner.
 */
export async function NewsList({ locale, query }: { locale: Locale; query: NewsListQuery }) {
  const dict = dictionary(locale);
  /* Same clamp as the feed: `?page=999` used to render an empty page under a
     "Page 999" heading instead of the last page that exists. */
  const total = await countNews(query);
  const page = clampPage(query.page, total, query.limit);
  const items = await getNews({ ...query, page });

  const windowValue = query.windowDays === 1 ? "24h" : `${query.windowDays}d`;

  /* The lead is the newest item *that has a thumbnail*, so the largest slot on the
     page is a photograph rather than a placeholder whenever one exists. */
  const lead = page === 1 ? (items.find((item) => item.thumbnail) ?? items[0] ?? null) : null;
  const rest = lead ? items.filter((item) => item.externalId !== lead.externalId) : items;

  const desks = KIND_ORDER.map((kind) => ({
    kind,
    items: rest.filter((item) => item.kind === kind)
  })).filter((desk) => desk.items.length > 0);

  const kindOptions: string[][] = SCOPE_KINDS[query.scope].map((kind) => [kind, t(dict, `news.${kind}`)]);
  const formValues = {
    window: windowValue,
    scope: query.scope,
    kind: query.kind ?? "",
    category: query.category ?? ""
  };

  /* Which of the three slip lines the reader actually changed, and how to get
     back to the surface's own slice. The slip used to print no state at all: a
     filtered page looked exactly like an unfiltered one. */
  const setFilters = [
    windowValue !== DEFAULT_WINDOW,
    formValues.kind !== "",
    formValues.category !== ""
  ].filter(Boolean).length;

  /* The lead's trail links back into its own desk: `All releases →`. The window
     is carried, so the link lands on the same slice the reader is looking at. */
  const leadTrail =
    lead && SCOPE_KINDS[query.scope].length > 1 ? (
      <Link
        href={`?${new URLSearchParams({
          window: windowValue,
          scope: query.scope,
          kind: lead.kind
        }).toString()}`}
        className="arrow-link text-accent"
      >
        {t(dict, "front.viewAll", { label: t(dict, `news.${lead.kind}`) })}
      </Link>
    ) : null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)]">
      {/* --- the wire itself: lead, then the desks --- */}
      <div className="order-2 min-w-0 lg:order-none">
        {lead ? <Hero item={lead} locale={locale} trail={leadTrail} sizes="(min-width: 1024px) 820px, 100vw" /> : null}

        {items.length === 0 ? (
          <EmptyState
            locale={locale}
            message={t(dict, "empty.noNews")}
            hint={t(dict, "empty.hintNews")}
            action={{ href: `?window=30d&scope=${query.scope}`, label: t(dict, "empty.widen30") }}
          />
        ) : (
          desks.map((desk) => (
            <section key={desk.kind} className="mt-6" aria-labelledby={`desk-${desk.kind}`}>
              <h2 id={`desk-${desk.kind}`} className="section-title">
                {t(dict, `news.${desk.kind}`)}
                <span className="section-note font-mono">{desk.items.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
                {desk.items.map((item) => (
                  <StoryRow key={item.externalId} item={item} locale={locale} art="image" />
                ))}
              </div>
            </section>
          ))
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
      </div>

      {/* --- the rail: the filter box, then the syndication box --- */}
      {/* Sticky on `lg` only: the wire runs for thousands of pixels, and a rail
          that scrolls away leaves the filter unreachable exactly when a reader has
          decided the current window is wrong. `self-start` is what lets a stretched
          grid item take its content height and then stick. */}
      <aside className="order-1 min-w-0 space-y-5 lg:order-none lg:sticky lg:top-4 lg:self-start lg:border-l lg:border-rule lg:pl-5">
        <section aria-label={t(dict, "filters.title")}>
          {/* Phone first: one ruled line instead of three selects. Below `lg` the
              slip is a disclosure so the wire is not pushed a screen down; the
              summary keeps the section rule, the count and a chevron, so a
              filtered page still says so with the panel closed. */}
          <details className="group lg:hidden">
            <summary className="section-title min-h-11 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">
              {t(dict, "filters.title")}
              {setFilters > 0 ? <span className="section-note font-mono">{setFilters}</span> : null}
              <span className="ml-auto flex items-center gap-1 text-muted">
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-open:rotate-180"
                />
              </span>
            </summary>
            <FilterSlip
              idPrefix="slip-m"
              locale={locale}
              dict={dict}
              scope={query.scope}
              windowValue={windowValue}
              kindOptions={kindOptions}
              kind={formValues.kind}
              category={formValues.category}
              setFilters={setFilters}
            />
          </details>

          {/* The rail keeps the panel open: there is room for it, and a hidden
              filter next to a visible list is a filter nobody uses. */}
          <div className="hidden lg:block">
            <h2 className="section-title">
              {t(dict, "filters.title")}
              {setFilters > 0 ? <span className="section-note font-mono">{setFilters}</span> : null}
            </h2>
            <FilterSlip
              idPrefix="slip-d"
              locale={locale}
              dict={dict}
              scope={query.scope}
              windowValue={windowValue}
              kindOptions={kindOptions}
              kind={formValues.kind}
              category={formValues.category}
              setFilters={setFilters}
            />
          </div>

          <DataNotice locale={locale} className="mt-3" />
        </section>

        <RssBox locale={locale} />
      </aside>
    </div>
  );
}
