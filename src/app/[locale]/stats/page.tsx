import { getStats, getDailySeries } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { DataNotice } from "@/components/EmptyState";
import { TabBar } from "@/components/TabBar";
import { dictionary, pickLocale, t } from "@/i18n";
import { BarChart, Donut, TrendChart } from "@/components/ui/Charts";
import { Field, SubmitButton } from "@/components/ui/Controls";

export default async function StatsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = pickLocale((await params).locale);
  const dict = dictionary(locale);
  const search = await searchParams;
  const rawDays = Number(search.days ?? 30);
  const days = Number.isFinite(rawDays) && rawDays > 0 && rawDays <= 180 ? rawDays : 30;
  /* Default to the feed's gate so the charts agree with the tab badges; "all"
     stays available for the raw tracked volume (it is not a downloadable feed,
     so decision 9's 30-day restriction does not apply here). */
  const gate = search.gate === "all" ? "all" : "passed";

  const stats = await getStats(days, { gate });
  const series = await getDailySeries(days, { gate });
  const total = stats.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(1, ...stats.map((row) => row.count));

  return (
    <>
      <TabBar locale={locale} />
      <DataNotice locale={locale} />

      <h1 className="mb-3 text-2xl font-semibold tracking-tight">
        {t(dict, "stats.title")} <span className="font-mono text-muted">({days}d)</span>
      </h1>

      <form method="get" className="card p-3 mb-4 flex flex-wrap items-end gap-3 text-sm">
        <Field
          name="days"
          label={t(dict, "filters.window")}
          value={String(days)}
          options={[["7", "7d"], ["30", "30d"], ["90", "90d"], ["180", "180d"]]}
        />
        <Field
          name="gate"
          label={t(dict, "filters.gate")}
          termSlug="quality-gate"
          locale={locale}
          value={gate}
          options={[["passed", t(dict, "filters.passedOnly")], ["all", t(dict, "filters.showEverything")]]}
        />
        <SubmitButton label={t(dict, "filters.apply")} />
        <span className="font-mono text-xs text-muted">
          {total} {t(dict, "stats.models")}
        </span>
      </form>

      <div className="stats-grid">
        <section className="card p-4">
          {/* Distinct from the h1 on purpose: two identical headings made the
              page look like it had repeated itself. */}
          <h2 className="text-sm uppercase tracking-wide text-muted mb-3">{t(dict, "stats.bars")}</h2>
          <BarChart rows={stats.map((row) => ({ label: categoryLabel(row.category), value: row.count }))} max={max} />
        </section>

        <section className="card p-4 flex flex-col gap-3">
          <h2 className="text-sm uppercase tracking-wide text-muted">{t(dict, "stats.share")}</h2>
          <Donut
            label={t(dict, "stats.share")}
            mutedLabel={t(dict, "stats.noHistory")}
            slices={stats.map((row) => ({ label: categoryLabel(row.category), value: row.count }))}
          />
        </section>
      </div>

      <section className="card p-4 mt-3">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-3">{t(dict, "stats.trend")}</h2>
        {series.length >= 3 ? (
          <TrendChart
            points={series}
            caption={t(dict, "stats.trendCaption", {
              from: series[0]?.date ?? "",
              to: series[series.length - 1]?.date ?? "",
              days: series.length,
              total: series.reduce((sum, point) => sum + point.count, 0)
            })}
          />
        ) : (
          <p className="text-sm text-muted">{t(dict, "stats.noHistory")}</p>
        )}
      </section>
    </>
  );
}
