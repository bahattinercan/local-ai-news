import { ImageResponse } from "next/og";
import { pickLocale } from "@/i18n";
import { OG_CONTENT_TYPE, OG_SIZE, OgCardView, loadOgFonts, ogGlossaryCardBySlug } from "@/lib/og";

/**
 * Glossary OG card (docs/en/SEO-PLAN.md §4.4): the term, its one-line summary
 * and the desk it belongs to. The glossary is a compiled-in object, so no
 * snapshot read is needed; an unknown term prints the generic card.
 */
export const alt = "OpenWeight Radar glossary - a term, its one-line definition and its category";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const runtime = "nodejs";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);

  const card = ogGlossaryCardBySlug(slug, locale);

  return new ImageResponse(<OgCardView card={card} />, {
    ...size,
    fonts: await loadOgFonts()
  });
}
