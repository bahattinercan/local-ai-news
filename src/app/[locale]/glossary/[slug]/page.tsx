import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GLOSSARY,
  GLOSSARY_CATEGORIES,
  bodySegments,
  getGlossaryEntry,
  glossaryNeighbours,
  glossaryText,
  readingMinutes
} from "@/lib/glossary";
import { getGlossaryEvidence } from "@/lib/store";
import { relativeTime } from "@/lib/format";
import { truncateAtWord } from "@/lib/news-text";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { VramCalculator } from "@/components/VramCalculator";
import { Evidence } from "@/components/glossary/Evidence";
import { QuantizationTable } from "@/components/glossary/QuantizationTable";
import { VramExamples } from "@/components/glossary/VramExamples";
import { SITE_NAME, canonicalUrl, languageAlternates } from "@/lib/seo";
import { DeskNav } from "@/components/shell/DeskNav";

/** Derived, never hand-listed: a new entry is prerendered automatically. */
export function generateStaticParams() {
  return GLOSSARY.map((entry) => ({ slug: entry.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const entry = getGlossaryEntry(slug);
  if (!entry) notFound();

  const text = glossaryText(entry, locale);
  const path = `/glossary/${entry.slug}`;
  const canonical = canonicalUrl(locale, path);
  const tail =
    locale === "tr"
      ? "Tanım, güncel snapshot'tan kanıt ve VRAM hesaplayıcı."
      : "Definition, evidence from the current snapshot and a VRAM calculator.";
  const description = truncateAtWord(`${text.summary} ${tail}`, 160);

  return {
    title: text.term,
    description,
    alternates: { canonical, languages: languageAlternates(path) },
    openGraph: { type: "article", url: canonical, title: `${text.term} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
}

/**
 * A term's page: definition, then the evidence behind it, then the tools the
 * definition refers to (docs/en/GLOSSARY-PLAN.md G3).
 *
 * What changed from the old prose-only article, all measured before:
 *  - in-body cross-references: 0 → every `{slug}` token in the copy becomes a real
 *    link to the term it names (first occurrence only, so the page is not a wall
 *    of links);
 *  - the numbers are derived (`estimateVramGb`, `BYTES_PER_PARAM`, the snapshot)
 *    instead of retyped, so an ingest cannot falsify a definition;
 *  - the reader can leave: a filtered slice of the model index, the previous/next
 *    term in the same alphabetical order, and the calculator.
 */
export default async function GlossaryEntryPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const dict = dictionary(locale);
  const entry = getGlossaryEntry(slug);

  if (!entry) notFound();

  const text = glossaryText(entry, locale);
  const related = entry.related
    .map((relatedSlug) => getGlossaryEntry(relatedSlug))
    .filter((value): value is NonNullable<typeof value> => value !== undefined);
  const { previous, next } = glossaryNeighbours(entry.slug, locale);
  const evidence = entry.stat ? await getGlossaryEvidence() : null;

  /* `stat` says *which* snapshot figure this term is about; the numbers and their
     denominators come from the snapshot, never from the copy. */
  const statBlock = (() => {
    if (!entry.stat || !evidence) return null;
    const source = {
      quantizations: {
        label: "glossary.statQuantizations",
        count: evidence.coverage.quantizations,
        rows: evidence.quantizations
      },
      runners: { label: "glossary.statRunners", count: evidence.coverage.runners, rows: evidence.runners },
      library: { label: "glossary.statLibrary", count: evidence.coverage.library, rows: evidence.library },
      params: { label: "glossary.statParams", count: evidence.coverage.params, rows: [] as Array<[string, number]> },
      gate: { label: "glossary.statGate", count: evidence.coverage.gate, rows: [] as Array<[string, number]> },
      downloads: {
        label: "glossary.statDownloads",
        count: evidence.coverage.downloads,
        rows: [] as Array<[string, number]>
      },
      storage: { label: "glossary.statStorage", count: evidence.coverage.storage, rows: [] as Array<[string, number]> },
      gated: { label: "glossary.statGated", count: evidence.coverage.gated, rows: [] as Array<[string, number]> }
    }[entry.stat];

    return {
      coverage: t(dict, "glossary.evidenceCoverage", { count: source.count, total: evidence.total }),
      note: t(dict, source.label),
      rows: source.rows,
      caption: evidence.snapshotAt
        ? t(dict, "data.updated", { when: relativeTime(evidence.snapshotAt) })
        : undefined
    };
  })();

  /* One link per term per page: the second mention of "GGUF" is just the word. */
  const linked = new Set<string>();

  return (
    <>
      <DeskNav locale={locale} section="glossary" exact={false} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "DefinedTerm",
              name: text.term,
              description: text.summary,
              url: `${hrefFor(locale, `/glossary/${entry.slug}`)}`,
              inLanguage: locale,
              inDefinedTermSet: `${hrefFor(locale, "/glossary")}`
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: t(dict, "glossary.title"),
                  item: `${hrefFor(locale, "/glossary")}`
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: text.term,
                  item: `${hrefFor(locale, `/glossary/${entry.slug}`)}`
                }
              ]
            }
          ]
        }}
      />

      {/* 44 px, not 19: the only sub-24 px target on this page was this back link. */}
      <p className="mb-2">
        <Link
          href={hrefFor(locale, "/glossary")}
          className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-text"
        >
          <span aria-hidden="true">←</span> {t(dict, "glossary.title")}
        </Link>
      </p>

      <article className="rule-strong pt-2">
        <span className="label text-accent">{GLOSSARY_CATEGORIES[entry.category][locale]}</span>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-balance">{text.term}</h1>
        <p className="mt-2 text-sm text-accent">{text.summary}</p>
        <p className="mt-1 font-mono text-xs text-muted">
          {t(dict, "glossary.minRead", { minutes: readingMinutes(entry, locale) })}
        </p>

        <div className="mt-4 grid max-w-2xl gap-3">
          {text.body.map((paragraph, index) => (
            <p key={index} className="text-[15px] leading-relaxed text-muted break-words">
              {bodySegments(paragraph).map((segment, segmentIndex) => {
                if (segment.kind === "text") return <Fragment key={segmentIndex}>{segment.text}</Fragment>;

                const target = getGlossaryEntry(segment.slug);
                if (!target) return <Fragment key={segmentIndex}>{segment.slug}</Fragment>;
                const label = glossaryText(target, locale).term;
                if (linked.has(segment.slug)) return <Fragment key={segmentIndex}>{label}</Fragment>;
                linked.add(segment.slug);

                return (
                  <Link
                    key={segmentIndex}
                    href={hrefFor(locale, `/glossary/${segment.slug}`)}
                    className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                  >
                    {label}
                  </Link>
                );
              })}
            </p>
          ))}
        </div>
      </article>

      {statBlock ? (
        <Evidence title={t(dict, "glossary.evidence")} {...statBlock} />
      ) : null}

      {entry.widget === "quantization-table" ? (
        <QuantizationTable title={t(dict, "glossary.evidenceBytes")} />
      ) : null}

      {entry.examples?.length ? (
        <VramExamples
          title={t(dict, "glossary.evidenceExamples")}
          caption={[
            t(dict, "detail.calcParams"),
            t(dict, "detail.calcQuant"),
            t(dict, "detail.calcContext"),
            t(dict, "detail.calcResult")
          ]}
          examples={entry.examples}
        />
      ) : null}

      {entry.widget === "vram-calculator" ? (
        <section className="rule-strong mt-6 pt-2">
          <h2 className="section-title mb-2">{t(dict, "detail.vramCalc")}</h2>
          <VramCalculator
            /* Prefilled with a plausible 8B so the tool shows a result instead of
               an empty box; the label says so and the field stays editable. */
            paramsTotal={8e9}
            quantizations={[]}
            labels={{
              params: t(dict, "detail.calcParams"),
              quantization: t(dict, "detail.calcQuant"),
              context: t(dict, "detail.calcContext"),
              result: t(dict, "detail.calcResult"),
              manual: t(dict, "glossary.calcPrefill"),
              derived: t(dict, "detail.calcDerived")
            }}
          />
        </section>
      ) : null}

      {entry.explore?.length ? (
        <section className="rule-strong mt-6 pt-2">
          <h2 className="section-title">{t(dict, "glossary.explore")}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.explore.map((link) => (
              <Link
                key={link.query}
                href={hrefFor(locale, link.query)}
                className="inline-flex min-h-11 items-center border border-rule px-3 text-sm text-muted hover:border-accent/40 hover:text-accent"
              >
                {link.label[locale]}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">{t(dict, "glossary.related")}</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((relatedEntry) => {
              const relatedText = glossaryText(relatedEntry, locale);
              return (
                <Link
                  key={relatedEntry.slug}
                  href={hrefFor(locale, `/glossary/${relatedEntry.slug}`)}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-sm text-muted hover:border-accent/40 hover:text-accent"
                >
                  {relatedText.term}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <nav
        aria-label={t(dict, "glossary.title")}
        className="rule-strong mt-6 flex flex-wrap items-center justify-between gap-3 pt-2"
      >
        {previous ? (
          <Link
            href={hrefFor(locale, `/glossary/${previous.slug}`)}
            className="inline-flex min-h-11 min-w-0 items-center gap-2 text-sm text-muted hover:text-accent"
          >
            <span aria-hidden="true">←</span>
            <span className="min-w-0">
              <span className="label block text-muted">{t(dict, "glossary.previous")}</span>
              <span className="block truncate">{glossaryText(previous, locale).term}</span>
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={hrefFor(locale, `/glossary/${next.slug}`)}
            className="ml-auto inline-flex min-h-11 min-w-0 items-center gap-2 text-right text-sm text-muted hover:text-accent"
          >
            <span className="min-w-0">
              <span className="label block text-muted">{t(dict, "glossary.next")}</span>
              <span className="block truncate">{glossaryText(next, locale).term}</span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </nav>
    </>
  );
}
