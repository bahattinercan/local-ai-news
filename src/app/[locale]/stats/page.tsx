import type { Metadata } from "next";
import Link from "next/link";
import { getStatsBoard } from "@/lib/store";
import { GATE_THRESHOLDS } from "@/lib/classify/gate";
import { categoryLabel } from "@/lib/classify/rules";
import { DataNotice, EmptyState } from "@/components/EmptyState";
import { DeskNav } from "@/components/shell/DeskNav";
import { PageHeader } from "@/components/shell/PageHeader";
import { dictionary, hrefFor, pickLocale, t } from "@/i18n";
import { DONUT_PALETTE, Donut, FOLDED_COLOR, RateBar } from "@/components/ui/Charts";
import { DailyBars, shortDay, type DailyPoint } from "@/components/ui/DailyBars";
import { Field, SubmitButton } from "@/components/ui/Controls";
import { Stat } from "@/components/ui/Stat";
import { Term } from "@/components/ui/Term";
import { FEED_DEFAULTS, parseStatsQuery } from "@/lib/query";
import { FOLDED_CATEGORY, foldSlices } from "@/lib/stats";
import { formatClock, formatCount, formatEditionDate, formatPercent } from "@/lib/format";
import { SITE_NAME, canonicalUrl, descriptionCount, listMetadata } from "@/lib/seo";

/**
 * The Data Desk (docs/en/STATS-PLAN.md).
 *
 * Three things changed against the old page, and each of them is a measured
 * correction rather than a taste call:
 *
 *  1. **Two named time axes.** Every panel says whether it counts rows `tracked`
 *     by Radar (`firstSeenAt`, the feed's axis) or repos `created` on Hugging
 *     Face (`createdAt`). The old page mixed them into one word, "volume", and
 *     its only daily axis spanned three days of ingest runs.
 *  2. **Every number is a link** to the feed it describes, and the desk strip is
 *     handed the page's own filters so the same screen cannot print 1 538 and
 *     606 for the same thing.
 *  3. **The gate explains itself.** Its panel is gate-independent on purpose, so
 *     what the filter hides is visible in both of the filter's states.
 */
