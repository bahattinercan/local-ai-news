import Image from "next/image";
import { ArrowUp, Clock } from "lucide-react";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { relativeTime, formatNumber } from "@/lib/format";
import { categoryLabel } from "@/lib/classify/rules";
import type { SnapshotNews } from "@/lib/store";

const KIND_TONE: Record<string, "accent" | "ok" | "warn"> = {
  paper: "accent",
  release: "ok",
  announcement: "warn"
};

export function NewsCard({ item, locale }: { item: SnapshotNews; locale: Locale }) {
  const dict = dictionary(locale);

  return (
    <article className="flex gap-3">
      {item.thumbnail ? (
        <Image
          src={item.thumbnail}
          alt={item.title}
          width={120}
          height={120}
          className="h-16 w-16 rounded-md border border-border object-cover"
        />
      ) : (
        <div className="h-16 w-16 rounded-md border border-dashed border-border bg-raised grid place-items-center font-mono text-xs text-muted" aria-hidden="true">
          {item.kind.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className={
              { accent: "text-accent", ok: "text-ok", warn: "text-warn" }[KIND_TONE[item.kind] ?? "accent"]
            }
          >
            {t(dict, `news.${item.kind}`)}
          </span>
          {item.categoryKey ? <span className="text-muted">{categoryLabel(item.categoryKey, locale)}</span> : null}
          <span className="flex items-center gap-1 text-muted font-mono">
            <Clock size={11} aria-hidden="true" /> {relativeTime(item.publishedAt)}
          </span>
          <span className="flex items-center gap-1 text-muted font-mono">
            <ArrowUp size={11} aria-hidden="true" /> {formatNumber(item.upvotes ?? 0)}
          </span>
          {item.organization ? <span className="text-muted">{String(item.organization)}</span> : null}
        </div>

        <h2 className="mt-1.5 font-medium leading-snug">
          <a href={item.url} className="hover:text-accent">
            {item.title}
          </a>
        </h2>

        {item.summary ? (
          <p className="mt-1 text-sm text-muted">
            {item.summary.length > 280 ? `${item.summary.slice(0, 280).trimEnd()}…` : item.summary}
          </p>
        ) : null}

        {item.modelSlug ? (
          <p className="mt-2 text-sm">
            <a href={hrefFor(locale, `/m/${item.modelSlug}`)} className="text-accent hover:text-text">
              {t(dict, "common.viewModel")}
            </a>
          </p>
        ) : null}
      </div>
    </article>
  );
}
