import type { ClassifiedModel } from "./model.ts";

/**
 * Growth, measured - not guessed.
 *
 * `downloads` in the snapshot is a point-in-time total, so nothing in the data
 * says how much of it arrived *inside the window*: the snapshot keeps no history.
 * `trendingScore` cannot fill the gap either - it is `null` on every model in the
 * served snapshot (measured 1 633/1 633), which is why `lib/store.ts` derives its
 * `trending` sort from likes and downloads instead of trusting the field.
 *
 * `downloadsAtFirstSeen` closes the gap honestly: the ingest stores the download
 * count **on the run that first saw the model**, so a later subtraction is a real
 * in-window delta rather than a labelled total. The field can only exist for
 * models first seen after that change, so the UI must treat `null` as the normal
 * case - hence `growthCoverage`/`hasGrowthSignal` instead of a bare subtraction.
 */
export function growthOf(model: ClassifiedModel): number | null {
  const base = model.downloadsAtFirstSeen;
  if (typeof base !== "number" || !Number.isFinite(base)) return null;
  const growth = (model.downloads ?? 0) - base;
  /* A negative delta is a re-count on the Hub, not negative growth. */
  return growth >= 0 ? growth : null;
}

/** Share of rows that can measure growth at all, in [0, 1]. */
export function growthCoverage(models: ClassifiedModel[]): number {
  if (models.length === 0) return 0;
  const measured = models.filter((model) => growthOf(model) !== null).length;
  return measured / models.length;
}

/** Below this share the column is mostly empty, so the band prints totals instead. */
export const GROWTH_COVERAGE_GATE = 0.6;

/**
 * Whether a band should print `+Δ` at all. Both conditions are required: enough
 * coverage (otherwise the column is a lie by omission) and enough rows for a
 * share to mean anything.
 */
export function hasGrowthSignal(models: ClassifiedModel[]): boolean {
  return models.length >= 4 && growthCoverage(models) >= GROWTH_COVERAGE_GATE;
}

/** "+119k" / "0" - what the band prints when `hasGrowthSignal` is true. */
export function formatGrowth(value: number): string {
  if (value >= 1_000_000) return `+${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `+${(value / 1_000).toFixed(1)}k`;
  return `+${value}`;
}
