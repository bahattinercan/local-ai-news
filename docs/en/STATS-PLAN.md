# Stats page v2 — "the Data Desk"

> Turkish mirror: [docs/tr/STATS-PLAN.md](../tr/STATS-PLAN.md)
> Status: **implemented** 2026-10-20 (§15 records what landed, the deviations and the measured results). Written against the snapshot the site actually serves (`generatedAt 2026-10-20T12:17:46Z`, **1 544 models / 210 news**), the running dev server, and a headless-Chrome measurement of the old page.
> Supersedes the `/stats` row of [DESIGN-V3.md](DESIGN-V3.md) §7.1 ("restyle of `ui/Charts.tsx` colours/axes"). The design language of V3 stays as it is — this plan changes **what the page measures**, not how the site looks.
> Evidence: `.shots/live-snapshot.json` (`npx tsx scripts/fetch-snapshot.ts`), `.shots/measure-stats-page.mjs` (CDP probe), `.shots/before-stats-390.png`, and the curl transcripts quoted inline.

---

## 0. Summary

Today `/stats` is three panels (bars, donut, line) over **one** dimension (category counts) plus a trend chart that measures our own cron. Measured on the live snapshot: the *Window* control returns the same number for 7, 30, 90 and 180 days (**606** every time), the trend chart has **three points**, **zero** axis labels, and its 30-day window is captioned "3 days"; the donut has **8 arcs** but **7** colours, so the smallest category is painted the same rose as the largest; and the page authors **0 links**, so no number on it can be opened.

The plan turns it into the desk a data page should be:

1. **Two time axes, named out loud** — `tracked` (first seen by Radar) and `created` (Hugging Face repo date). The second is the only one with daily resolution today (49 distinct days vs 3), so the time series moves to it.
2. **Every number gets a verb and a link** — each panel states what it counts (`in view`, `tracked`, `created`, `passes`) and opens the filtered list that produced it.
3. **The gate stops being invisible** — the page shows what the filter keeps and hides (`606 of 1 544`; passes by downloads 570 / likes 36; robotics 0 of 111).
4. **Charts that can be read at 390 px** — bars become HTML (real text, real 11 px labels), the donut folds to top 6 + *Other*, and missing days are printed as missing days.

---

## 1. What the page measures today (measured, not assumed)

| # | Measurement | Value | Command |
|---|---|---|---|
| 1 | Served snapshot | **1 544** models · 210 news · `2026-10-20T12:17:46Z` | `npx tsx scripts/fetch-snapshot.ts` |
| 2 | **The window is inert** | `days=7/30/90/180` → **606** gate-passed rows, **1 538** with `gate=all` — identical every time | `curl "localhost:3000/api/stats?days=$d"` |
| 3 | Distinct `firstSeenAt` days | **3** (13 Oct ×343, 14 Oct ×572, 20 Oct ×629). 15–19 Oct are missing | live snapshot |
| 4 | Distinct `createdAt` days | **49** (21 Aug → 20 Oct): 272 in 24 h, 773 in 7 d, 1 491 in 30 d, 1 544 in 90 d | live snapshot |
| 5 | The trend chart | **3 points** on a 1 200-unit viewBox, **0 `<text>` nodes**, caption "3 days" inside a 30-day window | `.shots/measure-stats-page.mjs` |
| 6 | Rendered sizes today | panels **384 / 384 / 290 px** = 1 007 px main at 1440; 1 228 px at 390; the series SVG is **1 248×208** at 1440 and **343×57** at 390 | same probe |
| 7 | Links authored by the page | **0**: the 16 anchors inside `<main>` are the desk nav (15) plus the glossary `?` on the quality gate | `grep -c Link page.tsx` |
| 8 | Donut | **8 arcs, 7 palette entries** → slice 8 (Language / LLM) repeats slice 1 (Embedding) — visible in the owner's screenshot | `Charts.tsx` + probe |
| 9 | Gate | passed **606 / 1 544 (39.2 %)**, gated 6, failed 938 (the 6 gated repos are counted inside `failed`); passes = `downloads ≥ 50` **570** + `likes ≥ 5` **36**; `org` / `samples` reasons occur **0** times | `src/lib/classify/gate.ts` + live |
| 10 | Nav contradicts the page | with `?gate=all` the page header prints **1 538** while the desk strip still prints **606** (Audio 234 vs 30) | `curl` + HTML scrape |
| 11 | Downloads | > 0 on **1 303 / 1 544 (84.4 %)**; p50 **38**, p90 **351**, max **119 265**; **top-1 repo = 24.0 %** of all downloads, top-10 = 53.6 % | live snapshot |
| 12 | Sparse fields | `paramsTotal` 7.0 %, `storageBytes` 30.3 %, `vramEstGb` 6.8 %, `license` 28.9 %, `cardMeta` 11.3 %, `sampleImages` 0.8 %, **`downloadsAtFirstSeen` 0.0 %** | live snapshot |
| 13 | Dense fields | `runners` non-empty **69.7 %** (9 values, transformers 668 → ExLlama 6), `gateReason` 100 %, `primaryCategory` 100 % | live snapshot |
| 14 | The wire | 210 items — paper 150, runtime 30, community 25, release 5; **23** distinct `publishedAt` days, every day 7–20 Oct covered | live snapshot |
| 15 | Pass rate by category | embedding 183/228 (80 %), vision 107/174 (61 %), coding 122/230 (53 %), video 70/165 (42 %), llm 14/51 (27 %), image 46/202 (23 %), multimodal 34/149 (23 %), audio 30/234 (13 %), **robotics 0/111 (0 %)** | live snapshot |
| 16 | Median downloads (`> 0`) | embedding 213, vision 72, coding 68, video 61, llm 32, audio 21, multimodal 20, image 19, robotics 12; whole passed set 197 | live snapshot |
| 17 | Window vocabulary | feed: `24h / 7d / 30d / 90d` (`lib/query.ts`); stats: `7 / 30 / 90 / 180` days | code |

