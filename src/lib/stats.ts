import type { ClassifiedModel } from "./model.ts";

/**
 * The stats board: one read of the snapshot, every number the Data Desk prints.
 *
 * Why this module exists (docs/en/STATS-PLAN.md §1, measured 2026-10-20 on
 * 1 544 models):
 *
 *  - `firstSeenAt` spans **3 days**, so the "window" on `/stats` used to return
 *    606 for 7, 30, 90 and 180 days alike. `createdAt` spans **49 days** and is
 *    the only axis with daily resolution - hence two named axes: `tracked`
 *    (first seen by Radar, the feed's own axis) and `created` (the HF repo date).
 *  - 8 categories but 7 palette entries painted the smallest slice with the
 *    largest one's colour, so the fold lives here (`foldSlices`) rather than in
 *    the chart.
 *  - the page called `filterModels()` twice and the desk nav ten times per
 *    request; this walks the snapshot once.
 *
 * Everything is pure and takes the snapshot's own clock (`generatedAt`), so a
 * cached page cannot print a bucket the snapshot never had and the tests are
 * deterministic.
 */

const DAY_MS = 86_400_000;

export interface StatsSnapshot {
  generatedAt?: string | null;
  models: ClassifiedModel[];
  news?: Array<{ kind: string; publishedAt: string }>;
}

export interface StatsOptions {
  windowDays: number;
  gate: "passed" | "all";
  /** Overrides `snapshot.generatedAt`; the tests use it to pin the window. */
  now?: string | null;
}

export interface StatsRow {
  category: string;
  /** Rows in the current view (window + gate). */
  count: number;
  /** `count / totals.inView`. */
  share: number;
  /** Over in-view rows with `downloads > 0`; null when there are none. */
  medianDownloads: number | null;
  /** Gate-independent, window-scoped - the gate panel (§5) reads these. */
  tracked: number;
  passed: number;
  passRate: number;
}

export type GateReasonKey = "downloads" | "likes" | "org" | "samples" | "failed";

export interface GateBreakdown extends Record<GateReasonKey, number> {
  /** Gated repos, kept apart so the segments sum to every tracked row. */
  gated: number;
}

export interface CadencePoint {
  date: string;
  /** Repos created that day (`createdAt`), gated ones included. */
  created: number;
  /** Of those, how many pass the gate today. */
  passed: number;
}

export interface TrackingPoint {
  date: string;
  count: number;
}

export interface RunnerRow {
  runner: string;
  /** Models carrying this tag inside the window (gate-independent, gated off). */
  inWindow: number;
  /** Models carrying this tag in the current view. */
  inView: number;
}

export interface WirePoint {
  date: string;
  total: number;
  kinds: Record<string, number>;
}

export interface StatsBoard {
  windowDays: number;
  gate: "passed" | "all";
  generatedAt: string | null;
  totals: {
    inView: number;
    /** Gate-independent row count in the window, gated repos excluded. */
    tracked: number;
    /** Of `tracked`, how many pass the gate. */
    passed: number;
    gated: number;
    /** passed / tracked, in [0, 1]. */
    passRate: number;
    medianDownloads: number | null;
    withRunner: number;
    top: { category: string; count: number } | null;
  };
  categories: StatsRow[];
  gateReasons: GateBreakdown;
  cadence: CadencePoint[];
  tracking: TrackingPoint[];
  runners: RunnerRow[];
  wire: WirePoint[];
}

export function dayOf(iso: string | null | undefined): string {
  return typeof iso === "string" ? iso.slice(0, 10) : "";
}

function clockOf(nowIso: string | null | undefined): number {
  const ms = nowIso ? Date.parse(nowIso) : NaN;
  return Number.isFinite(ms) ? ms : Date.now();
}

/** Same rule as `store.withinWindow`, but measured against the snapshot clock. */
function withinWindow(iso: string | null | undefined, days: number, endMs: number): boolean {
  const ms = iso ? Date.parse(iso) : NaN;
  return Number.isFinite(ms) && endMs - ms <= days * DAY_MS;
}

/**
 * Median of a download list, rounded to a whole download. Null on an empty list
 * - never 0: "no row has downloads" and "the median is zero" are different facts
 * and the table prints them differently.
 */
export function medianOf(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(median);
}

/**
 * Zero-filled daily buckets ending at `endIso`.
 *
 * `getDailySeries` used to emit only the days that had rows, so a 30-day window
 * holding 3 days of data drew a continuous 3-point line and the 6-day ingest
 * hole between 14 and 20 Oct was invisible (measured on the live snapshot). An
 * empty day is now a bucket with zero, so the chart can print it as empty.
 */
