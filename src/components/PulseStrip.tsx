import { Activity, Clock, TrendingUp } from "lucide-react";
import { getPulse } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { Stat } from "./ui/Stat";

/**
 * Window summary.
 *
 * The card used to be 287 px tall: four equal-weight 24 px stats plus an
 * always-open five-row list, which pushed the first model card to y=882 on a
 * 1440x900 screen. One metric now leads (`tracked`, 30 px), the rest are
 * secondary, and the hot list is a disclosure — the same information, one click
 * away, in ~135 px.
 */
export async function PulseStrip({ locale, days, category }: { locale: Locale; days: number; category?: string }) {
  const dict = dictionary(locale);
  const pulse = await getPulse(days, category);
  if (!pulse) return null;

  const window = days === 1 ? t(dict, "pulse.windowDay") : t(dict, "pulse.windowDays", { days });

  return (
    <section className="card relative p-4 mb-4" aria-labelledby="pulse-summary">
      {/* The texture is clipped in its own layer instead of clipping the whole card:
          `overflow-hidden` on the card cut off the hot-list panel that opens from
          the disclosure below (the panel is absolutely positioned on `lg`). */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden="true">
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="sweep absolute inset-0 opacity-30" />
      </div>

      {/* A real heading: the feed had exactly one heading in total, so assistive
          tech and the document outline saw none of this structure. */}
      <h2 id="pulse-summary" className="relative mb-2 text-xs uppercase tracking-wide text-muted">
        {t(dict, "pulse.summary")}
      </h2>

      <div className="relative flex flex-wrap items-end gap-x-6 gap-y-3">
        <Stat label={t(dict, "pulse.tracked")} value={pulse.tracked} tone="accent" size="lg" hint={window} />
        <Stat label={t(dict, "pulse.passed")} value={pulse.passed} tone="ok" />
        {/* Scoped to a category the "leading category" is the page itself, so it
            is only shown where it carries information. */}
        {category ? null : (
          <Stat
            label={t(dict, "pulse.top")}
            value={pulse.topCategory ? categoryLabel(pulse.topCategory) : "—"}
            hint={`${pulse.topCategoryCount}`}
          />
        )}
        <Stat label={t(dict, "pulse.updated")} value={pulse.generatedAt ? relativeTime(pulse.generatedAt) : "—"} />

        {pulse.hot.length > 0 ? (
          <details className="w-full lg:ml-auto lg:w-auto">
            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted">
              <TrendingUp size={14} aria-hidden="true" />
              {t(dict, "pulse.hot")}
              <span className="font-mono text-xs">{pulse.hot.length}</span>
              {/* The hint costs three wrapped lines at 390 px; the summary reads
                  fine without it there. */}
              <span className="hidden text-xs sm:inline">{t(dict, "pulse.hotHint")}</span>
            </summary>
            {/* Each row is its own grid with an identical template, so the time and
                download columns line up across rows. */}
            <ol className="grid gap-1 pt-1 lg:absolute lg:right-0 lg:z-20 lg:mt-1 lg:w-[34rem] lg:gap-2 lg:rounded-md lg:border lg:border-border lg:bg-surface lg:p-3 lg:shadow-[var(--shadow-lift)]">
              {pulse.hot.map((model, index) => (
                <li key={model.externalId} className="hot-row text-sm">
                  <span className="font-mono text-xs text-muted">{index + 1}</span>
                  <a href={hrefFor(locale, `/m/${model.slug}`)} className="flex min-h-7 min-w-0 items-center hover:text-accent">
                    <span className="truncate">{model.externalId}</span>
                  </a>
                  <span className="flex items-center justify-end gap-1 font-mono text-xs text-muted">
                    <Clock size={12} aria-hidden="true" /> {relativeTime(model.firstSeenAt)}
                  </span>
                  <span className="flex items-center justify-end gap-1 font-mono text-xs text-accent">
                    <Activity size={12} aria-hidden="true" /> {formatNumber(model.downloads)}
                  </span>
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}
