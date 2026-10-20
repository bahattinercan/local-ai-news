import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 86_400_000));
}

export function minutesSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((Date.now() - then) / 60_000));
}

export function relativeTime(iso: string): string {
  const minutes = minutesSince(iso);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function formatNumber(value: number | null | undefined): string {
  /* A snapshot field can be missing entirely; `String(undefined)` used to reach
     the UI as the text "undefined". */
  if (value === null || value === undefined || Number.isNaN(value)) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  return `${Math.round(bytes / 1000)} kB`;
}

/**
 * An exact, grouped count for a data surface.
 *
 * `formatNumber` compacts ≥1 000 to "1.5k", which is right for a nav badge and
 * wrong for a page whose whole job is the number: "606 of 1 544" cannot be
 * printed as "606 of 1.5k" (docs/en/STATS-PLAN.md §4).
 */
export function formatCount(value: number | null | undefined, locale: "en" | "tr" = "en"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US").format(value);
}

/** "39.2%" / "39,2%" — a rate, not a count. `Intl` handles the decimal comma. */
export function formatPercent(value: number, locale: "en" | "tr" = "en", digits = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(safe);
}

/**
 * "18 October 2026" / "18 Ekim 2026" — the dateline under the nameplate.
 *
 * The date comes from the snapshot's `generatedAt`, never from `Date.now()`: the
 * masthead has to be the same string on the server and after hydration, and the
 * edition is the snapshot, not the request.
 */
export function formatEditionDate(iso: string | null | undefined, locale: "en" | "tr"): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

/** "09:09 UTC" — the clock in the masthead's snapshot block. */
export function formatClock(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.toISOString().slice(11, 16)} UTC`;
}
