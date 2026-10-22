/**
 * Tiny dependency-free SVG charts. Everything is drawn from the token palette
 * so the charts inherit the theme automatically.
 *
 * The bars used to live here too. They are gone because a `viewBox` is the wrong
 * instrument for a chart that has to stay readable at 343 px: scaling a 1 200-unit
 * box down turns a 13 px axis label into 3.7 px, and `text` inside a stretched
 * SVG cannot be fixed by making it bigger. The daily series is HTML now
 * (`DailyBars.tsx`); only the donut, which has no axis text, stays SVG.
 */

/**
 * Categorical fills, ordered so the biggest slice is the accent and the second is
 * ink - the printed page's two real colours (docs/en/DESIGN-V3.md D8). The rest
 * are the status tokens, which `scripts/contrast.ts` keeps verifiable rather than
 * hand-picked per chart.
 *
 * Seven entries, and a donut with eight slices painted the smallest category
 * with the biggest one's rose (measured 2026-10-20). The caller now folds its
 * tail into one "other" slice (`foldSlices`), so this palette is never cycled.
 */
export const DONUT_PALETTE = [
  "var(--accent)",
  "var(--rule-strong)",
  "var(--accent-2)",
  "var(--warn)",
  "var(--ok)",
  "var(--danger)",
  "var(--muted)"
] as const;

/**
 * The colour the folded "other" slice uses, in both the donut and the table.
 * It is the palette's **last** entry on purpose: the visible slices only ever
 * reach index 5, so "Other" cannot be painted with a colour a named slice is
 * already wearing (the 8-arc/7-colour bug this fold exists to fix).
 */
export const FOLDED_COLOR = "var(--muted)";

/**
 * Share donut with a legend.
 *
 * Colours without labels are unreadable - the reader could see eight arcs and
 * match none of them to a category. The legend carries the swatch, the label,
 * the count and the share; a folded slice names the categories it holds, because
 * "Other 44" alone is a number nobody can check.
 */
export function Donut({
  slices,
  swatches,
  label,
  mutedLabel
}: {
  slices: Array<{ label: string; value: number; members?: string[] }>;
  /** One colour per slice; the caller derives it so the table can share it. */
  swatches?: string[];
  label?: string;
  mutedLabel?: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-[140px] w-[140px] shrink-0" role="img" aria-label={label ?? "Category share"}>
        {slices.map((slice, index) => {
          const length = (slice.value / total) * circumference;
          const dash = `${length} ${circumference - length}`;
          const share = Math.round((slice.value / total) * 100);
          const circle = (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={swatches?.[index] ?? DONUT_PALETTE[index % DONUT_PALETTE.length]}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            >
              <title>{`${slice.label}: ${slice.value} · ${share}%`}</title>
            </circle>
          );
          offset += length;
          return circle;
        })}
      </svg>

      <ul className="grid min-w-0 flex-1 gap-1 text-sm">
        {slices.map((slice, index) => (
          /* `min-w-0` on the row: a grid item's automatic min-content floor kept
             the legend 276 px wide inside a 183 px slot and pushed the document
             92 px past the viewport at 360 (measured 2026-10-20). */
          <li key={slice.label} className="flex min-w-0 items-start gap-2">
            <span
              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: swatches?.[index] ?? DONUT_PALETTE[index % DONUT_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-muted">{slice.label}</span>
              {slice.members?.length ? (
                <span className="block truncate text-[11px] text-muted">{slice.members.join(", ")}</span>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted">
              {slice.value} · {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
        {slices.length === 0 ? <li className="text-sm text-muted">{mutedLabel}</li> : null}
      </ul>
    </div>
  );
}

/**
 * A linear 0–100 % bar for a rate (a pass rate, a coverage share).
 *
 * Not `Meter`: that one is log-scaled on purpose for download counts, and a
 * log-scaled 0–100 % bar would put 13 % at 57 % of the track.
 */
export function RateBar({
  value,
  tone = "accent",
  label
}: {
  value: number;
  tone?: "accent" | "muted" | "ok";
  label: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 1000) / 10));
  const barClass = { accent: "bg-accent", muted: "bg-muted", ok: "bg-ok" }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden bg-raised" role="img" aria-label={label}>
      <div className={`h-full ${barClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
