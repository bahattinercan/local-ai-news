import Link from "next/link";
import { ArrowUp, Clock, ExternalLink } from "lucide-react";
import { getNewsItemByParam, getModel } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { newsText } from "@/lib/news-text";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { EmptyState } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { TabBar } from "@/components/TabBar";
import { FeedCard } from "@/components/FeedCard";
import { Chip } from "@/components/ui/Chip";

const KIND_TONE: Record<string, "accent" | "ok" | "warn" | "danger"> = {
  paper: "accent",
  release: "ok",
  announcement: "warn",
  runtime: "warn",
  community: "accent"
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
  /* The same cleanup as the list: the stored title is a build tag for every
     runtime item, and the body carries URLs and a doubled subject. The detail
     page gets the longer budget (the list clamps to three lines). */
  const { title, body, buildTag } = newsText(item, { bodyMax: 4000 });

  return (
    <>
      <TabBar locale={locale} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: title || item.title,
          datePublished: item.publishedAt,
          url: item.url,
          publisher: item.organization ? { "@type": "Organization", name: item.organization } : undefined,
          articleSection: item.categoryKey ? categoryLabel(item.categoryKey) : undefined
        }}
      />

      <p className="mb-3 text-sm">
        <Link href={hrefFor(locale, "/news")} className="text-muted hover:text-text">
          ← {t(dict, "news.title")}
        </Link>
      </p>

      <article className="card p-5">
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

        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight break-words">
          {title || t(dict, "news.untitled")}
        </h1>

        {/* The build tag stays as a secondary label, because it is the item's own
            identity even when it cannot serve as a headline. */}
        {buildTag ? <p className="mt-1 font-mono text-xs text-muted">{buildTag}</p> : null}

        {body ? <p className="mt-4 text-sm leading-relaxed text-muted break-words">{body}</p> : null}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <a
            href={item.url}
            rel="noopener noreferrer nofollow"
            target="_blank"
            className="flex h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm text-accent"
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