---

## 2. Defects

Each item is something a reader can see today.

| # | Defect | Evidence |
|---|---|---|
| **D1** | **The window control does nothing.** All four options return the same 606 / 1 538 because everything is filtered by `firstSeenAt`, which spans three days. The `30d` in the title is the only claim the page makes and it is false. | #2, #3 |
| **D2** | **"Daily volume" measures our ingest runs, not the ecosystem.** 343 / 572 / 629 are batch sizes; the 6-day gap (14 → 20 Oct) is drawn as a straight line. A chart of the crawler's schedule is presented as a property of the models. | #3, #5 |
| **D3** | **No zero-fill.** `getDailySeries` emits only days with rows, so a 30-day window containing 3 days of data draws a continuous 3-point line. The reader cannot tell an empty day from a missing one. | `store.ts::getDailySeries` |
| **D4** | **The chart has no axis, no values, no units.** Measured `texts: 0` inside the SVG: no y scale, no x labels, no per-point value. The only numbers are in the caption. | #5 |
| **D5** | **Title and data disagree.** The `h1` says *Volume by category*; the panel says *Models per category* and prints **counts**. Downloads — the site's only ranking metric — appear nowhere on the page. | page.tsx |
| **D6** | **The donut reuses a colour.** 8 arcs, 7 tokens: Language / LLM is painted the same rose as Embedding / RAG. | #8 |
| **D7** | **The gate is invisible.** The page defaults to *Passed only* and never says that 606 of 1 544 (39.2 %) are shown, nor what was removed. Robotics (111 tracked, 0 passed) simply disappears from the bars — a category the nav lists. | #9, #15 |
| **D8** | **The desk strip and the page disagree.** `DeskNav` is called without `filters`, so it always counts the 7 d/gate-on view; with `?gate=all` the page says 1 538 and the strip says 606 on the same screen. | #10 |
| **D9** | **Nothing links.** 0 anchors authored by the page: a reader who learns "Audio 30" cannot get to those 30 models. | #7 |
| **D10** | **No dateline, no method.** The only freshness signal is the relative "Data refreshed 20m ago"; a page whose whole job is numbers prints neither the absolute snapshot time nor what each number counts. | `EmptyState.tsx::DataNotice` |
| **D11** | **Two panels, one number.** Counts and their shares occupy 768 px while four dimensions with 100 % coverage (gate reason, runners, creation date, the wire) are absent. | #6, #13, #14 |
| **D12** | **Print loses its scope.** `@media print` hides `form`, so the printed sheet no longer says which window or gate produced the numbers. | `globals.css` §print |

---

## 3. Decisions

