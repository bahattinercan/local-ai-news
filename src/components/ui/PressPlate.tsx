/**
 * The generated plate (docs/en/DESIGN-V3.md §1 D5).
 *
 * Model photography is not available: `sampleImages` is non-empty on **25 of
 * 1 633 models (1.5 %)** in the served snapshot (measured 2026-10-18), so any
 * layout that leans on model images has 98.5 % of its slots empty. This draws one
 * instead — a deterministic halftone monogram, the way a small paper sets a
 * photograph it does not have.
 *
 * Deterministic matters: the same slug must produce the same plate on the server
 * and after hydration, on every page, forever. So the only input is the slug.
 *
 * Cheap by construction: a 6 px dot `<pattern>` masked by one radial gradient is
 * three SVG elements per plate, not a loop of a hundred circles — a front page
 * prints twenty of these.
 */
const FOCUS_POINTS = [
  { x: 30, y: 26 },
  { x: 74, y: 30 },
  { x: 50, y: 82 },
  { x: 24, y: 70 }
];

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/** Two characters a reader can recognise the row by: `wicked-tutu` → `WT`. */
export function plateInitials(text: string): string {
  const chunks = text
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (chunks.length === 0) return "??";
  if (chunks.length === 1) return chunks[0].slice(0, 2).toUpperCase();
  return `${chunks[0][0]}${chunks[1][0]}`.toUpperCase();
}

export function PressPlate({
  slug,
  name,
  label,
  className
}: {
  slug: string;
  /** The monogram source; falls back to the slug. */
  name?: string;
  /** Accessible name. Without it the plate is decorative and hidden from AT. */
  label?: string;
  className?: string;
}) {
  const seed = hash(slug);
  const id = `plate-${seed.toString(36)}`;
  const focus = FOCUS_POINTS[seed % FOCUS_POINTS.length];
  const monogram = plateInitials(name ?? slug);
  /* About one plate in seven is set as a reversed block, which is what stops a
     column of identical plates from reading as a grid of identical plates. */
  const reversed = seed % 7 === 0;
  const ink = reversed ? "var(--bg)" : "var(--plate-ink)";
  const wash = reversed ? "var(--rule-strong)" : "var(--plate-wash)";

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <pattern id={`${id}-dots`} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.1" style={{ fill: ink }} />
        </pattern>
        <radialGradient id={`${id}-fade`} cx={focus.x / 100} cy={focus.y / 100} r="0.9">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.1" />
        </radialGradient>
        <mask id={`${id}-mask`}>
          <rect width="100" height="100" fill={`url(#${id}-fade)`} />
        </mask>
      </defs>

      <rect width="100" height="100" style={{ fill: wash }} />
      <rect width="100" height="100" fill={`url(#${id}-dots)`} mask={`url(#${id}-mask)`} />
      <text
        x="50"
        y="53"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fill: ink, fontFamily: "var(--font-display)", fontSize: "30px", fontWeight: 700, letterSpacing: "0.06em" }}
      >
        {monogram}
      </text>
      <rect x="0.5" y="0.5" width="99" height="99" fill="none" style={{ stroke: "var(--rule)" }} strokeWidth="1" />
    </svg>
  );
}
