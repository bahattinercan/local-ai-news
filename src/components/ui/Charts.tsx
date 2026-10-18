/**
 * Tiny dependency-free SVG charts. Everything is drawn from the token palette
 * so the charts inherit the theme automatically.
 */

export function BarChart({
  rows,
  max
}: {
  rows: Array<{ label: string; value: number }>;
  max: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      {rows.map((row) => (
        <div key={row.label} className="bar-row items-center">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-sm text-muted truncate">{row.label}</span>
              <span className="font-mono text-sm">{row.value}</span>
            </div>
            <div className="h-2 rounded-full bg-raised overflow-hidden">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${max > 0 ? Math.max(3, (row.value / max) * 100) : 3}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ points, caption }: { points: Array<{ date: string; count: number }>; caption?: string }) {
  /* A 640x160 viewBox stretched to a 1100 px card produced a 275 px-tall chart
     for three points. The box is now wide enough to keep its own aspect ratio, so
     the height stays around 180 px on a desktop card and shrinks on a phone. */
  const width = 1200;
  const height = 200;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * step} ${height - (point.count / max) * (height - 12) - 6}`)
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={caption ?? "Daily model volume"}>
        <path d={area} fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle
            key={point.date}
            cx={index * step}
            cy={height - (point.count / max) * (height - 12) - 6}
            r="4"
            fill="var(--accent)"
          />
        ))}
      </svg>
      {caption ? <p className="mt-2 font-mono text-xs text-muted">{caption}</p> : null}
    </div>
  );
}

/**
 * Categorical fills, ordered so the biggest slice is the accent and the second is
 * ink — the printed page's two real colours (docs/en/DESIGN-V3.md D8). The rest
 * are the status tokens, which `scripts/contrast.ts` keeps verifiable rather than
 * hand-picked per chart.
 */
const DONUT_PALETTE = [
  "var(--accent)",
  "var(--rule-strong)",
  "var(--accent-2)",
  "var(--muted)",
  "var(--warn)",
  "var(--ok)",
  "var(--danger)"
];

/**
 * Share donut with a legend.
 *
 * Colours without labels are unreadable — the reader could see eight arcs and
 * match none of them to a category. The legend carries the swatch, the label,
 * the count and the share, and reuses the same palette index as the arc.
 */
export function Donut({
  slices,
  label,
  mutedLabel
}: {
  slices: Array<{ label: string; value: number }>;
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
          const circle = (
            <circle
              key={slice.label}
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke={DONUT_PALETTE[index % DONUT_PALETTE.length]}
              strokeWidth="12"
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += length;
          return circle;
        })}
      </svg>

      <ul className="grid min-w-[11rem] flex-1 gap-1 text-sm">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-muted">{slice.label}</span>
            <span className="font-mono text-xs text-muted">
              {slice.value} · {Math.round((slice.value / total) * 100)}%
            </span>
          </li>
        ))}
        {slices.length === 0 ? <li className="text-sm text-muted">{mutedLabel}</li> : null}
      </ul>
    </div>
  );
}