| # | Decision | Why |
|---|---|---|
| **S1** | **Two named time axes.** `tracked` = `firstSeenAt` (the feed's axis, kept so category counts still equal the tab badges); `created` = `createdAt` (Hugging Face's repo date, the only daily-resolution axis). Every panel prints which one it used, in one word. | D1, D2. The feed contract cannot change, and the crawler's schedule is not the subject of the page. |
| **S2** | **Inventory panels use `tracked`; the time series uses `created`.** The time panel's note says so explicitly, and prints the difference ("1 491 created in the window" next to "606 in view"), instead of hiding two axes behind one word "volume". | D2, D5. One honest sentence beats two silently mixed axes. |
| **S3** | **One window vocabulary, shared with the feed**: `24h / 7d / 30d / 90d`, `WINDOWS` from `lib/query.ts`, URL param `?window=`. `?days=` stays as a parsed alias. `gate=all` keeps decision 9's limit (≤ 30 d) because the row links must open a feed that agrees with the number. | D1, #17. `180d` of tracking does not exist; a control with one effective value is a decoration. |
| **S4** | **The time series is HTML bars, not SVG.** One `<div>` per day, height as a percentage, axis labels as real text at 11 px, stacked `passed / failed`. | D4. A 1 200-unit viewBox scaled to 343 px renders 13 px labels at 3.7 px; text inside a stretched SVG cannot be fixed by making it bigger. |
| **S5** | **Missing days are printed, not interpolated.** Zero-fill every window; an empty day is a 2 px stub in `--rule`, with the number in its `title`. | D2, D3. |
| **S6** | **Top 6 + *Other*, colours assigned by rank.** The donut's arcs and the table's swatches share one mapping; *Other* is `--muted` and its legend row names its members. | D6, #8. |
| **S7** | **The gate gets its own panel, independent of the control.** "What the gate keeps" is always computed on all rows in the window, so what the filter hides is visible even when the filter is on. | D7, #9, #15. Otherwise the page can only explain itself in one of its two states. |
| **S8** | **Every number is a link to the view that produced it.** Category rows → `/c/[category]?window=…&gate=…`; runner rows → `/models?runner=…`. No number is a dead end. | D9. |
| **S9** | **Sparse data is stated, never charted.** Any panel whose field is under 40 % coverage is one sentence or nothing (see §7). `downloadsAtFirstSeen` (0.0 %) stays out until `heat.ts`'s 60 % gate passes. | #12. A bar chart over 7 % coverage is a picture of our parser, not of the ecosystem. |
| **S10** | **The page prints its own method.** One small-print paragraph: snapshot time, cache cadence, both axes, the gate rule read from `GATE_THRESHOLDS`, and what is deliberately absent. | D10, D12. It is also what lets the page skip "live" and "trending" language. |

---

## 4. The page

```
STATS · Stats (kicker)
Model statistics                                            Snapshot 20 Oct 2026 · 12:17 UTC
What the radar tracks, what the gate keeps, and when it was created.
────────────────────────────────────────────────────────────────────────────────────────
WINDOW [30d ▾]   QUALITY GATE (?) [Passed only ▾]   [Apply]

THIS EDITION
MODELS IN VIEW  PASS THE GATE  LARGEST CATEGORY   WITH A RUNNER TAG
606            606 · 39.2%     Embedding / RAG    571 · 94%
of 1 544       (?)             183 · 30%          (?)
────────────────────────────────────────────────────────────────────────────────────────
MODELS BY CATEGORY  ●                                          CATEGORY SHARE
Embedding / RAG  ██████████████ 183   median 213               ◕  Embedding / RAG 183 · 30%
Coding           █████████ 122        median 68                 ·  Coding         122 · 20%
Vision / CV      ████████ 107         median 72                 ·  Vision / CV    107 · 18%
Video            █████ 70             median 61                 ·  Video           70 · 12%
Image            ███ 46               median 19                 ·  Image           46 · 8%
Multimodal       ██ 34                median 20                 ·  Multimodal      34 · 6%
Other (audio, llm) ██ 44              median 26                 ·  Other           44 · 7%
note: counts are models first seen by Radar in the window, gate applied;
      a label opens that category's feed.
────────────────────────────────────────────────────────────────────────────────────────
CREATED PER DAY                                        1 491 repos · 606 pass today
   235 ┤                    ▇
       │              ▇  ▇  ▇  ▇
     0 ┴───────────────────────────────────
        21 Sep     28 Sep      5 Oct    12 Oct    20 Oct
note: Hugging Face `createdAt` — repo creation, not first sighting.
      Bars split by whether the repo passes the gate today.
────────────────────────────────────────────────────────────────────────────────────────
WHAT THE GATE KEEPS                    │  WHERE IT RUNS
[■■■■■■■■■■■■■■■■■■■■■□□□□□□□□□□□]      │  transformers  ████████ 668  →
downloads ≥50 570 · likes ≥5 36 ·      │  ComfyUI       ███ 227     →
failed 932 · gated 6                   │  llama.cpp     ██ 205      →
                                       │  ONNX → MLX → Core ML → …
Embedding 80% ████████                 │  note: a model can carry several
Audio 13% █▁                           │        tags; 30% carry none.
Robotics 0% ▁                          │
────────────────────────────────────────────────────────────────────────────────────────
THE WIRE                                     paper 150 · runtime 30 · community 25 · release 5
  30 ┤              ▇     ▇
   0 ┴────────────────────────────
note: news `publishedAt`, split by kind; refreshed every 10 minutes.
────────────────────────────────────────────────────────────────────────────────────────
METHOD  Snapshot 20 Oct 2026 12:17 UTC · cache 15 min · window and gate as set above ·
        "tracked" = first seen by Radar (13 Oct →) · "created" = HF repo date ·
        gate passes at ≥50 downloads or ≥5 likes (or a curated org / sample widget:
        0 today) · no in-window download history exists, so no growth column.
```

