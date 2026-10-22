import { dictionary, hrefFor, t, type Locale } from "../i18n/index.ts";
import { formatBytes, formatNumber } from "./format.ts";
import { slugify, type ClassifiedModel } from "./model.ts";
import { formatParams } from "./runner/vram.ts";

/**
 * The compare sheet's data model - reading, resolving and laying out
 * (docs/en/COMPARE-PLAN.md).
 *
 * Everything here is pure: no snapshot, no `fetch`, no `Date.now()` that the
 * caller cannot pin, so `tests/compare.test.ts` can assert the two rules the page
 * lives or dies by:
 *
 *  1. a row exists only when at least one compared model reports it (C5), because
 *     `paramsTotal` is present on 17.7 % of the served rows and `vramEstGb` on
 *     17.2 % - an 8-row sheet is mostly dashes;
 *  2. "best" is a *fact about the printed numbers*, computed with a stated
 *     direction, marked on every tie, and never assigned when fewer than two
 *     models report the value (C7/C8).
 */

/** Four is what a decision needs; six forced the label column to 60 px (measured). */
export const COMPARE_CAP = 4;

export type Direction = "max" | "min" | null;

export interface CompareCell {
  /** Printed text, or null when the model does not report the value. */
  text: string | null;
  numeric: number | null;
  href: string | null;
  best: boolean;
  /** Difference against the first column, already formatted; null if incomparable. */
  delta: string | null;
}

export interface CompareRow {
  key: string;
  label: string;
  /** The formula or caveat behind the row, printed as a title. */
  hint: string | null;
  direction: Direction;
  /** How many compared models report this value. */
  reported: number;
  values: CompareCell[];
}

export interface CompareGroup {
  key: string;
  title: string;
  /** Compared models that report at least one row in this group. */
  reported: number;
  rows: CompareRow[];
}

export interface CompareDifference {
  key: string;
  label: string;
  left: string;
  right: string;
  ratio: string;
}

/** One address as the reader wrote it, and the slug it reduces to. */
export interface CompareToken {
  raw: string;
  slug: string;
}

export interface CompareInput {
  /** Resolution order (= column order) as slugs. */
  slugs: string[];
  /** The same addresses with what the reader actually typed, for notices. */
  tokens: CompareToken[];
  duplicates: string[];
  overflow: string[];
}

/* ------------------------------------------------------------------ ids ---- */

const HF_PREFIX = /^(?:https?:\/\/)?(?:www\.)?huggingface\.co\//i;

/** Decoding is best-effort: a malformed escape yields the raw token, never a throw. */
function decodeSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Reduce anything a reader might paste to `owner/model`, then to the stored slug.
 *
 * The empty state used to teach `?ids=owner/model`, which never resolved: the
 * stored slug comes from `slugify(externalId)`, and `slugify` turns `/` into `-`.
 * Accepting the repo id (and a Hub URL) in the *same* parser as the slug means the
 * documented form and the working form cannot drift apart again.
 */
