import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { relativeTime, formatNumber } from "@/lib/format";
import type { SnapshotNews } from "@/lib/store";

export function NewsCard({ item, locale }: { item: SnapshotNews; locale: Locale }) {
  const dict = dictionary(locale);

  return (
    <article className="border border-border rounded-lg bg-surface p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded px-2 py-0.5 text-accent">{t(dict, `news.${item.kind}`)}</span>
        <span className="text-muted">{t(dict, "news.updated", { when: relativeTime(item.publishedAt) })}</span>
        <span className="text-muted">▲ {formatNumber(item.upvotes ?? 0)}</span>
        {item.organization ? <span className="text-muted">{String(item.organization)}</span> : null}
      </div>

      <h2 className="mt-2 font-medium">
        <a href={item.url}>{item.title}</a>
      </h2>

      {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary.length > 280 ? `${item.summary.slice(0, 280).trimEnd()}…` : item.summary}</p> : null}

      {item.modelSlug ? (
        <p className="mt-2 text-sm">
          <a href={hrefFor(locale, `/m/${item.modelSlug}`)} className="text-accent">
            {t(dict, "common.viewModel")}
          </a>
        </p>
      ) : null}
    </article>
  );
}
