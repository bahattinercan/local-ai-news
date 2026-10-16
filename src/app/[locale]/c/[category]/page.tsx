import { FeedView } from "@/components/FeedView";
import { TabBar } from "@/components/TabBar";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { categoryLabel } from "@/lib/classify/rules";
import { pickLocale } from "@/i18n";

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
  const raw = await searchParams;
  const query = { ...parseFeedQuery(raw), category };

  return (
    <>
      <TabBar locale={locale} active={category} filters={feedFiltersOf(query)} />
      <h1 className="mb-3 text-xl font-semibold">{categoryLabel(category)}</h1>
      <FeedView locale={locale} category={category} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