### 4.1 Section specs

| § | Section | Data | Notes / links | Empty state |
|---|---|---|---|---|
| 0 | Strap line | `PageHeader` + absolute dateline in `aside` | aside: `Snapshot 20 Oct 2026 · 12:17 UTC` (absolute, not "3h ago") | — |
| 1 | This edition (4 figures) | `totals.inView`, `passRate`, `top`, `withRunner` | labels carry the scope (`of 1 544`, `30d · passed only`); `Term` for quality-gate and runner | — |
| 2 | Models by category | `categories[].count` (in view) + `medianDownloads` | row = link to `/c/x?window&gate`; bar is `count/max`; median printed only when > 0 | "No model passes the gate in this window" + a link to the gate-off view |
| 3 | Category share | top 6 + `Other` from `categories[].share` | same swatch as §2; *Other* names its members | hidden when < 2 categories |
| 4 | Created per day | `cadence[]` zero-filled, `created` + `passed` | y ticks 0 / mid / max, 5 x labels, `<title>` per bar, `<details>` numbers table | "No repos created in this window" (never hit today: 272 in 24 h) |
| 5 | What the gate keeps | `gate.byReason`, `categories[].tracked/passed/passRate` (gate-independent), `GATE_THRESHOLDS` | 100 % stacked bar + 9-row rate table; rows link with `gate=all` | — |
| 6 | Where it runs | `runners[]` (count + in-view count) | rows link to `/models?runner=…`; note the 69.7 % coverage and multi-tag | "No runner tags in this window" |
| 7 | The wire (P4) | `wire[]` zero-filled by `kind` | links to `/news`, `/research`; states the 10-minute cadence | hidden when 0 items |
| 8 | Method | the numbers above | small print, `.section-note` size; prints | — |

Vertical budget: ≤ 1 700 px at 1440 (today 1 007 px for 3 panels), ≤ 2 400 px at 390. §2 + §3 sit in one `.stats-grid` row; §5 + §6 in a second one.

---

## 5. Data layer

New pure module `src/lib/stats.ts` (so the board is testable without the filesystem):

```ts
export interface StatsRow {
  category: string;
  /** Rows in the current view (window + gate). */
  count: number;
  share: number;                 // count / total in view
  medianDownloads: number | null;// over rows with downloads > 0, else null
  /** Gate-independent, window-scoped — §5 only. */
  tracked: number;
  passed: number;
  passRate: number;
}

export interface StatsBoard {
  windowDays: number;
  gate: "passed" | "all";
  generatedAt: string | null;
  totals: {
    inView: number; tracked: number; gated: number;
    passRate: number; medianDownloads: number | null;
    withRunner: number;
    top: { category: string; count: number } | null;
  };
  categories: StatsRow[];
  gateReasons: Record<"downloads" | "likes" | "org" | "samples" | "failed", number> & { gated: number };
  cadence: Array<{ date: string; created: number; passed: number }>;   // zero-filled
  tracking: Array<{ date: string; count: number }>;                    // firstSeen, sparse, for the note
  runners: Array<{ runner: string; models: number; inView: number }>;
  wire: Array<{ date: string; paper: number; runtime: number; community: number; release: number }>;
}

export function buildStatsBoard(snapshot: StatsSnapshot, options: StatsOptions): StatsBoard;
export function fillDaily<T>(rows: Array<{ date: string } & T>, days: number, endIso: string): Array<{ date: string } & T>;
export function medianOf(values: number[]): number | null;
export function foldSlices(rows: StatsRow[], keep: number): Array<StatsRow & { members?: string[] }>;
```

- `buildStatsBoard` walks the snapshot **once** (today the page calls `filterModels` twice and `DeskNav → getCategoryCounts` runs it ten more times on every request).
- `getStatsBoard(days, options)` in `store.ts` = `loadSnapshot()` + `buildStatsBoard` (keeps the single 15-minute cache read).
- `getStats` / `getDailySeries` stay as thin wrappers so `gate.test.ts`/existing imports do not break; `getDailySeries` gains zero-fill (that alone fixes D3 everywhere).
- The window filter for the `created` axis is `createdAt`, applied **inside** `buildStatsBoard` for `cadence` only. Everything else keeps `withinWindow(firstSeenAt)` so `/stats` and the feed cannot drift.
- `endIso` = `snapshot.generatedAt`, not `Date.now()` — a cached page must not print a bucket the snapshot never had (and tests become deterministic).

