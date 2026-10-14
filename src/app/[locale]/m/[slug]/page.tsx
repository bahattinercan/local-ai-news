import { getModel, getFeed } from "@/lib/store";
import { runCommand } from "@/lib/runner/command";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, daysSince } from "@/lib/format";
import { formatParams } from "@/lib/runner/vram";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { EmptyState, DataNotice } from "@/components/EmptyState";
import { JsonLd } from "@/components/JsonLd";
import { FeedCard } from "@/components/FeedCard";

export default async function ModelPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = pickLocale(rawLocale);
  const dict = dictionary(locale);
  const model = await getModel(slug);

  if (!model) {
    return (
      <>
        <DataNotice locale={locale} />
        <EmptyState locale={locale} message={t(dict, "empty.noModels")} />
      </>
    );
  }

  const related = await getFeed({
    category: model.primaryCategory,
    windowDays: 30,
    sort: "trending",
    gate: "passed",
    excludeGated: true,
    limit: 6,
    page: 1
  });

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: model.name,
          creator: model.author,
          url: model.url,
          datePublished: model.createdAt,
          image: model.sampleImages[0],
          description: `${categoryLabel(model.primaryCategory, locale)} · ${model.libraryName ?? "unknown library"}`
        }}
      />

      <DataNotice locale={locale} />

      <h1 className="text-2xl font-semibold">{model.externalId}</h1>
      <p className="mt-1 text-sm text-muted">
        {categoryLabel(model.primaryCategory, locale)} · {model.libraryName ?? "—"} ·{" "}
        {formatParams(model.paramsTotal)} {t(dict, "card.params")} · {t(dict, "card.new")} ({daysSince(model.firstSeenAt)}d)
      </p>

      {model.sampleImages[0] ? (
        <img src={model.sampleImages[0]} alt={model.name} className="mt-4 max-h-64 rounded" />
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-muted">{t(dict, "detail.gateReason")}</dt>
          <dd>{model.gateReason}</dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "card.runners")}</dt>
          <dd>{model.runners.join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "detail.quantizations")}</dt>
          <dd>{model.quantizations.join(" · ") || "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "card.vram")}</dt>
          <dd>{model.vramEstGb ? `~${model.vramEstGb} GB` : "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "detail.popularity")}</dt>
          <dd>
            ♥ {formatNumber(model.likes)} · ⬇ {formatNumber(model.downloads)}
          </dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "card.license")}</dt>
          <dd>{model.licenseName ?? model.license ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted">{t(dict, "detail.spaces")}</dt>
          <dd>{model.spaces.length ? model.spaces.slice(0, 5).join(", ") : "—"}</dd>
        </div>
      </dl>

      <h2 className="mt-6 text-lg font-semibold">{t(dict, "detail.runCommand")}</h2>
      <pre className="mt-2 rounded border border-border bg-surface p-3 font-mono text-sm whitespace-pre-wrap break-words">
        {runCommand(model)}
      </pre>

      <p className="mt-3">
        <a href={model.url} className="text-accent">
          {model.externalId}
        </a>
      </p>

      <h2 className="mt-6 text-lg font-semibold">{t(dict, "detail.related")}</h2>
      <div className="mt-3 grid gap-3">
        {related.filter((row) => row.externalId !== model.externalId).slice(0, 5).map((row) => (
          <FeedCard key={row.externalId} model={row} locale={locale} />
        ))}
      </div>

      <p className="mt-6 text-sm">
        <a href={hrefFor(locale, `/c/${model.primaryCategory}`)} className="text-muted">
          {t(dict, "common.home")}
        </a>
      </p>
    </>
  );
}
