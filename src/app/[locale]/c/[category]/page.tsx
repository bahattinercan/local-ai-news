import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedView } from "@/components/FeedView";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { categoryLabel } from "@/lib/classify/rules";
import { countFeed } from "@/lib/store";
import { formatCount } from "@/lib/format";
import { dictionary, pickLocale, t } from "@/i18n";
import { SITE_NAME, canonicalUrl, categoryWord, descriptionCount, isDesk, listMetadata } from "@/lib/seo";

function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

/**
 * The three questions every desk answers (docs/en/SEO-PLAN.md §7.3).
 *
 * The copy lives in `src/i18n/dictionaries/*.json` under `category.<key>.faq.*`
 * so it stays translated and reviewable in a diff, and the figures it quotes
 * arrive through `{count}` / `{passed}` / `{days}` rather than as prose numbers:
 * an ingest that changes the list must not leave the sentence contradicting it.
 */
const FAQ_SLOTS = ["vram", "run", "pick"] as const;

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale: rawLocale, category } = await params;
  const locale = pickLocale(rawLocale);
  if (!isDesk(category)) notFound();

  const raw = await searchParams;
  const query = { ...parseFeedQuery(raw), category };
  const total = await countFeed(query);
  const word = categoryWord(category, locale);
  const title = locale === "tr" ? `Yeni ${word} modelleri` : `New ${word} models`;
  const description =
    locale === "tr"
      ? `Son ${query.windowDays} günde ilk kez görülen ${descriptionCount(total, locale)} ${word} modeli. Runner, parametre ve lisansa göre filtrele; indirme, beğeni veya tazeliğe göre sırala.`
      : `${descriptionCount(total, locale)} ${word} models first seen in the last ${query.windowDays} days. Filter by runner, params and license; sort by downloads, likes or recency.`;
  const canonical = canonicalUrl(locale, `/c/${category}`);
  const meta = listMetadata(locale, { path: `/c/${category}`, raw });

  return {
    title,
    description,
    alternates: meta.alternates,
    robots: meta.robots,
    openGraph: { type: "website", url: canonical, title: `${title} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
}

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; category: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale, category } = await params;
  const locale = pickLocale(rawLocale);
  if (!isDesk(category)) notFound();

  const dict = dictionary(locale);
  const raw = await searchParams;
  const query = { ...parseFeedQuery(raw), category };

  /* The intro describes the desk, not the reader's view of it, so its figures are
     counted without the runner/licence/search filters: a sentence that says "N
     repositories were first seen in this window" has to stay true after a filter
     is applied. Both counts read the same cached snapshot the feed reads. */
  const deskScope = {
    ...query,
    runner: undefined,
    maxParams: undefined,
    license: undefined,
    q: undefined,
    limit: 0,
    page: 1
  };
  const tracked = await countFeed({ ...deskScope, gate: "all" });
  const passed = await countFeed({ ...deskScope, gate: "passed" });
  const figures = { count: formatCount(tracked, locale), passed: formatCount(passed, locale), days: query.windowDays };
  const copy = (key: string) => t(dict, `category.${category}.${key}`, figures);
  const faq = FAQ_SLOTS.map((slot) => ({ question: copy(`faq.${slot}.q`), answer: copy(`faq.${slot}.a`) }));

  return (
    <>
      <DeskNav locale={locale} active={category} filters={feedFiltersOf(query)} />
      {/* Same shape as the index: a descriptive h1 plus a one-line statement, so
          the route explains itself on a phone where the masthead cannot. */}
      <PageHeader
        title={categoryLabel(category)}
        kicker={t(dict, "desk.title", { label: categoryLabel(category) })}
        lede={t(dict, "desk.lede", { label: categoryLabel(category).toLowerCase() })}
      />
      {/* 150–250 words of evergreen desk copy. A paragraph, not a panel: the
          broadsheet separates with rules and type, and the feed below keeps the
          first screen (DESIGN-V3 §1). */}
      <p className="mb-5 max-w-3xl text-sm leading-relaxed text-muted">{copy("intro")}</p>

      <FeedView locale={locale} category={category} query={query} raw={normalizeRaw(raw)} />

      {/* The FAQ sits below the list on purpose: it is the deepest content on the
          route, so it must not push the first model row below the fold on a
          laptop. Rendered as a definition list — a real question per heading —
          and it reuses `.section-title` rather than inventing a section style. */}
      <section className="mt-8" aria-labelledby="desk-faq">
        <h2 id="desk-faq" className="section-title">
          {t(dict, "category.faq.title")}
        </h2>
        <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-3">
          {faq.map((item) => (
            <div key={item.question} className="min-w-0">
              <dt className="text-sm font-semibold">{item.question}</dt>
              <dd className="mt-1 text-sm text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