`src/lib/query.ts` gains `statsQuerySchema`:

```ts
window: z.enum(WINDOWS).catch("30d")   // stats defaults to 30d, the feed to 7d
days:   z.coerce.number().positive().optional()   // legacy alias -> window
gate:   z.enum(["passed", "all"]).catch("passed")
```

then `normalizeStatsQuery()` calls `normalizeFeedQuery()` so decision 9 (gate `all` only ≤ 30 d) cannot be re-implemented differently here.

---

## 6. Components

| File | Change |
|---|---|
| `src/app/[locale]/stats/page.tsx` | rewritten from `getStatsBoard`; one `<form method="get">`; `DeskNav` now receives `filters` (fixes D8) |
| `src/components/ui/Charts.tsx` | `BarChart` → deleted (only caller is this page); `TrendChart` → deleted; `Donut` gains `foldSlices`, a `swatches` map, per-arc `<title>`, and `--muted` for *Other* |
| `src/components/ui/DailyBars.tsx` | **new** — HTML/CSS stacked bars, y/x labels as text, `<details>` numbers table, `role="img"` + summary; no SVG |
| `src/components/ui/RateBar.tsx` or reuse `Meter` | 0–100 % bar for §5 (`Meter` is log-scaled for downloads — do **not** reuse it) |
| `src/components/ui/Stat.tsx` | unchanged; §1 uses four of them in a ruled band |
| `src/app/globals.css` | `.stats-grid` unchanged; add `.bars-*` rules (grid of N columns, `align-items: end`), and `@media print { details > * { display: block } }` so §4 prints |
| `src/i18n/dictionaries/{en,tr}.json` | +~30 keys (below), `stats.trend`→`stats.cadence`, `stats.bars`→`stats.categories`; parity 175 → ~205 |

New keys: `stats.lede`, `stats.dateline`, `stats.inView`, `stats.inViewHint`, `stats.passRate`, `stats.passRateHint`, `stats.top`, `stats.withRunner`, `stats.withRunnerHint`, `stats.categories`, `stats.categoriesNote`, `stats.share`, `stats.shareNote`, `stats.other`, `stats.otherMembers`, `stats.cadence`, `stats.cadenceNote`, `stats.created`, `stats.cadenceTotal`, `stats.gateTitle`, `stats.gateNote`, `stats.gateByDownloads`, `stats.gateByLikes`, `stats.gateFailed`, `stats.gated`, `stats.passRateCol`, `stats.trackedCol`, `stats.passedCol`, `stats.medianDownloads`, `stats.runnersTitle`, `stats.runnersNote`, `stats.wireTitle`, `stats.wireNote`, `stats.methodTitle`, `stats.methodBody`, `stats.trackingSince`, `stats.all`.

---

## 7. What this page will NOT show (and the numbers behind that)

| Candidate | Coverage today | Verdict |
|---|---|---|
| Size / params distribution | `paramsTotal` **7.0 %**, `storageBytes` 30.3 % | one sentence in the method note; no chart |
| VRAM buckets | `vramEstGb` 6.8 % | same |
| Licence mix | `license` 28.9 % (1 098 of 1 544 null) | one sentence in the method note |
| Languages / base models | `cardMeta` 11.3 % (languages 5.1 %) | not on the page |
| Growth (`+Δ downloads`) | `downloadsAtFirstSeen` **0.0 %** | **no column**; unblocked by `heat.ts`'s 60 % gate, not by this plan |
| Download *share* by category | sum is dominated by one repo (24 % of all downloads) | median only, with the definition printed |
| "Trending" | `trendingScore` null on 1 544/1 544 | the word stays out |

---

## 8. API

`/api/stats` becomes one call returning the board; the page and the API must never disagree:

```jsonc
GET /api/stats?window=30d&gate=passed
{
  "window": "30d", "windowDays": 30, "gate": "passed",
  "generatedAt": "2026-10-20T12:17:46.589Z",
  "totals": { "inView": 606, "tracked": 1538, "gated": 6, "passRate": 0.392,
              "medianDownloads": 197, "withRunner": 571,
              "top": { "category": "embedding", "count": 183 } },
  "categories": [ { "category": "embedding", "count": 183, "share": 0.302,
                    "medianDownloads": 213, "tracked": 228, "passed": 183, "passRate": 0.803 } ],
  "gateReasons": { "downloads": 570, "likes": 36, "org": 0, "samples": 0, "failed": 932, "gated": 6 },
  "cadence": [ { "date": "2026-10-20", "created": 111, "passed": 40 } ],
  "tracking": [ { "date": "2026-10-13", "count": 343 } ],
  "runners": [ { "runner": "transformers", "models": 668, "inView": 6 } ],
  "wire": [ { "date": "2026-10-20", "paper": 20, "runtime": 3, "community": 2, "release": 1 } ]
}
```

`stats` and `series` (the old keys) are **removed**: `grep` finds no consumer outside `docs/*/PLAN.md`, which this plan updates. `Cache-Control: public, s-maxage=900` stays.

---

## 9. Tests (`tests/stats.test.ts`, node:test, fixture snapshot)

1. `fillDaily` returns exactly `days` buckets, ascending, unique, zero-filled, and preserves the input sum.
2. `fillDaily` uses `endIso` (snapshot `generatedAt`), not the wall clock — a fixture dated 2026-01-10 yields buckets ending 2026-01-10.
3. `buildStatsBoard` sums: `Σ categories.tracked === totals.tracked`; `Σ categories.passed === totals.passed`; `Σ share ≈ 1`; `Σ gateReasons === tracked + gated`.
4. `cadence` reads `createdAt` **not** `firstSeenAt` (fixture where the two deliberately differ — this is the D2 regression).
5. `cadence` covers 30 buckets for a 30-day window when the fixture only has 3 days of data, and each bucket's `created ≥ passed`.
6. A 0-passed category appears in `categories` (for §5) but not in the folded donut slices.
7. `medianOf`: odd, even, ignores zeros, `null` on empty; `categories[].medianDownloads` is `null` when no row has downloads > 0.
8. `foldSlices(rows, 6)`: total preserved, `Other.members` lists the folded keys, ≤ 7 output slices.
9. `normalizeStatsQuery`: `?days=30` ≡ `?window=30d`; `?window=abc` → `30d`; `?gate=all&window=90d` → `passed` (decision 9), `?gate=all&window=30d` → `all`.
10. `runners`: every count ≤ `inView` + non-view; `Σ runners.models ≥` tagged rows (multi-tag), never less.

UI parity is asserted by a probe, not a unit test (`scripts/` style): the number printed in §2's header equals `Σ rows`; §4 has one bar per day of the window; §2 authors ≥ 9 `/c/` links.

---

## 10. Phases

| Phase | Scope | Acceptance (measurable) |
|---|---|---|
| **P0** | `lib/stats.ts` + zero-fill + `statsQuerySchema` + tests; `/api/stats` new shape; page still renders the old panels from the new board | `npm test` green (10 new); `curl "…/api/stats?window=30d"` returns `totals.inView === 606` and 30 `cadence` buckets; `npm run lint && npm run typecheck` clean |
| **P1** | Dateline, §1 figures, §2 table, §3 donut fold, links, `DeskNav filters` | with `?gate=all`: the strip prints **1 538** and Audio **234** (HTML scrape); §2 has ≥ 9 links to `/c/`; donut arcs ≤ 7 and no two share a colour; 0 overflow at 360/390/1440; `/tr` strings translated; print sheet shows window + gate |
| **P2** | `DailyBars` (HTML) for §4, method note, delete `TrendChart` | 30 bars at `window=30d`, 1 at `24h`; bars sum to `cadence.created`; `document.querySelectorAll('main svg text').length` no longer matters — §4 contains **0** `<svg>`; §4 height ≤ 260 px at 1440, ≤ 240 at 390; print shows all bars |
| **P3** | §5 gate panel + §6 runners | gate segments sum to 1 544; Robotics row prints 0/111 (0 %); 3 spot-checked runner links open `/models?runner=…` with a total equal to the printed count |
| **P4** (optional) | §7 wire | 30 buckets; kinds sum to `countNews({window:30})`; panel hidden when 0 |

---

## 11. Verification

```bash
npm run dev
npx tsx scripts/fetch-snapshot.ts                    # the served snapshot, measured
curl -s "localhost:3000/api/stats?window=7d"  | jq '.totals'   # 606 / 1538
curl -s "localhost:3000/api/stats?window=90d" | jq '.totals'   # same, by design
curl -s "localhost:3000/en/stats?gate=all"    | grep -c '234'   # nav agrees with the page
node .shots/measure-stats-page.mjs "http://localhost:3000/en/stats?window=30d" "1440,390"
npx tsx scripts/check-overflow.ts http://localhost:3000/tr/stats 360
npx tsx scripts/check-nav-current.ts http://localhost:3000/tr/stats
npx tsx scripts/screenshot.ts http://localhost:3000/tr/stats .shots/v4-stats-1440.png 1440 2600 light
npm test && npm run lint && npm run typecheck
```