export async function generateMetadata({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const locale = pickLocale((await params).locale);
  const raw = await searchParams;
  const query = parseStatsQuery(raw);
  const board = await getStatsBoard(query.windowDays, { gate: query.gate });
  const { totals } = board;
  const title = locale === "tr" ? "Açık ağırlıklı model istatistikleri" : "Open-weight model statistics";
  const description =
    locale === "tr"
      ? `${descriptionCount(totals.tracked, locale)} model izleniyor, ${descriptionCount(totals.passed, locale)} tanesi kalite kapısını geçiyor, medyan ${descriptionCount(totals.medianDownloads, locale)} indirme. Kategori payı, runner kapsamı ve günlük tempo.`
      : `${descriptionCount(totals.tracked, locale)} models tracked, ${descriptionCount(totals.passed, locale)} pass the gate, ${descriptionCount(totals.medianDownloads, locale)} median downloads. Category share, runner coverage and daily cadence.`;
  const canonical = canonicalUrl(locale, "/stats");
  const meta = listMetadata(locale, {
    path: "/stats",
    raw,
    filterKeys: ["window", "days", "gate"],
    pageIsIndexable: false
  });

  return {
    title,
    description,
    alternates: meta.alternates,
    robots: meta.robots,
    openGraph: { type: "website", url: canonical, title: `${title} · ${SITE_NAME}`, description },
    twitter: { card: "summary" }
  };
}

export default async function StatsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const query = parseStatsQuery(await searchParams);
  const board = await getStatsBoard(query.windowDays, { gate: query.gate });

  if (!board.generatedAt) {
    return (
      <>
        <DeskNav locale={locale} section="stats" />
        <EmptyState locale={locale} message={t(dict, "empty.noModels")} hint={t(dict, "empty.hintFilters")} />
      </>
    );
  }

  const { totals } = board;
  const when = `${formatEditionDate(board.generatedAt, locale)} · ${formatClock(board.generatedAt)}`;
  const gateLabel = t(dict, query.gate === "all" ? "filters.showEverything" : "filters.passedOnly");
  const count = (value: number) => formatCount(value, locale);
  const percent = (value: number, digits = 0) => formatPercent(value, locale, digits);
  /* The "not passing" half of a stacked bar, in both daily charts and the gate bar. */
  const failedColor = "color-mix(in srgb, var(--rule-strong) 45%, transparent)";

  /* §2 and §3: the current view. A category with zero rows in view is dropped
     here and kept in §5, where the zero is the story. */
  const rowsInView = board.categories.filter((row) => row.count > 0);
  const folded = foldSlices(rowsInView, 6);
  const swatchOf = new Map<string, string>();
  folded.forEach((slice, index) => {
    swatchOf.set(slice.category, slice.category === FOLDED_CATEGORY ? FOLDED_COLOR : DONUT_PALETTE[index]);
  });
  const sliceLabel = (key: string) => (key === FOLDED_CATEGORY ? t(dict, "stats.other") : categoryLabel(key));

  const cadencePoints: DailyPoint[] = board.cadence.map((point) => ({
    date: point.date,
    total: point.created,
    parts: [
      { label: t(dict, "stats.passedCol"), value: point.passed, color: "var(--accent)" },
      {
        label: t(dict, "stats.gateFailed"),
        value: point.created - point.passed,
        color: failedColor
      }
    ]
  }));
  const createdInWindow = board.cadence.reduce((sum, point) => sum + point.created, 0);
  const passedInWindow = board.cadence.reduce((sum, point) => sum + point.passed, 0);

  const wirePoints: DailyPoint[] = board.wire.map((point) => ({
    date: point.date,
    total: point.total,
    parts: Object.entries(point.kinds)
      .sort((left, right) => right[1] - left[1])
      .map(([kind, value], index) => ({
        label: dict[`news.${kind}`] ?? kind,
        value,
        color: DONUT_PALETTE[index % DONUT_PALETTE.length]
      }))
  }));
  const wireTotal = board.wire.reduce((sum, point) => sum + point.total, 0);
  const wireKinds = new Map<string, number>();
  for (const point of board.wire) {
    for (const [kind, value] of Object.entries(point.kinds)) wireKinds.set(kind, (wireKinds.get(kind) ?? 0) + value);
  }
  const wireLegend = [...wireKinds.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([kind, value], index) => ({
      label: dict[`news.${kind}`] ?? kind,
      value,
      color: DONUT_PALETTE[index % DONUT_PALETTE.length]
    }));

  /* §5 is gate-independent: `tracked` and `passed` describe the window, not the
     filter, so the panel reads the same in both states of the control. */
  const gateRows = [...board.categories].filter((row) => row.tracked > 0).sort((left, right) => right.tracked - left.tracked);
  const reasons = board.gateReasons;
  const reasonTotal = Math.max(
    1,
    reasons.downloads + reasons.likes + reasons.org + reasons.samples + reasons.failed + reasons.gated
  );
  const reasonSegments: Array<{ key: string; label: string; value: number; color: string }> = [
    { key: "downloads", label: t(dict, "stats.gateDownloads"), value: reasons.downloads, color: "var(--accent)" },
    { key: "likes", label: t(dict, "stats.gateLikes"), value: reasons.likes, color: "var(--accent-2)" },
    ...(reasons.org + reasons.samples > 0
      ? [{ key: "org", label: t(dict, "stats.gateOrg"), value: reasons.org + reasons.samples, color: "var(--muted)" }]
      : []),
    {
      key: "failed",
      label: t(dict, "stats.gateFailed"),
      value: reasons.failed,
      color: "color-mix(in srgb, var(--rule-strong) 45%, transparent)"
    },
    { key: "gated", label: t(dict, "stats.gated"), value: reasons.gated, color: "var(--warn)" }
  ];

  const filters = { window: query.window, sort: FEED_DEFAULTS.sort, gate: query.gate } as const;
  const categoryHref = (key: string) =>
    hrefFor(locale, `/c/${key}?window=${query.window}&gate=${query.gate}`);

  return (
    <>
      <DeskNav locale={locale} section="stats" filters={filters} />
      <DataNotice locale={locale} />

      <PageHeader
        title={t(dict, "stats.title")}
        kicker={t(dict, "nav.stats")}
        lede={t(dict, "stats.lede")}
        aside={<span className="font-mono text-xs text-muted">{t(dict, "stats.dateline", { when })}</span>}
      />

      <form method="get" className="rule-strong rule-bottom mb-4 flex flex-wrap items-end gap-3 pb-3 text-sm">
        <Field
          name="window"
          label={t(dict, "filters.window")}
          value={query.window}
          options={[
            ["24h", "24h"],
            ["7d", "7d"],
            ["30d", "30d"],
            ["90d", "90d"]
          ]}
        />
        <Field
          name="gate"
          label={t(dict, "filters.gate")}
          termSlug="quality-gate"
          locale={locale}
          value={query.gate}
          options={[
            ["passed", t(dict, "filters.passedOnly")],
            ["all", t(dict, "filters.showEverything")]
          ]}
        />
        <SubmitButton label={t(dict, "filters.apply")} />
        {query.gateForced ? <p className="max-w-sm pb-1 text-xs text-warn">{t(dict, "stats.gateForced")}</p> : null}
      </form>

      {/* §1 — the four figures, each with the scope that produced it. */}
      <section className="rule-bottom mb-4 pb-3" aria-label={t(dict, "nav.stats")}>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
          <Stat
            label={t(dict, "stats.inView")}
            value={count(totals.inView)}
            tone="accent"
            size="lg"
            hint={t(dict, "stats.inViewHint", { window: query.window, gate: gateLabel })}
          />
          <Stat
            label={
              <Term slug="quality-gate" locale={locale}>
                {t(dict, "stats.passRate")}
              </Term>
            }
            value={percent(totals.passRate, 1)}
            tone="ok"
            hint={t(dict, "stats.passRateHint", { passed: count(totals.passed), tracked: count(totals.tracked) })}
          />
          <Stat
            label={t(dict, "stats.top")}
            value={totals.top ? categoryLabel(totals.top.category) : "—"}
            hint={totals.top ? `${count(totals.top.count)} · ${percent(totals.top.count / Math.max(1, totals.inView))}` : undefined}
          />
          <Stat
            label={
              <Term slug="runner" locale={locale}>
                {t(dict, "stats.withRunner")}
              </Term>
            }
            value={count(totals.withRunner)}
            hint={t(dict, "stats.withRunnerHint", {
              share: percent(totals.withRunner / Math.max(1, totals.inView))
            })}
          />
        </div>
      </section>

      <div className="stats-grid">
        <section className="rule-bottom pb-4">
          <h2 className="section-title mb-3">
            {t(dict, "stats.categories")}
            <span className="section-note">{count(totals.inView)}</span>
          </h2>

          {rowsInView.length === 0 ? (
            <p className="text-sm text-muted">{t(dict, "stats.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="pb-1 font-normal">
                    <span className="label text-muted">{t(dict, "filters.category")}</span>
                  </th>
                  <th scope="col" className="hidden w-24 pb-1 font-normal sm:table-cell">
                    <span className="sr-only">{t(dict, "stats.share")}</span>
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    <span className="label text-muted">{t(dict, "stats.inViewCol")}</span>
                  </th>
                  <th scope="col" className="hidden pb-1 text-right font-normal sm:table-cell">
                    <span className="label text-muted">{t(dict, "stats.median")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rowsInView.map((row) => (
                  <tr key={row.category} className="border-b border-rule/70 align-baseline">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: swatchOf.get(row.category) ?? FOLDED_COLOR }}
                          aria-hidden="true"
                        />
                        <Link href={categoryHref(row.category)} className="min-w-0 truncate hover:text-accent">
                          {categoryLabel(row.category)}
                        </Link>
                      </span>
                    </th>
                    <td className="hidden w-24 py-1.5 sm:table-cell" aria-hidden="true">
                      <span className="block h-1.5 w-full bg-raised">
                        <span
                          className="block h-full bg-accent"
                          style={{ width: `${Math.max(2, (row.count / Math.max(1, rowsInView[0].count)) * 100)}%` }}
                        />
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono">{count(row.count)}</td>
                    <td className="hidden py-1.5 text-right font-mono text-muted sm:table-cell">
                      {row.medianDownloads === null ? "—" : count(row.medianDownloads)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="mt-2 max-w-xl text-xs text-muted">{t(dict, "stats.categoriesNote")}</p>
        </section>

        <section className="rule-bottom pb-4">
          <h2 className="section-title mb-3">{t(dict, "stats.share")}</h2>
          <Donut
            label={t(dict, "stats.share")}
            mutedLabel={t(dict, "stats.empty")}
            swatches={folded.map((slice) => swatchOf.get(slice.category) ?? FOLDED_COLOR)}
            slices={folded.map((slice) => ({
              label: sliceLabel(slice.category),
              value: slice.count,
              members: slice.members?.map(categoryLabel)
            }))}
          />
          <p className="mt-2 text-xs text-muted">{t(dict, "stats.shareNote")}</p>
        </section>
      </div>

      {/* §4 — the only series with daily resolution today. */}
      <section className="rule-bottom mt-3 pb-4">
        <h2 className="section-title mb-1">
          {t(dict, "stats.trend")}
          <span className="section-note">{t(dict, "stats.cadenceTotal", { created: count(createdInWindow) })}</span>
        </h2>

        {createdInWindow === 0 ? (
          <p className="mt-2 text-sm text-muted">{t(dict, "stats.noHistory")}</p>
        ) : (
          <DailyBars
            points={cadencePoints}
            label={t(dict, "stats.trend")}
            summary={t(dict, "stats.cadenceTotal", { created: count(createdInWindow) })}
            locale={locale}
            caption={t(dict, "stats.cadenceNote")}
            legend={[
              { label: t(dict, "stats.passedCol"), value: passedInWindow, color: "var(--accent)" },
              { label: t(dict, "stats.gateFailed"), value: createdInWindow - passedInWindow, color: failedColor }
            ]}
            detailsLabel={t(dict, "stats.numbers")}
            columnLabel={t(dict, "stats.dateCol")}
          />
        )}
      </section>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* §5 — gate-independent by design: what the filter keeps, in both states. */}
        <section className="rule-bottom pb-4">
          <h2 className="section-title mb-3">{t(dict, "stats.gateTitle")}</h2>

          <div className="flex h-3 w-full overflow-hidden bg-raised" role="img" aria-label={t(dict, "stats.gateTitle")}>
            {reasonSegments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <span
                  key={segment.key}
                  style={{ width: `${(segment.value / reasonTotal) * 100}%`, background: segment.color }}
                  title={`${segment.label}: ${count(segment.value)}`}
                />
              ))}
          </div>

          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {reasonSegments
              .filter((segment) => segment.value > 0)
              .map((segment) => (
                <li key={segment.key} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm" style={{ background: segment.color }} aria-hidden="true" />
                  <span>{segment.label}</span>
                  <span className="font-mono text-text">{count(segment.value)}</span>
                </li>
              ))}
          </ul>

          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-rule text-left">
                <th scope="col" className="pb-1 font-normal">
                  <span className="label text-muted">{t(dict, "filters.category")}</span>
                </th>
                <th scope="col" className="pb-1 text-right font-normal">
                  <span className="label text-muted">{t(dict, "stats.trackedCol")}</span>
                </th>
                <th scope="col" className="pb-1 text-right font-normal">
                  <span className="label text-muted">{t(dict, "stats.passedCol")}</span>
                </th>
                <th scope="col" className="hidden w-20 pb-1 font-normal sm:table-cell">
                  <span className="sr-only">{t(dict, "stats.passRateCol")}</span>
                </th>
                <th scope="col" className="w-14 pb-1 text-right font-normal">
                  <span className="label whitespace-nowrap text-muted">{t(dict, "stats.passRateCol")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {gateRows.map((row) => (
                <tr key={row.category} className="border-b border-rule/70">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {categoryLabel(row.category)}
                  </th>
                  <td className="py-1.5 text-right font-mono">{count(row.tracked)}</td>
                  <td className="py-1.5 text-right font-mono text-muted">{count(row.passed)}</td>
                  <td className="hidden py-1.5 pl-3 sm:table-cell">
                    <RateBar
                      value={row.passRate}
                      label={`${categoryLabel(row.category)}: ${percent(row.passRate, 0)}`}
                    />
                  </td>
                  <td className="w-14 py-1.5 text-right font-mono text-xs text-muted">{percent(row.passRate, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 max-w-xl text-xs text-muted">
            {t(dict, "stats.gateNote", {
              downloads: GATE_THRESHOLDS.downloads,
              likes: GATE_THRESHOLDS.likes,
              rare: count(reasons.org + reasons.samples),
              gated: count(reasons.gated)
            })}
          </p>
        </section>

        {/* §6 — the one dimension that is 100 % present and answers "can I run it?". */}
        <section className="rule-bottom pb-4">
          <h2 className="section-title mb-3">{t(dict, "stats.runnersTitle")}</h2>

          {board.runners.length === 0 ? (
            <p className="text-sm text-muted">{t(dict, "stats.empty")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="pb-1 font-normal">
                    <span className="label text-muted">{t(dict, "filters.runner")}</span>
                  </th>
                  <th scope="col" className="hidden w-24 pb-1 font-normal sm:table-cell">
                    <span className="sr-only">{t(dict, "stats.inViewCol")}</span>
                  </th>
                  <th scope="col" className="pb-1 text-right font-normal">
                    <span className="label text-muted">{t(dict, "stats.inViewCol")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {board.runners.map((row) => (
                  <tr key={row.runner} className="border-b border-rule/70">
                    <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                      <Link
                        href={hrefFor(
                          locale,
                          `/models?window=${query.window}&gate=${query.gate}&runner=${encodeURIComponent(row.runner)}`
                        )}
                        className="hover:text-accent"
                      >
                        {row.runner}
                      </Link>
                    </th>
                    <td className="hidden w-24 py-1.5 sm:table-cell" aria-hidden="true">
                      <span className="block h-1.5 w-full bg-raised">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.max(2, (row.inView / Math.max(1, board.runners[0].inView)) * 100)}%`
                          }}
                        />
                      </span>
                    </td>
                    <td className="py-1.5 text-right font-mono">{count(row.inView)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="mt-2 max-w-xl text-xs text-muted">
            {t(dict, "stats.runnersNote", { share: percent(totals.withRunner / Math.max(1, totals.inView)) })}
          </p>
        </section>
      </div>

      {/* §7 — the wire: the second series with a real daily axis. */}
      {wireTotal > 0 ? (
        <section className="rule-bottom mt-3 pb-4">
          <h2 className="section-title mb-1">
            {t(dict, "stats.wireTitle")}
            <span className="section-note">{count(wireTotal)}</span>
          </h2>
          <DailyBars
            points={wirePoints}
            label={t(dict, "stats.wireTitle")}
            summary={`${count(wireTotal)} · ${query.window}`}
            locale={locale}
            caption={t(dict, "stats.wireNote")}
            legend={wireLegend}
            detailsLabel={t(dict, "stats.numbers")}
            columnLabel={t(dict, "stats.dateCol")}
          />
        </section>
      ) : null}

      {/* §8 — the method note is what lets the page skip "live" and "trending". */}
      <section className="rule-strong rule-bottom mt-3 pb-4">
        <h2 className="section-title mb-2">{t(dict, "stats.methodTitle")}</h2>
        <p className="max-w-4xl text-xs leading-relaxed text-muted">
          {t(dict, "stats.methodBody", {
            when,
            since: board.tracking[0] ? shortDay(board.tracking[0].date, locale) : "—"
          })}
        </p>
      </section>
    </>
  );
}
