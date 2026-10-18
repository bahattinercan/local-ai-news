import Link from "next/link";
import { ArrowUp, Clock } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { formatNumber, relativeTime } from "@/lib/format";
import { categoryLabel } from "@/lib/classify/rules";
import { newsText, subjectOf } from "@/lib/news-text";
import { PlateImage } from "../ui/PlateImage";
import { PressPlate } from "../ui/PressPlate";
import type { SnapshotNews } from "@/lib/store";

const KIND_LABEL_KEY: Record<string, string> = {
  paper: "news.paper",
  release: "news.release",
  announcement: "news.announcement",
  runtime: "news.runtime",
  community: "news.community"
};

/**
 * A story in a column, a rail or the wire: one hairline rule, a kicker, a
 * headline, a byline (docs/en/DESIGN-V3.md §1 zone 6).
 *
 * The stored text is somebody else's release note or abstract, so the headline
 * and the deck both come from `newsText()` — the same cleanup the news list uses
 * (a `runtime` row's stored title is a build tag such as `b11699`, and 40 items
 * in the served snapshot carry `organization: "[object Object]"`, which the store
 * has already turned into `null` by the time it reaches here).
 *
 * Art direction is a prop rather than a rule inside the component, because the
 * right choice depends on size: a 1 200 × 648 page render is unreadable noise at
 * 64 px, so small square slots get the generated plate and only landscape slots
 * (rail teaser, hero) print the real thumbnail.
 */
export function StoryRow({
  item,
  locale,
  size = "row",
  art = "none"
}: {
  item: SnapshotNews;
  locale: Locale;
  /** `lead` is the larger rail treatment, `row` the compact one. */
  size?: "row" | "lead";
  art?: "none" | "plate" | "image";
}) {
  const dict = dictionary(locale);
  const { title, body, buildTag } = newsText(item, { bodyMax: 400 });
  const deck = subjectOf(body, size === "lead" ? 200 : 130);
  const kindLabel = t(dict, KIND_LABEL_KEY[item.kind] ?? "news.title");
  const large = size === "lead";
  const href = hrefFor(locale, `/n/${encodeURIComponent(item.externalId)}`);
  const headline = title || t(dict, "news.untitled");

  return (
    <article className="rule-bottom py-3 last:border-b-0">
      <div className="flex gap-3">
        {art === "image" ? (
          <Link href={href} tabIndex={-1} className="shrink-0">
            <PlateImage
              src={item.thumbnail}
              alt={headline}
              slug={item.externalId}
              name={headline}
              width={480}
              height={259}
              sizes="96px"
              className="h-16 w-24 border border-rule"
            />
          </Link>
        ) : null}

        {art === "plate" ? (
          <Link href={href} tabIndex={-1} className="shrink-0">
            <PressPlate slug={item.externalId} name={headline} className="h-16 w-16 border border-rule" />
          </Link>
        ) : null}

        <div className="min-w-0 flex-1">
          <p className="label flex flex-wrap items-center gap-x-2 text-accent">
            {kindLabel}
            {item.categoryKey ? <span className="text-muted">{categoryLabel(item.categoryKey)}</span> : null}
          </p>

          <h3 className={large ? "mt-1.5" : "mt-1"}>
            <Link href={href} className={`headline line-clamp-2 min-h-6 hover:underline ${large ? "text-xl" : "text-row"}`}>
              {headline}
            </Link>
          </h3>

          {deck ? <p className="mt-1 line-clamp-2 text-sm text-muted">{deck}</p> : null}

          <p className="byline mt-1.5 flex flex-wrap items-center gap-x-2">
            {item.organization ? (
              <>
                <span className="uppercase tracking-[0.1em] text-text/75">{item.organization}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span className="flex items-center gap-1">
              <Clock size={10} aria-hidden="true" /> {relativeTime(item.publishedAt)}
            </span>
            {item.upvotes ? (
              <span className="flex items-center gap-1">
                <ArrowUp size={10} aria-hidden="true" /> {formatNumber(item.upvotes)}
              </span>
            ) : null}
            {buildTag ? <span className="font-mono">{buildTag}</span> : null}
          </p>
        </div>
      </div>
    </article>
  );
}