export function fillDaily<T extends { date: string }>(
  rows: T[],
  days: number,
  endIso: string | null | undefined,
  zero: (_date: string) => T
): T[] {
  const count = Math.max(1, Math.round(days));
  const endMs = Math.floor(clockOf(endIso) / DAY_MS) * DAY_MS;
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const out: T[] = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const date = new Date(endMs - back * DAY_MS).toISOString().slice(0, 10);
    out.push(byDate.get(date) ?? zero(date));
  }
  return out;
}

/**
 * Top `keep` rows plus one folded "other" slice, so no two visible slices can
 * share a palette colour (the donut has 7 tokens and the snapshot has 9
 * categories). `members` names what was folded in, because a bar labelled
 * "Other" that hides which categories it holds is exactly the kind of number
 * this project keeps removing.
 */
export interface FoldedSlice extends StatsRow {
  members?: string[];
}

export const FOLDED_CATEGORY = "__other";

export function foldSlices(rows: StatsRow[], keep: number): FoldedSlice[] {
  const limit = Math.max(1, Math.floor(keep));
  if (rows.length <= limit) return rows;

  const head: FoldedSlice[] = rows.slice(0, limit);
  const tail = rows.slice(limit);
  const sum = (pick: (_row: StatsRow) => number) => tail.reduce((total, row) => total + pick(row), 0);
  const tracked = sum((row) => row.tracked);
  const passed = sum((row) => row.passed);

  return [
    ...head,
    {
      category: FOLDED_CATEGORY,
      count: sum((row) => row.count),
      share: sum((row) => row.share),
      /* A median over a union cannot be derived from the parts' medians, so it
         is not printed rather than printed wrong. */
      medianDownloads: null,
      tracked,
      passed,
      passRate: tracked > 0 ? passed / tracked : 0,
      members: tail.map((row) => row.category)
    }
  ];
}

interface CategoryAccumulator {
  tracked: number;
  passed: number;
  count: number;
  downloads: number[];
}

