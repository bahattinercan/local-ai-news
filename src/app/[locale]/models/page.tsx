import { FeedView } from "@/components/FeedView";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { dictionary, pickLocale, t } from "@/i18n";

/**
 * The index (`/models`), which is the page the site used to serve at `/`.
 *
 * Nothing about it changed in the move: same pulse summary, same filter bar, same
 * grid, same pagination, same query parameters. The front page is now a *separate*
 * page, and `middleware.ts` 308s the old `/?window=…` style URLs here, so no
 * bookmark or inbound link is broken by the split
 * (docs/en/DESIGN-V3.md §3 D3, §7.1).
 */
function normalizeRaw(raw: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])
  );
}

export default async function ModelsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const raw = await searchParams;
  const query = parseFeedQuery(raw);

  return (
    <>
      <DeskNav locale={locale} filters={feedFiltersOf(query)} />
      <PageHeader title={t(dict, "nav.models")} lede={t(dict, "models.lede")} />
      <FeedView locale={locale} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
