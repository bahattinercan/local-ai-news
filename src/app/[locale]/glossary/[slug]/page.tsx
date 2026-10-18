import Link from "next/link";
import { notFound } from "next/navigation";
import { GLOSSARY, GLOSSARY_CATEGORIES, getGlossaryEntry, glossaryText } from "@/lib/glossary";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { DeskNav } from "@/components/shell/DeskNav";

/** Derived, never hand-listed: a new entry is prerendered automatically. */
export function generateStaticParams() {
  return GLOSSARY.map((entry) => ({ slug: entry.slug }));
}

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

  return (
    <>
      <DeskNav locale={locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTerm",
          name: text.term,
          description: text.summary,
          url: `${hrefFor(locale, `/glossary/${entry.slug}`)}`,
          inDefinedTermSet: `${hrefFor(locale, "/glossary")}`
        }}
      />

      <p className="mb-3 text-sm">
        <Link href={hrefFor(locale, "/glossary")} className="text-muted hover:text-text">
          ← {t(dict, "glossary.title")}
        </Link>
      </p>

      <article className="rule-strong pt-2">
        <span className="label text-accent">{GLOSSARY_CATEGORIES[entry.category][locale]}</span>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">{text.term}</h1>
        <p className="mt-2 text-sm text-accent">{text.summary}</p>

        <div className="mt-4 grid gap-3">
          {text.body.map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="text-sm leading-relaxed text-muted break-words">
              {paragraph}
            </p>
          ))}
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-4">
          <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">{t(dict, "glossary.related")}</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((relatedEntry) => {
              const relatedText = glossaryText(relatedEntry, locale);
              return (
                <Link
                  key={relatedEntry.slug}
                  href={hrefFor(locale, `/glossary/${relatedEntry.slug}`)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:text-accent hover:border-accent/40"
                >
                  {relatedText.term}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
