import type { Locale } from "@/i18n";

/**
 * The daily series, as HTML rather than SVG (docs/en/STATS-PLAN.md S4).
 *
 * Measured before: the old `TrendChart` put three points on a 1 200-unit viewBox
 * that rendered at 1 248×208 on a desktop and 343×57 on a phone, with **zero**
 * `<text>` nodes - no y scale, no x labels, no values. Scaling the box is what
 * makes SVG text unusable at small widths, so the bars are plain divs: the axis
 * labels stay 11 px at every viewport, the tokens apply, and the print sheet gets
 * the same chart.
 *
 * The series is zero-filled by `fillDaily`, so an empty day is a 2 px stub
 * instead of a straight line through the gap. That was the specific lie on the
 * live page: 14 → 20 Oct had no ingest runs and the chart drew it as continuous.
 */
export interface DailyPoint {
  date: string;
  total: number;
  /** Bottom-first. A part with `value: 0` is skipped. */
  parts: Array<{ label: string; value: number; color: string }>;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

/** UTC, from the date part only: a bucket must not shift with the reader's TZ. */
export function shortDay(date: string, locale: Locale): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return `${day} ${(locale === "tr" ? MONTHS_TR : MONTHS_EN)[month - 1] ?? month}`;
}

export function DailyBars({
  points,
  label,
  summary,
  locale,
  caption,
  detailsLabel,
  columnLabel,
  legend
}: {
  points: DailyPoint[];
  /** Section name for the figure's accessible name. */
  label: string;
  /** One sentence that states what the bars count (printed and announced). */
  summary: string;
  locale: Locale;
  /** Printed under the plot, e.g. "1 491 repos created in the window". */
  caption?: string;
  detailsLabel: string;
  columnLabel: string;
  /** Colour key. Without it a stacked bar is a picture of unnamed colours. */
  legend?: Array<{ label: string; value?: number; color: string }>;
}) {
  const max = Math.max(1, ...points.map((point) => point.total));
  const mid = Math.round(max / 2);
  const last = points.length - 1;
  const tickIndexes = [...new Set([0, Math.round(last * 0.25), Math.round(last * 0.5), Math.round(last * 0.75), last])];

  return (
    <figure className="mt-2">
      {legend?.length ? (
        <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
              {typeof item.value === "number" ? <span className="font-mono text-text">{item.value}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <div
          className="flex h-[180px] w-9 shrink-0 flex-col justify-between text-right font-mono text-[11px] leading-none text-muted"
          aria-hidden="true"
        >
          <span>{max}</span>
          <span>{mid}</span>
          <span>0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div
            className="flex h-[180px] items-end gap-px border-b border-rule"
            role="img"
            aria-label={`${label}. ${summary}`}
          >
            {points.map((point) => {
              const title = `${shortDay(point.date, locale)}: ${point.parts
                .map((part) => `${part.value} ${part.label}`)
                .join(" · ")}`;
              return (
                <div key={point.date} className="flex h-full min-w-0 flex-1 items-end" title={title}>
                  {point.total === 0 ? (
                    <div className="h-[2px] w-full bg-rule" />
                  ) : (
                    <div
                      className="flex w-full flex-col-reverse"
                      style={{ height: `${Math.max(2, (point.total / max) * 100)}%` }}
                    >
                      {point.parts
                        .filter((part) => part.value > 0)
                        .map((part) => (
                          <div
                            key={part.label}
                            style={{
                              height: `${(part.value / point.total) * 100}%`,
                              background: part.color
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-1 flex justify-between font-mono text-[11px] leading-none text-muted" aria-hidden="true">
            {tickIndexes.map((index, position) => (
              <span key={points[index]?.date ?? index} className={position === tickIndexes.length - 1 ? "text-right" : undefined}>
                {points[index] ? shortDay(points[index].date, locale) : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {caption ? <figcaption className="mt-2 font-mono text-[11px] text-muted">{caption}</figcaption> : null}

      {/* The chart is a picture; the numbers are the record. Closed by default so
          the panel keeps its height. It is hidden on paper: a closed `<details>`
          cannot be opened from CSS (the print rule reveals the summary, and the
          summary is hidden as a control), so a printed sheet gets the bars, the
          axis, the legend and the caption instead of an empty box. */}
      <details className="mt-2 print:hidden">
        <summary className="flex min-h-6 cursor-pointer items-center font-mono text-[11px] text-muted hover:text-text">
          {detailsLabel}
        </summary>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="border-b border-rule text-left">
              <th scope="col" className="py-1 font-normal text-muted">{columnLabel}</th>
              {points[0]?.parts.map((part) => (
                <th key={part.label} scope="col" className="py-1 text-right font-normal text-muted">
                  {part.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.date} className="border-b border-rule/60">
                <th scope="row" className="py-1 text-left font-mono font-normal text-muted">
                  {point.date}
                </th>
                {point.parts.map((part) => (
                  <td key={part.label} className="py-1 text-right font-mono">
                    {part.value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
