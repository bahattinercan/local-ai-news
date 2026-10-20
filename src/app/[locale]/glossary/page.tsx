import Link from "next/link";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  glossaryCategoryCounts,
  glossaryText,
  readingMinutes,
  searchGlossary,
  type GlossaryCategory
} from "@/lib/glossary";
import { cleanSearch } from "@/lib/query";
import { cn } from "@/lib/format";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { EmptyState } from "@/components/EmptyState";
import { GhostLink, SubmitButton } from "@/components/ui/Controls";
import { GlossaryRow } from "@/components/glossary/GlossaryRow";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";

/**
 * The glossary index — an Almanac page (docs/en/DESIGN-V3.md §7.1, GLOSSARY-PLAN.md).
 *
 * Three things changed from the card grid this page used to be:
 *  1. one alphabetical list instead of four category sections, split into two
 *     columns on `lg` so eleven entries fit on one screen (the category survives
 *     as a filter, not as a heading);
 *  2. it answers `?q=` itself, so the desk magnifier no longer dumps the reader on
 *     `/models` when they were looking for a definition;
 *  3. rows state a reading cost instead of the `N §` paragraph count.
 */
const CATEGORY_KEYS = Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[];

function isCategory(value: string | undefined): value is GlossaryCategory {
  return value !== undefined && CATEGORY_KEYS.includes(value as GlossaryCategory);
}

export default async function GlossaryPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const search = cleanSearch(await searchParams);
  /* A hand-edited URL must not be able to ask for a 5 000-character scan. */
  const query = (search.q ?? "").slice(0, 60);
  const category = isCategory(search.cat) ? search.cat : undefined;

  const counts = glossaryCategoryCounts();
  const matches = searchGlossary(query, locale).filter(
    (match) => category === undefined || match.entry.category === category
  );
  const columnBreak = Math.ceil(matches.length / 2);
  const columns = [matches.slice(0, columnBreak), matches.slice(columnBreak)];
  const total = GLOSSARY.length;
  const filtered = query !== "" || category !== undefined;

  return (
    <>
      <DeskNav locale={locale} section="glossary" />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: t(dict, "glossary.title"),
          inLanguage: locale,
          hasDefinedTerm: GLOSSARY.map((entry) => ({
            "@type": "DefinedTerm",
            name: glossaryText(entry, locale).term,
            description: glossaryText(entry, locale).summary,
            url: `${hrefFor(locale, `/glossary/${entry.slug}`)}`,
            inDefinedTermSet: t(dict, "glossary.title")
          }))
        }}
      />

      <PageHeader
        title={t(dict, "glossary.title")}
        kicker={t(dict, "nav.glossary")}
        lede={t(dict, "glossary.subtitle")}
        aside={
          <span className="font-mono text-sm text-muted">
            {total} {t(dict, "glossary.terms")} · {counts.length} {t(dict, "glossary.categories")}
          </span>
        }
      />

      <form
        method="get"
        action={hrefFor(locale, "/glossary")}
        className="rule-bottom flex flex-wrap items-end gap-2 pb-3"
        role="search"
      >
        <label className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
          <span className="label text-muted">{t(dict, "glossary.search")}</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={t(dict, "glossary.searchPlaceholder")}
            className="h-11 w-full border border-control bg-surface px-2.5 text-sm text-text"
          />
        </label>
        {category ? <input type="hidden" name="cat" value={category} /> : null}
        <SubmitButton label={t(dict, "filters.apply")} />
        {filtered ? <GhostLink href={hrefFor(locale, "/glossary")} label={t(dict, "filters.clear")} /> : null}
      </form>

      {/* Taxonomy as type, not as pills — the same device the desk nav uses. */}
      <nav aria-label={t(dict, "glossary.categories")} className="mb-2">
        <ul className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-1">
          <li>
            <Link
              href={hrefFor(locale, `/glossary${query ? `?q=${encodeURIComponent(query)}` : ""}`)}
              aria-current={category === undefined ? "page" : undefined}
              className={cn(
                "label inline-flex min-h-6 items-center gap-1.5 border-b-2 pb-0.5",
                category === undefined
                  ? "border-accent text-text"
                  : "border-transparent text-muted hover:border-rule-strong hover:text-text"
              )}
            >
              {t(dict, "glossary.all")}
              <sup className="font-mono text-[10px]">{total}</sup>
            </Link>
          </li>
          {counts.map((group) => (
            <li key={group.category}>
              <Link
                href={hrefFor(
                  locale,
                  `/glossary?cat=${group.category}${query ? `&q=${encodeURIComponent(query)}` : ""}`
                )}
                aria-current={category === group.category ? "page" : undefined}
                className={cn(
                  "label inline-flex min-h-6 items-center gap-1.5 border-b-2 pb-0.5",
                  category === group.category
                    ? "border-accent text-text"
                    : "border-transparent text-muted hover:border-rule-strong hover:text-text"
                )}
              >
                {GLOSSARY_CATEGORIES[group.category][locale]}
                <sup className="font-mono text-[10px]">{group.count}</sup>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {filtered ? (
        <p className="mb-1 font-mono text-xs text-muted" aria-live="polite">
          {query
            ? t(dict, "glossary.matches", { shown: matches.length, total, query })
            : t(dict, "glossary.filtered", { shown: matches.length, total })}
        </p>
      ) : null}

      {matches.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            locale={locale}
            message={t(dict, "glossary.empty", { query })}
            hint={t(dict, "glossary.emptyHint", { total })}
            action={{ href: hrefFor(locale, "/glossary"), label: t(dict, "filters.clear") }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
          {columns.map((column, index) => (
            <ul key={index} className="min-w-0 rule-strong">
              {column.map((match) => (
                <GlossaryRow
                  key={match.entry.slug}
                  entry={match.entry}
                  locale={locale}
                  minutesLabel={t(dict, "glossary.minRead", { minutes: readingMinutes(match.entry, locale) })}
                />
              ))}
            </ul>
          ))}
        </div>
      )}
    </>
  );
}
