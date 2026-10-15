import { Activity, Clock, TrendingUp } from "lucide-react";
import { getPulse } from "@/lib/store";
import { categoryLabel } from "@/lib/classify/rules";
import { formatNumber, relativeTime } from "@/lib/format";
import { dictionary, hrefFor, t, type Locale } from "@/i18n";
import { Stat } from "./ui/Stat";

export async function PulseStrip({ locale, days }: { locale: Locale; days: number }) {
  const dict = dictionary(locale);
  const pulse = await getPulse(days);
  if (!pulse) return null;

  return (
    <section className="card relative overflow-hidden p-4 mb-4">
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden="true" />
      <div className="sweep absolute inset-0 opacity-30" aria-hidden="true" />

      <div className="relative flex flex-wrap gap-x-6 gap-y-4 mb-4">
        <Stat label={t(dict, "pulse.tracked")} value={pulse.tracked} tone="accent" />
        <Stat label={t(dict, "pulse.passed")} value={pulse.passed} tone="ok" />
        <Stat
          label={t(dict, "pulse.top")}
          value={pulse.topCategory ? categoryLabel(pulse.topCategory, locale) : "—"}
          hint={`${pulse.topCategoryCount}`}
        />
        <Stat
          label={t(dict, "pulse.updated")}
          value={pulse.generatedAt ? relativeTime(pulse.generatedAt) : "—"}
        />
      </div>

      {pulse.hot.length > 0 ? (
        <div className="relative border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted mb-2">
            <TrendingUp size={14} aria-hidden="true" />
            {t(dict, "pulse.hot")}
            <span className="text-xs">{t(dict, "pulse.hotHint")}</span>
          </div>
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
                <a href={hrefFor(locale, `/m/${model.slug}`)} className="truncate hover:text-accent">
                  {model.externalId}
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
