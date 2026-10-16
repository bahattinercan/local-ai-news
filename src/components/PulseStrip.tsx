import { Activity, Clock, TrendingUp } from "lucide-react";
import { getPulse } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { Stat } from "./ui/Stat";

export async function PulseStrip({ locale, days, category }: { locale: Locale; days: number; category?: string }) {
  const dict = dictionary(locale);
  const pulse = await getPulse(days, category);
  if (!pulse) return null;

  return (
    <section className="card relative overflow-hidden p-4 mb-4" aria-labelledby="pulse-summary">
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="sweep absolute inset-0 opacity-30" aria-hidden="true" />

      {/* Two real headings instead of anonymous spans: the feed had exactly one
          heading, so assistive tech and the outline saw none of this structure. */}
      <h2 id="pulse-summary" className="relative mb-3 text-xs uppercase tracking-wide text-muted">
        {t(dict, "pulse.summary")}
      </h2>

      <div className="relative flex flex-wrap gap-x-6 gap-y-4 mb-4">
        <Stat label={t(dict, "pulse.tracked")} value={pulse.tracked} tone="accent" hint={days === 1 ? t(dict, "pulse.windowDay") : t(dict, "pulse.windowDays", { days })} />
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
        <Stat
          label={t(dict, "pulse.updated")}
          value={pulse.generatedAt ? relativeTime(pulse.generatedAt) : "—"}
        />
      </div>

      {pulse.hot.length > 0 ? (
        <div className="relative border-t border-border pt-3">
          <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-normal text-muted">
            <TrendingUp size={14} aria-hidden="true" />
            {t(dict, "pulse.hot")}
            <span className="text-xs">{t(dict, "pulse.hotHint")}</span>
          </h2>
          {/* Each row is its own grid with an identical template, so the time and
              download columns line up across rows. A flex row pushed them to a
              different x per row because the name length varied (measured:
              "1d" sat at x=1289/575/735/886/1046). */}
          <ol className="grid gap-2">
            {pulse.hot.map((model, index) => (
              <li
                key={model.externalId}
                className="hot-row text-sm"
              >
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
        </div>
      ) : null}
    </section>
  );
}
