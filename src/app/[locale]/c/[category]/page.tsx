import { FeedView } from "@/components/FeedView";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { categoryLabel } from "@/lib/classify/rules";
import { dictionary, pickLocale, t } from "@/i18n";

function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
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
