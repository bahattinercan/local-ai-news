import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { DataNotice } from "@/components/EmptyState";
import { CompareFootnote, CompareSheet } from "@/components/compare/CompareSheet";
import {
  CompareActions,
  CompareAddForm,
  ComparePairs,
  CompareSuggestions
} from "@/components/compare/ComparePicker";
import {
  COMPARE_CAP,
  compareHref,
  compareRows,
  compareSlugOf,
  parseCompareIds,
  splitResolved,
  suggestPairs,
  topDifferences
} from "@/lib/compare";
import { getCompareSuggestions, getModelsBySlugs, getTrackedSlugs } from "@/lib/store";
import { dictionary, hrefFor, pickLocale, t, type Locale } from "@/i18n";
import { languageAlternates } from "@/lib/seo";
import type { ClassifiedModel } from "@/lib/model";

/**
 * The comparison sheet (docs/en/COMPARE-PLAN.md).
 *
 * The address is the state, and it accepts what a reader actually has: the Hub
 * repo id (`owner/model`), the feed's slug (`owner-model`), or a Hub URL. The same
 * parser backs the add form, so the taught form and the working form cannot drift
 * apart - the empty state used to document `?ids=owner/model`, which never
 * resolved because `slugify()` turns `/` into `-`.
 *
 * Every state is explained: nothing selected (picker + computed pairs), one model
 * (neighbours), unresolvable addresses (named, not silently dropped), more than
 * four (named), duplicates (named). Nothing is invented and nothing disappears.
 */

const FOOTNOTE_ID = "compare-how-to-read";

function single(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" ? raw : "";
}

interface CompareSearch {
  ids?: string | string[];
  add?: string | string[];
}

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CompareSearch>;
}): Promise<Metadata> {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const parsed = parseCompareIds((await searchParams).ids);
  const models = await getModelsBySlugs(parsed.slugs);
  const canonical = compareHref(locale, models.map((model) => model.slug));

  if (models.length === 0) {
    const title = t(dict, "compare.title");
    const description = t(dict, "compare.metaDescription");
    return {
      title,
      description,
      alternates: { canonical, languages: languageAlternates("/compare") },
      openGraph: { type: "website", url: canonical, title, description },
      twitter: { card: "summary" }
    };
  }

  const names = models.map((model) => model.externalId);
  const lead = names.slice(0, 2).join(` ${t(dict, "compare.vs")} `);
  const short = names.length > 2 ? `${lead} +${names.length - 2}` : lead;
  const title = t(dict, "compare.metaTitle", { names: short });
  const description = t(dict, "compare.metaDescriptionModels", { names: names.join(", ") });

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, title, description },
    twitter: { card: "summary" },
    /* A tool page with near-infinite permutations: compared sheets are excluded
       from the index, the empty /compare stays indexable and stays in the sitemap. */
    robots: { index: false, follow: true }
  };
}

