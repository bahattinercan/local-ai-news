import { ArrowUp, Clock, ExternalLink } from "lucide-react";
import { getNewsItemByParam, getModel } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { TabBar } from "@/components/TabBar";
import { FeedCard } from "@/components/FeedCard";

const KIND_CLASS: Record<string, string> = {
  paper: "text-accent",
  release: "text-ok",
  announcement: "text-warn",
  runtime: "text-danger",
  community: "text-warn"
};

/**
 * News detail. Decision D1 of docs/en/NEWS-PLAN.md: this page shows the stored
 * summary (median 1526 chars, so it is worth its own page) and links out to the
 * source. The body is never republished — attribution plus a link only.
 */
export default async function NewsItemPage({
  params
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale = pickLocale(rawLocale);
  const dict = dictionary(locale);
  const item = await getNewsItemByParam(id);

  if (!item) {
    return (
      <>
        <TabBar locale={locale} />
        <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
      </>
    );
  }

  // Gate G3: the related-model block appears only when the link resolved.
  const model = item.modelSlug ? await getModel(item.modelSlug) : null;

  return (
    <>
      <TabBar locale={locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: item.title,
          datePublished: item.publishedAt,
          url: item.url,
          publisher: item.organization ? { "@type": "Organization", name: item.organization } : undefined,
          articleSection: item.categoryKey ? categoryLabel(item.categoryKey) : undefined
        }}
      />

      <p className="mb-3 text-sm">
        <a href={hrefFor(locale, "/news")} className="text-muted hover:text-text">
          ← {t(dict, "news.title")}
        </a>
      </p>

      <article className="card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={KIND_CLASS[item.kind] ?? "text-accent"}>{t(dict, `news.${item.kind}`)}</span>
          {item.categoryKey ? <span className="text-muted">{categoryLabel(item.categoryKey)}</span> : null}
          <span className="flex items-center gap-1 font-mono text-muted">
            <Clock size={11} aria-hidden="true" /> {relativeTime(item.publishedAt)}
          </span>
          <span className="flex items-center gap-1 font-mono text-muted">
            <ArrowUp size={11} aria-hidden="true" /> {formatNumber(item.upvotes ?? 0)}
          </span>
          {item.organization ? <span className="text-muted">{item.organization}</span> : null}
        </div>

        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight break-words">{item.title}</h1>

        {item.summary ? (
          <p className="mt-4 text-sm leading-relaxed text-muted whitespace-pre-line break-words">{item.summary}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={item.url}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-accent"
          >
            <ExternalLink size={13} aria-hidden="true" />
            {t(dict, "news.source")}
          </a>
          <span className="font-mono text-xs text-muted break-all">{item.url}</span>
        </div>
      </article>

      {model ? (
        <section className="mt-4">
          <h2 className="mb-3 text-lg font-semibold">{t(dict, "detail.related")}</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <FeedCard model={model} locale={locale} />
          </div>
        </section>
      ) : null}
    </>
  );
}
