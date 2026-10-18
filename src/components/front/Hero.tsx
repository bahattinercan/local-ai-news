import Link from "next/link";
import { Clock } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { relativeTime } from "@/lib/format";
import { newsText, subjectOf } from "@/lib/news-text";
import { PlateImage } from "../ui/PlateImage";
import type { SnapshotNews } from "@/lib/store";

/**
 * The lead story (docs/en/DESIGN-V3.md §1 zone 6, centre).
 *
 * Anatomy taken from the reference: plate above, kicker, two-line headline, deck,
 * byline with a rule. Two decisions are data-driven rather than aesthetic:
 *
 *  - the hero is chosen upstream as the newest paper *that has a thumbnail*, so
 *    the largest slot on the page is never a placeholder (151 of 185 items carry
 *    one; 34 do not, and those still render the generated plate);
 *  - the headline is the paper's own title (p50 70, max 124 characters, measured)
 *    clamped to two lines, and the deck is the first sentence of the abstract
 *    rather than the abstract — summaries average 1 484 characters, which is a
 *    wall of text, not a standfirst.
 */
export function Hero({ item, locale, total }: { item: SnapshotNews; locale: Locale; total: number }) {
  const dict = dictionary(locale);
  const { title, buildTag, body } = newsText(item, { bodyMax: 600 });
  const deck = buildTag ? subjectOf(body, 240) : subjectOf(body, 260);

  return (
    <article>
      <Link href={hrefFor(locale, `/n/${encodeURIComponent(item.externalId)}`)} tabIndex={-1}>
        <div className="halftone-screen relative">
          <PlateImage
            src={item.thumbnail}
            alt={title || item.title}
            slug={item.externalId}
            name={title || item.title}
            width={720}
            height={396}
            sizes="(min-width: 1024px) 620px, 100vw"
            priority
            className="aspect-[16/9] w-full border border-rule"
          />
          {/* The reference's one ornament, pinned to the plate's corner as an
              opaque pasted square: with a transparent background it read as a
              clipped artefact and let the photograph show through the dots. */}
          <span
            aria-hidden="true"
            className="absolute -right-3 -top-3 z-10 hidden h-14 w-14 border border-rule bg-bg plate-dots lg:block"
          />
        </div>
      </Link>

      <p className="label mt-3 text-accent">
        {t(dict, "front.lead")}
        {item.categoryKey ? ` · ${item.categoryKey}` : ""}
      </p>

      <h2 className="mt-1.5">
        <Link
          href={hrefFor(locale, `/n/${encodeURIComponent(item.externalId)}`)}
          className="headline line-clamp-2 min-h-6 text-2xl hover:underline sm:text-3xl lg:text-hero"
        >
          {title || t(dict, "news.untitled")}
        </Link>
      </h2>

      {deck ? <p className="deck mt-2 line-clamp-3 max-w-[62ch]">{deck}</p> : null}

      <p className="byline mt-3 flex flex-wrap items-center gap-x-3 border-t border-rule pt-2">
        {item.organization ? <span className="normal-case tracking-normal text-text">{item.organization}</span> : null}
        <span className="flex items-center gap-1">
          <Clock size={11} aria-hidden="true" /> {relativeTime(item.publishedAt)}
        </span>
        <Link
          href={hrefFor(locale, "/research")}
          className="arrow-link ml-auto text-accent"
        >
          {t(dict, "front.papersNote")} <span className="font-mono">{total}</span>
        </Link>
      </p>
    </article>
  );
}