export default async function ComparePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<CompareSearch>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const search = await searchParams;

  const parsed = parseCompareIds(search.ids);
  const { models: resolvedModels, rejected } = splitResolved(parsed.tokens, await getModelsBySlugs(parsed.slugs));
  const models = resolvedModels;

  /* The add form is a GET form: it carries the current list plus a typed address. */
  const addRaw = single(search.add).trim();
  let addError: string | null = null;
  let addBlocked = false;

  if (addRaw) {
    const slug = compareSlugOf(addRaw);
    if (!slug) {
      addError = addRaw;
    } else if (models.some((model) => model.slug.toLowerCase() === slug.toLowerCase())) {
      /* Already on the sheet: clean the address instead of showing a duplicate. */
      redirect(compareHref(locale, models.map((model) => model.slug)));
    } else if (models.length >= COMPARE_CAP) {
      addBlocked = true;
    } else {
      const [added] = await getModelsBySlugs([slug]);
      if (added) redirect(compareHref(locale, [...models.map((model) => model.slug), added.slug]));
      addError = addRaw;
    }
  }

  const notices: string[] = [];
  if (addError) notices.push(t(dict, "compare.addNotFound", { value: addError }));
  if (addBlocked) notices.push(t(dict, "compare.capReached", { cap: COMPARE_CAP }));
  if (rejected.length > 0) {
    notices.push(
      t(dict, "compare.rejected", {
        count: rejected.length,
        total: parsed.tokens.length,
        list: rejected.join(", ")
      })
    );
  }
  if (parsed.overflow.length > 0) {
    notices.push(t(dict, "compare.overflow", { cap: COMPARE_CAP, list: parsed.overflow.join(", ") }));
  }
  if (parsed.duplicates.length > 0) {
    notices.push(t(dict, "compare.duplicates", { list: parsed.duplicates.join(", ") }));
  }
  if (models.length === 1) notices.push(t(dict, "compare.oneModel"));

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const path = compareHref(locale, models.map((model) => model.slug));
  const absoluteUrl = host ? `${protocol}://${host}${path}` : path;

  /* One snapshot read for the empty state too: chips are this week's most
     downloaded, pairs are computed from the same pool (C14). */
  const suggestions = models.length === 0 ? await getCompareSuggestions(null, 40) : [];
  const neighbours = models.length === 1 ? await getCompareSuggestions(models[0], 6) : [];

  const groups =
    models.length > 0 ? compareRows(models, locale, { knownSlugs: await getTrackedSlugs() }) : [];
  const differences = topDifferences(groups);

  return (
    <>
      <DeskNav locale={locale} section="compare" />
      <PageHeader
        title={t(dict, "compare.title")}
        kicker={t(dict, "nav.compare")}
        lede={t(dict, "compare.lede")}
        aside={
          models.length > 0 ? (
            <span className="font-mono text-xs text-muted">
              {t(dict, "compare.selected", { count: models.length, cap: COMPARE_CAP })}
            </span>
          ) : undefined
        }
      />
      <DataNotice locale={locale} />

      {notices.length > 0 ? (
        <ul role="status" className="mb-3 space-y-1 border-l-2 border-accent pl-3 text-sm text-muted">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}

      {models.length === 0 ? (
        <EmptyCompare locale={locale} suggestions={suggestions} />
      ) : (
        <>
          <CompareAddForm locale={locale} selected={models} value={addError ?? ""} />
          {models.length === 1 ? (
            <CompareSuggestions
              locale={locale}
              models={neighbours}
              selected={models}
              title={t(dict, "compare.neighbours")}
            />
          ) : null}
          <CompareActions locale={locale} models={models} absoluteUrl={absoluteUrl} />
          <div className="mt-4">
            <CompareSheet
              locale={locale}
              models={models}
              groups={groups}
              differences={differences}
              footnoteId={FOOTNOTE_ID}
            />
          </div>
          <CompareFootnote locale={locale} id={FOOTNOTE_ID} />
        </>
      )}
    </>
  );
}

/** Nothing selected: teach the three address forms, then offer two ways in. */
function EmptyCompare({ locale, suggestions }: { locale: Locale; suggestions: ClassifiedModel[] }) {
  const dict = dictionary(locale);
  const chips = suggestions.slice(0, 8);
  const pairs = suggestPairs(suggestions, 3);

  return (
    <>
      <section className="rule-strong border-b border-rule pt-4 pb-5">
        <h2 className="font-display text-lg font-bold tracking-tight">{t(dict, "compare.emptyTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t(dict, "compare.emptyBody")}</p>
        <p className="mt-2 font-mono text-xs text-muted">{t(dict, "compare.formatExamples")}</p>
        <CompareAddForm locale={locale} selected={[]} />
      </section>

      <CompareSuggestions
        locale={locale}
        models={chips}
        selected={[]}
        title={t(dict, "compare.mostDownloaded")}
      />
      <ComparePairs locale={locale} pairs={pairs} />

      <p className="mt-6 text-sm">
        <Link href={hrefFor(locale, "/models")} className="text-muted hover:text-text">
          {t(dict, "empty.backToFeed")}
        </Link>
      </p>

      <CompareFootnote locale={locale} id={FOOTNOTE_ID} />
    </>
  );
}
