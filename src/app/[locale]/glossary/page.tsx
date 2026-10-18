import Link from "next/link";
import { GLOSSARY, GLOSSARY_CATEGORIES, glossaryByCategory, glossaryText } from "@/lib/glossary";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";

export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const groups = glossaryByCategory();

  return (
    <>
      <DeskNav locale={locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "DefinedTermSet",
          name: t(dict, "glossary.title"),
          hasDefinedTerm: GLOSSARY.map((entry) => ({
            "@type": "DefinedTerm",
            name: glossaryText(entry, locale).term,
            description: glossaryText(entry, locale).summary,
            url: `${hrefFor(locale, `/glossary/${entry.slug}`)}`,
            inDefinedTermSet: t(dict, "glossary.title")
          }))
        }}
      />

      <PageHeader title={t(dict, "glossary.title")} kicker={t(dict, "nav.glossary")} lede={t(dict, "glossary.subtitle")} />

      <div className="grid gap-5">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="section-title mb-2">
              {GLOSSARY_CATEGORIES[group.category][locale]}
            </h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {group.entries.map((entry) => {
                const text = glossaryText(entry, locale);
                return (
                  <Link
                    key={entry.slug}
                    href={hrefFor(locale, `/glossary/${entry.slug}`)}
                    className="card p-4 block hover:border-accent/40"
                  >
                    <span className="font-medium">{text.term}</span>
                    <p className="mt-1 text-sm text-muted">{text.summary}</p>
                    <span className="mt-2 block font-mono text-xs text-accent">
                      {text.body.length} §
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
