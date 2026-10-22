import { ImageResponse } from "next/og";
import { pickLocale } from "@/i18n";
import { getModel } from "@/lib/store";
import { OG_CONTENT_TYPE, OG_SIZE, OgCardView, loadOgFonts, ogModelCard } from "@/lib/og";

/**
 * Model OG card (docs/en/SEO-PLAN.md §4.4): repo name, author, category and up
 * to three facts the snapshot actually reports — params, licence, VRAM estimate
 * (quantizations fill a gap). An unknown slug prints the generic nameplate card
 * instead of throwing: the file convention can be requested directly, so a 500
 * here would be a 500 for a shareable image URL.
 */
export const alt = "OpenWeight Radar — a model's name, category and the specs it reports: params, licence and VRAM";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export const runtime = "nodejs";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);

  const model = await getModel(slug);
  const card = ogModelCard(model, locale);

  return new ImageResponse(<OgCardView card={card} />, {
    ...size,
    fonts: await loadOgFonts()
  });
}
