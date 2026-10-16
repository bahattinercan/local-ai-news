import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Clock, ExternalLink } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { relativeTime, formatNumber } from "@/lib/format";
import { categoryLabel } from "@/lib/classify/rules";
import { newsText } from "@/lib/news-text";
import { Chip } from "./ui/Chip";
import type { SnapshotNews } from "@/lib/store";

const KIND_TONE: Record<string, "accent" | "ok" | "warn" | "danger"> = {
  paper: "accent",
  release: "ok",
  announcement: "warn",
  runtime: "warn",
  community: "accent"
};

/**
 * A news row a reader can scan.
 *
 * The stored text is somebody else's release note: measured on the served
 * snapshot, every `runtime` item was titled with a build tag (`b11699`) and
 * carried a 1 464-character body, so the page printed a wall of unformatted
 * prose with URLs cut mid-string. `newsText()` derives the headline from the
 * subject inside the body, drops the URLs, collapses the duplicated subject and
 * clamps the body to three lines. The media slot only exists when the item has a
 * thumbnail — it is a placeholder for every `runtime`/`release` row, so an empty
 * box was the common case, not the exception.
 */
export function NewsCard({ item, locale }: { item: SnapshotNews; locale: Locale }) {
  const dict = dictionary(locale);
  const { title, body, buildTag } = newsText(item);

  return (
    <article className="flex gap-3">
      {item.thumbnail ? (
        <Image
          src={item.thumbnail}
          alt=""
          width={120}
          height={120}
          className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <Chip label={t(dict, `news.${item.kind}`)} tone={KIND_TONE[item.kind] ?? "accent"} />
          {item.categoryKey ? <span className="text-muted">{categoryLabel(item.categoryKey)}</span> : null}
          <span className="flex items-center gap-1 font-mono text-muted">
            <Clock size={11} aria-hidden="true" /> {relativeTime(item.publishedAt)}
          </span>
          {item.upvotes ? (
            <span className="flex items-center gap-1 font-mono text-muted">
              <ArrowUp size={11} aria-hidden="true" /> {formatNumber(item.upvotes)}
            </span>
          ) : null}
          {item.organization ? <span className="text-muted">{item.organization}</span> : null}
        </div>

        <h2 className="mt-1.5 font-medium leading-snug text-balance">
          <Link href={hrefFor(locale, `/n/${encodeURIComponent(item.externalId)}`)} className="hover:text-accent">
            {title || t(dict, "news.untitled")}
          </Link>
        </h2>

        {buildTag ? <p className="mt-0.5 font-mono text-xs text-muted">{buildTag}</p> : null}

        {body ? <p className="mt-1 line-clamp-3 text-sm text-muted">{body}</p> : null}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {item.modelSlug ? (
            <Link href={hrefFor(locale, `/m/${item.modelSlug}`)} className="text-accent hover:text-text">
              {t(dict, "common.viewModel")}
            </Link>
          ) : null}
          <a
            href={item.url}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="inline-flex min-h-7 items-center gap-1 text-muted hover:text-text"
          >
            <ExternalLink size={11} aria-hidden="true" />
            {t(dict, "news.source")}
          </a>
        </div>
      </div>
    </article>
  );
}
