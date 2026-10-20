import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FeedView } from "@/components/FeedView";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { categoryLabel } from "@/lib/classify/rules";
import { countFeed } from "@/lib/store";
import { dictionary, pickLocale, t } from "@/i18n";
import { SITE_NAME, canonicalUrl, categoryWord, descriptionCount, isDesk, listMetadata } from "@/lib/seo";

function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

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
      <FeedView locale={locale} category={category} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
