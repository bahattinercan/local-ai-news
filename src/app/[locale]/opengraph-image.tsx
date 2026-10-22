import { ImageResponse } from "next/og";
import { pickLocale } from "@/i18n";
import { loadSnapshot } from "@/lib/store";
import { OG_CONTENT_TYPE, OG_SIZE, OgCardView, loadOgFonts, ogSiteCard } from "@/lib/og";

/**
 * Site-wide OG card (docs/en/SEO-PLAN.md §4.4): nameplate, tagline, the edition
 * the numbers come from and the two counts the masthead prints.
 *
 * This is the segment-level default, so every page under `/[locale]` that does
 * not carry a closer `opengraph-image` inherits it - the layout sets the OG and
 * Twitter *tags* (`src/app/[locale]/layout.tsx`), this file supplies the
 * picture they point at.
 */
export const alt = "OpenWeight Radar - open-weight models you can run locally, with the edition and model counts";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* `readFile` needs a filesystem, and the counts come from the cached snapshot. */
export const runtime = "nodejs";
/* Deterministic from the snapshot, which the ingest refreshes every 10 minutes. */
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = pickLocale(rawLocale);

  const snapshot = await loadSnapshot();
  const tracked = snapshot?.models.length ?? 0;
  const passed = snapshot?.models.filter((model) => model.qualityPassed).length ?? 0;
  const card = ogSiteCard({ generatedAt: snapshot?.generatedAt ?? null, tracked, passed, locale });

  return new ImageResponse(<OgCardView card={card} />, {
    ...size,
    fonts: await loadOgFonts()
  });
}
