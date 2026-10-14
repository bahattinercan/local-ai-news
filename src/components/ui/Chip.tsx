import { cn } from "@/lib/format";

type Tone = "neutral" | "accent" | "ok" | "warn" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-muted",
  accent: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger"
};

export function Chip({
  label,
  tone = "neutral",
  icon
}: {
  label: string;
  tone?: Tone;
  icon?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs", TONE_CLASS[tone])}>
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {label}
    </span>
  );
}
