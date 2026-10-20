import type { Metadata } from "next";
import { FeedView } from "@/components/FeedView";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { feedFiltersOf, parseFeedQuery } from "@/lib/query";
import { getPulse } from "@/lib/store";
import { dictionary, pickLocale, t } from "@/i18n";
import { SITE_NAME, canonicalUrl, descriptionCount, listMetadata } from "@/lib/seo";

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

export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = pickLocale((await params).locale);
  const raw = await searchParams;
  const pulse = await getPulse(7);
  const title = locale === "tr" ? "Tüm açık ağırlıklı modeller" : "All open-weight models";
  const description =
    locale === "tr"
      ? `Son 7 günde izlenen ${descriptionCount(pulse?.tracked, locale)} modeli keşfet: ${descriptionCount(pulse?.passed, locale)} tanesi kalite kapısını geçiyor. Pencere, runner, parametre, lisans ve arama ile dokuz kategoriyi filtrele.`
      : `Browse ${descriptionCount(pulse?.tracked, locale)} models tracked in the last 7 days: ${descriptionCount(pulse?.passed, locale)} pass the quality gate. Filter by window, runner, params, license and search across nine categories.`;
  const canonical = canonicalUrl(locale, "/models");
  const meta = listMetadata(locale, { path: "/models", raw });

  return {
    title,
    description,
    alternates: meta.alternates,
    robots: meta.robots,
    openGraph: { type: "website", url: canonical, title: `${title} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
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
      {/* The index is the All desk's unfiltered target; the link itself points at
          `/`, which 308s here as soon as there is a filter to carry. */}
      <DeskNav locale={locale} active="" exact={false} filters={feedFiltersOf(query)} />
      <PageHeader title={t(dict, "nav.models")} lede={t(dict, "models.lede")} />
      <FeedView locale={locale} query={query} raw={normalizeRaw(raw)} />
    </>
  );
}
