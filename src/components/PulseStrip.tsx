import Link from "next/link";
import { Activity, Clock, TrendingUp } from "lucide-react";
import { getPulse } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { Stat } from "./ui/Stat";
import { Term } from "./ui/Term";

/**
 * The window summary band on the index (docs/en/DESIGN-V3.md §1 rule 2).
 *
 * It used to be a 287 px card with a grid texture, a rotating radar sweep and
 * four equal-weight 24 px stats. The card is gone: it is a ruled band now, the
 * decorative layers are gone with it (nothing moves inside the reading area), one
 * metric still leads, and the hot list stays a disclosure — one click away and
 * outside the first screen's budget.
 */
export async function PulseStrip({ locale, days, category }: { locale: Locale; days: number; category?: string }) {
  const dict = dictionary(locale);
  const pulse = await getPulse(days, category);
  if (!pulse) return null;

  const window = days === 1 ? t(dict, "pulse.windowDay") : t(dict, "pulse.windowDays", { days });

  return (
    <section className="rule-bottom mb-4 pb-3" aria-labelledby="pulse-summary">
      <h2 id="pulse-summary" className="label mb-2 text-muted">
        {t(dict, "pulse.summary")}
      </h2>

      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <Stat label={t(dict, "pulse.tracked")} value={pulse.tracked} tone="accent" size="lg" hint={window} />
        <Stat
          label={
            <Term slug="quality-gate" locale={locale}>
              {t(dict, "pulse.passed")}
            </Term>
          }
          value={pulse.passed}
          tone="ok"
        />
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
            <ol className="grid grid-cols-1 gap-1 pt-1 lg:absolute lg:right-0 lg:z-20 lg:mt-1 lg:w-[34rem] lg:gap-2 lg:border lg:border-rule-strong lg:bg-surface lg:p-3 lg:shadow-[var(--shadow-lift)]">
              {pulse.hot.map((model, index) => (
                <li key={model.externalId} className="hot-row text-sm">
                  <span className="font-mono text-xs text-muted">{index + 1}</span>
                  <Link href={hrefFor(locale, `/m/${model.slug}`)} className="flex min-h-7 min-w-0 items-center hover:underline">
                    <span className="truncate">{model.externalId}</span>
                  </Link>
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
