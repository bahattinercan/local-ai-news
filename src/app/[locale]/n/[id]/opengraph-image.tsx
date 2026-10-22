import { ImageResponse } from "next/og";
import { pickLocale } from "@/i18n";
import { getNewsItemByParam } from "@/lib/store";
import { OG_CONTENT_TYPE, OG_SIZE, OgCardView, loadOgFonts, ogNewsCard } from "@/lib/og";

/**
 * News OG card (docs/en/SEO-PLAN.md §4.4): the cleaned headline, the source and
 * the date. The headline goes through `newsText`, the same cleaner the page and
 * `generateMetadata` use, so the card cannot print the raw commit subject or a
 * URL the page strips.
 *
 * `params.id` arrives percent-encoded (`reddit_localllama%3At3_…`), which is why
 * the lookup is `getNewsItemByParam` rather than `getNewsItem`. An unknown id
 * prints the generic card; it does not throw.
 */
export const alt = "OpenWeight Radar - a news headline with its source, kind and publication date";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const runtime = "nodejs";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = pickLocale(rawLocale);

  const item = await getNewsItemByParam(id);
  const card = ogNewsCard(item, locale);

  return new ImageResponse(<OgCardView card={card} />, {
    ...size,
    fonts: await loadOgFonts()
  });
}
