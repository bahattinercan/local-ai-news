import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  size = "md"
}: {
  label: ReactNode;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "accent" | "ok" | "warn";
  /** `lg` is the single hero metric of a screen; everything else stays `md`. */
  size?: "md" | "lg";
}) {
  const toneClass = { neutral: "text-text", accent: "text-accent", ok: "text-ok", warn: "text-warn" }[tone];
  const sizeClass = size === "lg" ? "text-2xl sm:text-3xl" : "text-lg";
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className={cn("font-mono leading-none", sizeClass, toneClass)}>{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function Meter({
  value,
  max,
  tone = "accent",
  label
}: {
  value: number;
  max: number;
  tone?: "accent" | "ok" | "muted";
  /** What the bar compares against; rendered as the accessible name. */
  label?: string;
}) {
  // Log scale: downloads span 1 → 100k+, a linear bar would be invisible.
  const pct = max > 0 && value > 0 ? Math.max(4, Math.round((Math.log10(value + 1) / Math.log10(max + 1)) * 100)) : 2;
  const barClass = { accent: "bg-accent", ok: "bg-ok", muted: "bg-muted" }[tone];
  return (
    <div
      className="h-1.5 w-full rounded-full bg-raised overflow-hidden"
      role="img"
      aria-label={label ?? `${value} / ${max}`}
    >
      <div className={cn("h-full rounded-full", barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
}