export function toRepoId(value: string): string {
  const raw = value.trim().replace(/^<|>$/g, "").replace(HF_PREFIX, "").split(/[?#]/)[0];
  const parts = raw.split("/").filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return parts[0] ?? "";
}

/** `owner/model` → `owner-model`; a slug passes through unchanged. */
export function compareSlugOf(token: string): string | null {
  const repo = toRepoId(token);
  if (!repo) return null;
  const slug = slugify(repo);
  return slug === "" ? null : slug;
}

function splitRaw(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  /* Decode first, then split: `?ids=a%2Cb` is two addresses, not one. */
  return values
    .flatMap((value) => decodeSafe(String(value)).split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Parse the `ids` parameter. Blank tokens are "not set" (the same rule
 * `cleanSearch` applies to every other query field), so they are ignored rather
 * than reported as rejected.
 */
export function parseCompareIds(raw: string | string[] | undefined, cap: number = COMPARE_CAP): CompareInput {
  const tokens: CompareToken[] = [];
  const duplicates: string[] = [];
  const overflow: string[] = [];
  const seen = new Set<string>();

  for (const rawToken of splitRaw(raw)) {
    const slug = compareSlugOf(rawToken);
    if (!slug) continue;
    const key = slug.toLowerCase();
    if (seen.has(key)) {
      duplicates.push(rawToken);
      continue;
    }
    if (tokens.length >= cap) {
      overflow.push(rawToken);
      continue;
    }
    seen.add(key);
    tokens.push({ raw: rawToken, slug });
  }

  return { slugs: tokens.map((token) => token.slug), tokens, duplicates, overflow };
}

/**
 * Split the resolved models from the addresses the snapshot does not know. The
 * order of `models` is the order of `slugs` minus the misses, because the first
 * column is the baseline every delta is computed against.
 */
export function splitResolved(tokens: CompareToken[], models: ClassifiedModel[]): { models: ClassifiedModel[]; rejected: string[] } {
  const resolved = new Set(models.map((model) => model.slug.toLowerCase()));
  /* Report what the reader typed, not the slug it reduced to: "xx/garbage is not
     in this snapshot" is actionable, "xx-garbage is not" is not. */
  return { models, rejected: tokens.filter((token) => !resolved.has(token.slug.toLowerCase())).map((token) => token.raw) };
}

/** The canonical address for a resolved list: deduped, order preserved. */
export function compareHref(locale: Locale, slugs: string[]): string {
  if (slugs.length === 0) return hrefFor(locale, "/compare");
  return hrefFor(locale, `/compare?ids=${slugs.map((slug) => encodeURIComponent(slug)).join(",")}`);
}

/* ---------------------------------------------------------------- rows ---- */

/**
 * Downloads ÷ days since we first saw the repo.
 *
 * Both inputs are near-universal (downloads 97.5 %, `firstSeenAt` 100 %), which is
 * why this is the only momentum metric the sheet can promise. It is NOT growth
 * against a previous snapshot: `downloadsAtFirstSeen` is present on 0 of 606 rows.
 */
export function downloadsPerDay(model: ClassifiedModel, now: number): number | null {
  if (!(model.downloads > 0) || !model.firstSeenAt) return null;
  const then = new Date(model.firstSeenAt).getTime();
  if (Number.isNaN(then)) return null;
  const days = Math.max(1, daysTracked(model.firstSeenAt, now));
  return model.downloads / days;
}

/** Whole days between the first sighting and `now`, rounded like `daysSince` does. */
export function daysTracked(iso: string, now: number): number {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.round((now - then) / 86_400_000));
}

type DeltaKind = "bytes" | "count" | "params" | "rate" | "decimal";

interface Measure {
  text: string;
  numeric: number | null;
  href?: string | null;
}

interface CompareContext {
  now: number;
  knownSlugs: Set<string>;
  locale: Locale;
  dict: Record<string, string>;
}

interface RowSpec {
  key: string;
  labelKey: string;
  hintKey?: string;
  direction: Direction;
  delta: DeltaKind;
  measure: (_model: ClassifiedModel, _context: CompareContext) => Measure | null;
}

/** Four entries, then a `+n`: one cell was 138 characters and 21 entries long. */
function quantText(quantizations: string[]): string {
  if (quantizations.length <= 4) return quantizations.join(", ");
  return `${quantizations.slice(0, 4).join(", ")} +${quantizations.length - 4}`;
}

const ROW_SPECS: RowSpec[] = [
  {
    key: "weights",
    labelKey: "compare.weights",
    direction: "min",
    delta: "bytes",
    measure: (model) =>
      model.storageBytes && model.storageBytes > 0
        ? { text: formatBytes(model.storageBytes), numeric: model.storageBytes }
        : null
  },
  {
    key: "params",
    labelKey: "compare.params",
    direction: null,
    delta: "params",
    measure: (model) =>
      model.paramsTotal && model.paramsTotal > 0
        ? { text: formatParams(model.paramsTotal), numeric: model.paramsTotal }
        : null
  },
  {
    key: "quantizations",
    labelKey: "compare.quantizations",
    hintKey: "compare.hintQuantizations",
    direction: null,
    delta: "count",
    measure: (model) =>
      model.quantizations.length > 0 ? { text: quantText(model.quantizations), numeric: null } : null
  },
  {
    key: "vram",
    labelKey: "compare.vram",
    hintKey: "compare.hintVram",
    direction: "min",
    delta: "decimal",
    measure: (model) =>
      model.vramEstGb && model.vramEstGb > 0 ? { text: `~${model.vramEstGb} GB`, numeric: model.vramEstGb } : null
  },
  {
    key: "vramPerB",
    labelKey: "compare.vramPerB",
    hintKey: "compare.hintVramPerB",
    direction: "min",
    delta: "decimal",
    measure: (model) => {
      const vram = model.vramEstGb;
      const params = model.paramsTotal;
      if (!(vram !== null && vram > 0) || !(params !== null && params > 0)) return null;
      const gb = vram / (params / 1e9);
      return { text: `${gb.toFixed(1)} GB/B`, numeric: gb };
    }
  },
  {
    key: "runners",
    labelKey: "compare.runners",
    direction: null,
    delta: "count",
    measure: (model) => (model.runners.length > 0 ? { text: model.runners.join(" · "), numeric: null } : null)
  },
  {
    key: "library",
    labelKey: "compare.library",
    direction: null,
    delta: "count",
    measure: (model) => {
      const library = model.libraryName ?? model.pipelineTag;
      return library ? { text: library, numeric: null } : null;
    }
  },
  {
    key: "downloads",
    labelKey: "compare.downloads",
    direction: "max",
    delta: "count",
    measure: (model) => (model.downloads > 0 ? { text: formatNumber(model.downloads), numeric: model.downloads } : null)
  },
  {
    key: "rate",
    labelKey: "compare.rate",
    hintKey: "compare.hintRate",
    direction: "max",
    delta: "rate",
    measure: (model, context) => {
      const rate = downloadsPerDay(model, context.now);
      if (rate === null) return null;
      return { text: `${rate.toFixed(1)}${t(context.dict, "compare.perDay")}`, numeric: rate };
    }
  },
  {
    key: "likes",
    labelKey: "compare.likes",
    direction: "max",
    delta: "count",
    measure: (model) => (model.likes > 0 ? { text: formatNumber(model.likes), numeric: model.likes } : null)
  },
  {
    key: "likesPerK",
    labelKey: "compare.likesPerK",
    hintKey: "compare.hintLikesPerK",
    direction: "max",
    delta: "decimal",
    measure: (model) => {
      if (!(model.likes > 0) || !(model.downloads > 0)) return null;
      const value = (model.likes / model.downloads) * 1000;
      return { text: value.toFixed(1), numeric: value };
    }
  },
  {
    key: "license",
    labelKey: "compare.license",
    direction: null,
    delta: "count",
    measure: (model, context) =>
      model.license
        ? {
            text: model.license,
            numeric: null,
            href: hrefFor(context.locale, `/models?license=${encodeURIComponent(model.license)}`)
          }
        : null
  },
  {
    key: "gate",
    labelKey: "compare.gate",
    hintKey: "compare.hintGate",
    direction: null,
    delta: "count",
    measure: (model, context) => ({
      text: model.qualityPassed
        ? t(context.dict, "card.gatePassed")
        : model.gateReason || t(context.dict, "card.gateFailed"),
      numeric: null
    })
  },
  {
    key: "firstSeen",
    labelKey: "compare.firstSeen",
    hintKey: "compare.hintFirstSeen",
    direction: null,
    delta: "count",
    measure: (model, context) =>
      model.firstSeenAt
        ? { text: t(context.dict, "compare.ageDays", { days: daysTracked(model.firstSeenAt, context.now) }), numeric: null }
        : null
  },
  {
    key: "baseModel",
    labelKey: "compare.baseModel",
    direction: null,
    delta: "count",
    measure: (model, context) => {
      const base = model.cardMeta?.baseModel;
      if (!base) return null;
      const slug = slugify(base);
      return { text: base, numeric: null, href: context.knownSlugs.has(slug) ? hrefFor(context.locale, `/m/${slug}`) : null };
    }
  },
  {
    key: "hf",
    labelKey: "compare.hf",
    direction: null,
    delta: "count",
    measure: (model, context) => ({ text: t(context.dict, "compare.openHf"), numeric: null, href: model.url })
  }
];

const SPEC_BY_KEY = new Map(ROW_SPECS.map((spec) => [spec.key, spec]));

const GROUPS: Array<{ key: string; titleKey: string; rows: string[] }> = [
  { key: "fit", titleKey: "compare.groupFit", rows: ["weights", "params", "quantizations", "vram", "vramPerB"] },
  { key: "runs", titleKey: "compare.groupRuns", rows: ["runners", "library"] },
  { key: "traction", titleKey: "compare.groupTraction", rows: ["downloads", "rate", "likes", "likesPerK"] },
  { key: "provenance", titleKey: "compare.groupProvenance", rows: ["license", "gate", "firstSeen", "baseModel", "hf"] }
];

function formatDelta(kind: DeltaKind, diff: number, dict: Record<string, string>): string | null {
  if (!Number.isFinite(diff) || Math.abs(diff) < 1e-9) return null;
  const sign = diff > 0 ? "+" : "−";
  const abs = Math.abs(diff);
  switch (kind) {
    case "bytes":
      return `${sign}${formatBytes(abs)}`;
    case "params":
      return `${sign}${formatParams(abs)}`;
    case "count":
      return `${sign}${formatNumber(abs)}`;
    case "rate":
      return `${sign}${abs.toFixed(1)}${t(dict, "compare.perDay")}`;
    case "decimal":
      return `${sign}${abs.toFixed(1)}`;
  }
}

/**
 * Every index whose value equals the row's extreme, and nothing at all when the
 * direction is undefined or fewer than two models report a number.
 */
export function bestIndexes(row: CompareRow): number[] {
  if (!row.direction) return [];
  const numbers = row.values
    .map((cell) => cell.numeric)
    .filter((value): value is number => value !== null && Number.isFinite(value));
  if (numbers.length < 2) return [];
  const target = row.direction === "max" ? Math.max(...numbers) : Math.min(...numbers);
  return row.values.flatMap((cell, index) => (cell.numeric !== null && cell.numeric === target ? [index] : []));
}

export function compareRows(
  models: ClassifiedModel[],
  locale: Locale,
  options: { now?: number; knownSlugs?: Set<string> } = {}
): CompareGroup[] {
  const dict = dictionary(locale);
  const context: CompareContext = {
    now: options.now ?? Date.now(),
    knownSlugs: options.knownSlugs ?? new Set<string>(),
    locale,
    dict
  };

  const groups: CompareGroup[] = [];

  for (const group of GROUPS) {
    const rows: CompareRow[] = [];

    for (const key of group.rows) {
      const spec = SPEC_BY_KEY.get(key);
      if (!spec) continue;

      const measures = models.map((model) => spec.measure(model, context));
      const reported = measures.filter((measure) => measure !== null).length;
      /* C5: nobody reports it, so the row does not exist. */
      if (reported === 0) continue;

      const baseline = measures[0] ?? null;
      const values: CompareCell[] = measures.map((measure, index) => {
        const comparable =
          index > 0 && measure !== null && baseline !== null && measure.numeric !== null && baseline.numeric !== null;
        return {
          text: measure?.text ?? null,
          numeric: measure?.numeric ?? null,
          href: measure?.href ?? null,
          best: false,
          delta: comparable ? formatDelta(spec.delta, (measure.numeric as number) - (baseline.numeric as number), dict) : null
        };
      });

      const row: CompareRow = {
        key: spec.key,
        label: t(dict, spec.labelKey),
        hint: spec.hintKey ? t(dict, spec.hintKey) : null,
        direction: spec.direction,
        reported,
        values
      };

      for (const index of bestIndexes(row)) row.values[index].best = true;
      rows.push(row);
    }

    if (rows.length === 0) continue;

    const reported = models.filter((_, index) => rows.some((row) => row.values[index].text !== null)).length;
    groups.push({ key: group.key, title: t(dict, group.titleKey), reported, rows });
  }

  return groups;
}

export function allRows(groups: CompareGroup[]): CompareRow[] {
  return groups.flatMap((group) => group.rows);
}

/**
 * The three widest *printed* gaps against the first column. Every number here is
 * also printed in a row, and a gap under 10 % is noise on a sheet this size.
 */
export function topDifferences(groups: CompareGroup[], limit = 3): CompareDifference[] {
  const found: Array<CompareDifference & { gap: number }> = [];

  for (const row of allRows(groups)) {
    if (!row.direction || row.values.length < 2) continue;
    const baseline = row.values[0].numeric;
    if (baseline === null || !Number.isFinite(baseline) || baseline <= 0) continue;

    for (let index = 1; index < row.values.length; index += 1) {
      const value = row.values[index].numeric;
      if (value === null || !Number.isFinite(value) || value <= 0) continue;
      const high = Math.max(baseline, value);
      const low = Math.min(baseline, value);
      const ratio = high / low;
      if (ratio < 1.1) continue;
      found.push({
        key: `${row.key}:${index}`,
        label: row.label,
        left: row.values[0].text ?? "",
        right: row.values[index].text ?? "",
        ratio: `${ratio.toFixed(1)}×`,
        gap: ratio
      });
    }
  }

  return found
    .sort((a, b) => b.gap - a.gap)
    .slice(0, limit)
    .map((item) => ({ key: item.key, label: item.label, left: item.left, right: item.right, ratio: item.ratio }));
}

/**
 * One pair per category, preferring categories where both models carry params and
 * a VRAM estimate so the FIT rows are not empty - the sheet's own lesson, applied
 * to its suggestions.
 */
export function suggestPairs(pool: ClassifiedModel[], limit = 3): Array<{ category: string; models: ClassifiedModel[] }> {
  const byCategory = new Map<string, ClassifiedModel[]>();
  for (const model of pool) {
    const list = byCategory.get(model.primaryCategory) ?? [];
    list.push(model);
    byCategory.set(model.primaryCategory, list);
  }

  const pairs: Array<{ category: string; models: ClassifiedModel[] }> = [];
  for (const [category, models] of byCategory) {
    const specced = models.filter((model) => model.paramsTotal !== null && model.vramEstGb !== null);
    const candidates = specced.length >= 2 ? specced : models;
    if (candidates.length < 2) continue;
    pairs.push({ category, models: [candidates[0], candidates[1]] });
  }

  return pairs
    .sort(
      (a, b) =>
        b.models[0].downloads + b.models[1].downloads - (a.models[0].downloads + a.models[1].downloads)
    )
    .slice(0, limit);
}
