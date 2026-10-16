import { FeedView } from "@/components/FeedView";
import { TabBar } from "@/components/TabBar";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { dictionary, pickLocale, t } from "@/i18n";

function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]));
}

export default async function FeedPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const raw = await searchParams;
  const query = parseFeedQuery(raw);
  const dict = dictionary(locale);

  return (
    <>
      <TabBar locale={locale} filters={feedFiltersOf(query)} />
      {/* The page used to open on `h1 "All"` — a heading that describes the tab,
          not the site, and the only sentence explaining the product lived in the
          header tagline, hidden below 768 px. */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{t(dict, "feed.title")}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">{t(dict, "feed.lede")}</p>
      </div>
      <FeedView locale={locale} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
