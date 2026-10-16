import { GLOSSARY, GLOSSARY_CATEGORIES, glossaryByCategory, glossaryText } from "@/lib/glossary";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { JsonLd } from "@/components/JsonLd";
import { TabBar } from "@/components/TabBar";

export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const groups = glossaryByCategory();

  return (
    <>
      <TabBar locale={locale} />
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

      <header className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">{t(dict, "glossary.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(dict, "glossary.subtitle")}</p>
      </header>

      <div className="grid gap-5">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="mb-2 text-xs uppercase tracking-wide text-muted">
              {GLOSSARY_CATEGORIES[group.category][locale]}
            </h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.entries.map((entry) => {
                const text = glossaryText(entry, locale);
                return (
                  <a
                    key={entry.slug}
                    href={hrefFor(locale, `/glossary/${entry.slug}`)}
                    className="card p-4 block hover:border-accent/40"
                  >
                    <span className="font-medium">{text.term}</span>
                    <p className="mt-1 text-sm text-muted">{text.summary}</p>
                    <span className="mt-2 block font-mono text-xs text-accent">
                      {text.body.length} §
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