export function buildStatsBoard(snapshot: StatsSnapshot, options: StatsOptions): StatsBoard {
  const windowDays = Math.max(1, Math.round(options.windowDays));
  const endMs = clockOf(options.now ?? snapshot.generatedAt);
  const gate = options.gate;

  const models = snapshot.models.filter((model) => withinWindow(model.firstSeenAt, windowDays, endMs));

  const rows = new Map<string, CategoryAccumulator>();
  const gateReasons: GateBreakdown = { downloads: 0, likes: 0, org: 0, samples: 0, failed: 0, gated: 0 };
  const viewDownloads: number[] = [];
  let tracked = 0;
  let gated = 0;
  let passed = 0;
  let inView = 0;
  let withRunner = 0;

  for (const model of models) {
    const row = rows.get(model.primaryCategory) ?? { tracked: 0, passed: 0, count: 0, downloads: [] };
    rows.set(model.primaryCategory, row);

    if (model.gated) {
      /* Gated repos never enter the feed (decision 11) and are not "tracked"
         rows either; they are counted once, in their own segment. `gateReason`
         says "failed" for them, which is why they must not fall through: that
         would make the segments sum to more than the snapshot. */
      gated += 1;
      gateReasons.gated += 1;
      continue;
    }

    row.tracked += 1;
    tracked += 1;
    if (model.qualityPassed) {
      row.passed += 1;
      passed += 1;
    }

    const inViewRow = gate === "all" || model.qualityPassed;
    if (inViewRow) {
      row.count += 1;
      inView += 1;
      if ((model.runners ?? []).length > 0) withRunner += 1;
      if ((model.downloads ?? 0) > 0) {
        row.downloads.push(model.downloads);
        viewDownloads.push(model.downloads);
      }
    }

    const reason = model.qualityPassed ? (model.gateReason as GateReasonKey) : "failed";
    gateReasons[reason] = (gateReasons[reason] ?? 0) + 1;
  }

  const categories: StatsRow[] = [...rows.entries()]
    .filter(([, row]) => row.tracked > 0 || row.count > 0)
    .map(([category, row]) => ({
      category,
      count: row.count,
      share: inView > 0 ? row.count / inView : 0,
      medianDownloads: medianOf(row.downloads),
      tracked: row.tracked,
      passed: row.passed,
      passRate: row.tracked > 0 ? row.passed / row.tracked : 0
    }))
    .sort((left, right) => right.count - left.count || right.tracked - left.tracked || left.category.localeCompare(right.category));

  /* The time panel: `createdAt`, not `firstSeenAt`. Gated repos are included -
     the repo exists whether or not we would show it. */
  const cadenceBuckets = new Map<string, { created: number; passed: number }>();
  for (const model of snapshot.models) {
    if (!withinWindow(model.createdAt, windowDays, endMs)) continue;
    const date = dayOf(model.createdAt);
    if (!date) continue;
    const bucket = cadenceBuckets.get(date) ?? { created: 0, passed: 0 };
    bucket.created += 1;
    if (model.qualityPassed) bucket.passed += 1;
    cadenceBuckets.set(date, bucket);
  }
  const cadence = fillDaily(
    [...cadenceBuckets.entries()].map(([date, bucket]) => ({ date, ...bucket })),
    windowDays,
    options.now ?? snapshot.generatedAt,
    (date) => ({ date, created: 0, passed: 0 })
  );

  /* Sparse and deliberately not windowed: it exists so the method note can say
     when tracking began, and it is never drawn as a chart. */
  const trackingBuckets = new Map<string, number>();
  for (const model of snapshot.models) {
    const date = dayOf(model.firstSeenAt);
    if (!date) continue;
    trackingBuckets.set(date, (trackingBuckets.get(date) ?? 0) + 1);
  }
  const tracking: TrackingPoint[] = [...trackingBuckets.entries()]
    .map(([date, count]) => ({ date, count }))
    .sort((left, right) => left.date.localeCompare(right.date));

  const runnerBuckets = new Map<string, { inWindow: number; inView: number }>();
  for (const model of models) {
    if (model.gated) continue;
    const inViewRow = gate === "all" || model.qualityPassed;
    for (const runner of model.runners ?? []) {
      const row = runnerBuckets.get(runner) ?? { inWindow: 0, inView: 0 };
      row.inWindow += 1;
      if (inViewRow) row.inView += 1;
      runnerBuckets.set(runner, row);
    }
  }
  const runners: RunnerRow[] = [...runnerBuckets.entries()]
    .map(([runner, row]) => ({ runner, ...row }))
    .sort((left, right) => right.inView - left.inView || right.inWindow - left.inWindow || left.runner.localeCompare(right.runner));

  const wireBuckets = new Map<string, { total: number; kinds: Record<string, number> }>();
  for (const item of snapshot.news ?? []) {
    if (!withinWindow(item.publishedAt, windowDays, endMs)) continue;
    const date = dayOf(item.publishedAt);
    if (!date) continue;
    const bucket = wireBuckets.get(date) ?? { total: 0, kinds: {} };
    bucket.total += 1;
    bucket.kinds[item.kind] = (bucket.kinds[item.kind] ?? 0) + 1;
    wireBuckets.set(date, bucket);
  }
  const wire = fillDaily(
    [...wireBuckets.entries()].map(([date, bucket]) => ({ date, ...bucket })),
    windowDays,
    options.now ?? snapshot.generatedAt,
    (date) => ({ date, total: 0, kinds: {} })
  );

  const top = categories.find((row) => row.count > 0) ?? null;

  return {
    windowDays,
    gate,
    generatedAt: snapshot.generatedAt ?? null,
    totals: {
      inView,
      tracked,
      passed,
      gated,
      passRate: tracked > 0 ? passed / tracked : 0,
      medianDownloads: medianOf(viewDownloads),
      withRunner,
      top: top ? { category: top.category, count: top.count } : null
    },
    categories,
    gateReasons,
    cadence,
    tracking,
    runners,
    wire
  };
}

/** The board a page renders when there is no snapshot at all. */
export function emptyStatsBoard(windowDays: number, gate: "passed" | "all"): StatsBoard {
  return {
    windowDays,
    gate,
    generatedAt: null,
    totals: { inView: 0, tracked: 0, passed: 0, gated: 0, passRate: 0, medianDownloads: null, withRunner: 0, top: null },
    categories: [],
    gateReasons: { downloads: 0, likes: 0, org: 0, samples: 0, failed: 0, gated: 0 },
    cadence: fillDaily<CadencePoint>([], windowDays, null, (date) => ({ date, created: 0, passed: 0 })),
    tracking: [],
    runners: [],
    wire: fillDaily<WirePoint>([], windowDays, null, (date) => ({ date, total: 0, kinds: {} }))
  };
}