Rules carried over from DESIGN-V2/V3: measure with desktop metrics; assert a page marker before measuring; never claim a number that the API cannot reproduce.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Six panels make the page 2.4 k px tall on a phone | §2/§5/§6 drop their third column below `sm`; §6 shows top 5 + a link; §7 is optional |
| `createdAt` read as "release date" | the note says "repo creation date, HF's own timestamp, not our first sighting"; the verb in the table is `created` |
| Window semantics change breaks bookmarks | `?days=` parsed as an alias; `?window=` canonical; no route move |
| Two axes confuse readers | one verb per panel (`in view` / `tracked` / `created` / `passes`) in the section title's note, and §8 states both |
| `gate=all` reads as a bug at 90 d (decision 9 clamps it) | §5 is gate-independent, so what the filter hides is visible at every window; the control shows *Passed only* rather than silently ignoring the URL |
| Downloads look like a quality signal | §2 prints the median with its definition (`rows with downloads > 0`), never a sum; the top-1 concentration (24 %) is stated in the method note |
| The plan's numbers go stale | every figure in §1 is reproduced by the commands in §11; the doc names the snapshot it was measured on |

Rollback: `page.tsx` is one file; `Charts.tsx` keeps `Donut`; `TrendChart`/`BarChart` are deleted only in P2, after §4 passes.

---

## 13. Open questions (owner's call)

