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
    <div className="grid gap-2">
      {rows.map((row) => (
        <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
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

export function TrendChart({ points }: { points: Array<{ date: string; count: number }> }) {
  const width = 640;
  const height = 160;
  const max = Math.max(1, ...points.map((p) => p.count));
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${index * step} ${height - (point.count / max) * (height - 12) - 6}`)
    .join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Daily model volume">
      <path d={area} fill="rgba(53,208,186,0.14)" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      {points.map((point, index) => (
        <circle
          key={point.date}
          cx={index * step}
          cy={height - (point.count / max) * (height - 12) - 6}
          r="3"
          fill="var(--accent)"
        />
      ))}
    </svg>
  );
}

export function Donut({ slices }: { slices: Array<{ label: string; value: number }> }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const palette = ["var(--accent)", "var(--accent-2)", "var(--ok)", "var(--warn)", "var(--danger)", "#7f8ea3", "#4a5a72"];

  return (
    <svg viewBox="0 0 140 140" className="w-[140px] h-[140px]" role="img" aria-label="Category share">
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
            stroke={palette[index % palette.length]}
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
  );
}
