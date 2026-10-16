import { FeedView } from "@/components/FeedView";
import { TabBar } from "@/components/TabBar";
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
      <TabBar locale={locale} active={category} filters={feedFiltersOf(query)} />
      {/* Same shape as the feed page: a descriptive h1 plus a one-line statement,
          so the route explains itself on a phone where the header cannot. */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{categoryLabel(category)}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t(dict, "feed.lede")}</p>
      </div>
      <FeedView locale={locale} category={category} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