1. **`h1`**: *Model statistics* (concrete, keeps the search term) or *The Data Desk* (matches DESIGN-V3's naming)? The plan assumes the first.
2. **Default window**: stay at 30 d (the `created` axis has 49 days) or match the feed's 7 d? The plan assumes 30 d.
3. **The donut**: keep it as the page's one "engraving" (folded to 6 + *Other*), or drop it and give §2 a share column? Keeping it is assumed.
4. **§7 the wire**: ship with P1–P3 (it is the second honest daily series and links the desks together) or defer?
5. **API break**: confirming that removing `stats`/`series` from `/api/stats` is acceptable (no code consumer found; `docs/*/PLAN.md` updated here).

---

## 14. Docs to update when this lands

- `docs/en/DESIGN-V3.md` §7.1, `/stats` row → "Data Desk per [STATS-PLAN.md]".
- `docs/en/PLAN.md` §13 route line ("per-category volume, weekly chart") and §15 API line (`GET /api/stats?days=30`).
- `docs/en/DECISIONS.md`: one entry recording **S1** (two axes) and **S3** (one window vocabulary).

---

## 15. Implementation log — 2026-10-20

> Measured after the change, on the served snapshot (`generatedAt 2026-10-20T12:17:46Z`, **1 544 models / 210 news**) with `.shots/measure-stats-page.mjs` (CDP) and `curl /api/stats`. `npm test` **133/133**, `lint` and `typecheck` clean.

| Plan item | Result (measured) |
|---|---|
| **S1/S2** two named axes | `src/lib/stats.ts` — `buildStatsBoard`, `fillDaily`, `foldSlices`, `medianOf`; `getStatsBoard()` in `store.ts` reads the snapshot once. `window=30d` → **606** in view, **1 538** tracked, 6 gated, **39.4 %** pass, median **197**, **571** with a runner tag; `cadence` 30 buckets totalling **1 491** created; `wire` 210. 10 new tests (133 total) |
| **S3** one window vocabulary | `parseStatsQuery` in `lib/query.ts`: `?window=24h/7d/30d/90d`, `?days=` as an alias (30 → 30d, 180 → 90d). `gate=all` is allowed on this aggregate surface inside 30 days via `normalizeFeedQuery(input, { aggregate: true })`; the feed's decision 9 is untouched |
| **S4/S5** HTML bars | `DailyBars.tsx`: 30 bars at 30d, 1 at 24h, 90 at 90d; the panel contains **0** `<svg>` and the cleared page **0** `<svg text>`; y ticks 235 / 118 / 0, five x labels; an empty day is a 2 px stub in `--rule`; a closed `<details>` carries the numbers |
| **S6** fold + palette | 8 or 9 categories become **6 + Other**; the donut has at most 7 arcs and *Other* takes the palette's last entry, so no two visible slices share a colour (the old 8-arc/7-colour bug) |
| **S7** gate panel | always gate-independent: downloads **570** · likes **36** · failed **932** · gated **6** = **1 544**; the per-category rate is visible at any window, robotics **0/111 (0 %)** |
| **S8** links | 18 anchors to `/c/…` (9 table rows + 9 desk items) and 9 to `/models?runner=…`; every §2 row and §6 row opens the feed that produced its number |
| **S9** sparse data | params / storage / licence / `cardMeta` / `downloadsAtFirstSeen` (0.0 %) are never charted; the method note says so |
| **S10** method | §8 prints the snapshot clock, the 15-minute cache, both axes, the gate thresholds read from `GATE_THRESHOLDS`, and why there is no growth column |
| Layout | 1440: main **2 214 px**, document 2 451; 390: document 3 734. **0 horizontal overflow** at 360 / 390 / 1440 across four states (30d passed, 30d all, `tr` 24h all, `tr` 90d all) |
| Nav | `/tr/stats` marks `İstatistik:page`; `check-nav-current.ts` passes 14 routes |
| Print | nav, forms and the `<details>` toggle drop out; axis, legends, captions and the method note stay — a 2 835 px sheet at 1 000 px wide |

### 15.1 Deviations from the plan (and why)

| Planned | Landed | Reason |
|---|---|---|
| With `?gate=all` the desk strip prints 1 538 and Audio 234 | the strip prints **606** for *All* and the gate=all counts per desk (**Audio 231**) | `getCategoryCounts()` applies decision 9 to the category-less key, so the *All* badge describes the `/models` feed it actually opens (606). The same asymmetry already exists on `/models?gate=all&category=…`; changing it would break the nav's "the badge is the number of rows this link shows" invariant. Recorded as an open item, not silently patched |
| Vertical budget ≤ 1 700 px at 1440 / ≤ 2 400 at 390 | **2 214 / 3 734** | six panels with notes; the trimming applied (bars and medians hidden below `sm`, `<details>` collapsed) recovers ~180 px, and the rest is content the page is for. Cutting a panel to hit the number would trade information for whitespace |
| Print shows the numbers table | the `<details>` is `print:hidden` | a closed `<details>` cannot be opened from CSS in Chrome 155 (`::details-content` did not respond; measured table height 0 in print media), and the summary is hidden as a control. Paper gets bars + axis + legend + caption instead of an empty box |
| `getStats` / `getDailySeries` kept as wrappers | **deleted** | after the rewrite they had no callers; a dead wrapper is the kind of unverifiable surface this project removes. `/api/stats` was reshaped in the same commit (no code consumer existed) |
| §5 rows link to their category with `gate=all` | §5 rows are **not** links | above a 30-day window the feed clamps `gate=all`, so the link would open a different set than the number counts. Every category is a link one panel above, in §2 |
| "606 of 1 544 (39.2 %)" | "606 of 1 538 (**39.4 %**)" | `tracked` excludes gated repos (they never enter the feed); the six gated rows are a segment of their own. §1's 1 544 / 938 counts them inside `failed` |
| Median downloads per category | the **view's** median | the table describes the current view, so its median is over in-view rows with `downloads > 0` (embedding 218 in view vs 213 over all rows) |

### 15.2 Real defects found while implementing (fixed here)

1. **The donut legend pushed the document 92 px past a 360 px viewport.** `min-w-[9rem]` on the legend removed the automatic min-content floor, so its rows rendered 276 px wide inside a 183 px slot (measured `docScroll` 452 vs `client` 360 with `gate=all`). Fixed with `min-w-0` on the list and the row — the same `min-width: auto` family as DESIGN-V3 §0.2 #1.
2. **`failedColor` was declared after its first use**, so every render threw `ReferenceError: Cannot access 'failedColor' before initialization` and the route answered 500. TypeScript does not flag a TDZ read inside a callback; loading the page did.
3. **The gate table was squeezed by the shared `.stats-grid`** (`1fr auto`): the Pass-rate header wrapped to two lines and the numbers crowded the bar. That row now has its own `1.25fr / 1fr` grid.
4. **§2's inline bar read as a row divider at 390 px** (a 256 px line directly under each label). It moved into its own column, hidden below `sm`.
5. **`formatNumber` compacts 1 544 to "1.5k"**, which cannot carry "606 of 1 544", so `formatCount` / `formatPercent` were added to `lib/format.ts`.

### 15.3 Open items

- **The desk strip's *All* badge under `?gate=all`** (15.1) — a nav-wide decision, not a stats-page one.
- **The ingest gap** (15–19 Oct had no runs) is still there; the cadence panel hides it because it reads `createdAt`, while the method note's "since 13 Oct" comes from the three `firstSeenAt` buckets.
- **Mobile length** (3 734 px): if the owner wants it under 2 400, the wire (§7) is the panel to drop.
