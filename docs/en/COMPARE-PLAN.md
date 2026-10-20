# Compare plan v1 — the pair sheet

> Turkish mirror: [docs/tr/COMPARE-PLAN.md](../tr/COMPARE-PLAN.md)
> Status: **implemented 2026-10-20** — §9 records what landed, the three deviations and the measured results. Written as a plan the same day.
> Measured against the live dev server, which serves the `2026-10-18` snapshot (**1 633 models tracked**, of which **606 pass the gate** — the masthead's own `1.5k models in window / 606 pass the gate`) and headless Chrome 155 over CDP. The data sample is those 606 rows: `GET /api/feed?window=7d&gate=passed&limit=100&page=1…7`. (`gate=all` is coerced to `passed` without a category — decision 9 in `lib/query.ts` — and no tracked row is older than ~7 days, since the p90 first-seen age is 6.9 days; `window=90d` therefore returns the same 606. Compare links are minted by gate-passed feed cards, so this is exactly the population the page is reached from.)
> Scope: `/[locale]/compare` only. It keeps DESIGN-V3's visual language (ruled sheet, Almanac desk) and DESIGN-V2's measurement rules; it replaces the one-line brief in DESIGN.md §5.6 ("sticky header table, per-row best value, empty state that explains") because all three of those exist and two of them are broken — and none of them is the page's real problem.
> Evidence: `.shots/plan-compare-measure.mjs` (re-runnable CDP probe), `.shots/plan-f1…f7.json` (the 606 served rows), `.shots/compare-1440.png`, `.shots/compare-390.png`, owner's screenshot 2026-10-20.

---

## 0. Summary

The page's job is one question: **"which of these two do I run?"** Today it cannot be asked.

- **You cannot add a second model.** The only compare affordance on the site is `FeedCard`'s link, which *replaces* the whole id list (`?ids=<one slug>`). The compare page itself contains zero `?ids=` links (measured: 6 links match `compare`, all of them the nav item). Comparing a second model therefore means hand-editing the URL.
- **The one URL format the page teaches does not work.** The empty state says *"put two repo ids in the address: `?ids=owner/model,owner/model`"*. `slugify()` turns `/` into `-`, so `?ids=axiomofmind/Moss-Image-base-GGUF` renders **"No models match these filters"** while `?ids=axiomofmind-Moss-Image-base-GGUF` works. The only accepted form is the 32–102-character slug, which the UI never shows anywhere.
- **The sheet is a table that squeezes instead of scrolling.** At 390 px four columns are packed into a 341 px table: the row-label column is **34 px**, the header row is **179 px** tall, cells are 11–15 px. The promised "horizontal scroll container with a visible scrollbar" (DESIGN-V2 §297) does not exist — available horizontal scroll is **0 px at every width measured**, because `w-full` + auto table layout distributes the deficit into the columns.
- **The sticky header does not stick.** `thead` computes to `position: sticky`, but its ancestor is the `overflow-x-auto` wrapper, which never scrolls vertically. Measured at 390 px: page scrolled to 362 px, header top **−31 px**.
- **Half the rows are empty most of the time and the page never says so.** `paramsTotal` exists on **17.7 %** of served rows, `vramEstGb` on **17.2 %**. A random pair is fully specced on both sides **2.9 %** of the time; at least one side is missing params **67.8 %** of the time. The page prints the same 8 rows regardless, with a bare "—".
- **Silent data loss.** Unknown ids are dropped without a word (`?ids=<slug>,garbage` → a 1-column sheet, no notice), >6 ids are truncated silently (`slice(0, 6)`), duplicates render as duplicate columns (`?ids=a,a` → two identical columns), and `?ids=` values that name a model with different case never resolve.
- **No metadata, no h1 on the empty route.** `compare/page.tsx` exports no `generateMetadata`, so every compare URL carries the site-wide title (`document.title` measured on `/tr/compare?ids=…`), while `sitemap.ts` advertises `/compare`. The empty state has no `<h1>` at all (measured: 0 `h1` elements), so the page's heading outline changes with the query string.

The rebuild has one organising idea: **the page is a sheet of facts about 2–4 repos, and every fact must survive being absent.** Rows collapse when nobody reports them, missing cells say so in words, deltas are computed against the first column, "best" is defined in a printed footnote and never invented, and adding/removing a model is one link — no JavaScript, no hand-edited URL.

---

## 1. Evidence

### 1.1 Method

| What | Command / file |
|---|---|
| Live server | `next dev` on `:3000`, snapshot `generatedAt 2026-10-18` |
| Layout probe | `node .shots/plan-compare-measure.mjs` (CDP on `:9222`, `Emulation.setDeviceMetricsOverride` with `mobile: false`, retries until `readyState === 'complete'` **and** the expected url/width are live — `next dev` recompiles on save and a fixed sleep measures the previous route) |
| Data sample | `GET /api/feed?window=7d&gate=passed&limit=100&page=1…7` → `.shots/plan-f1…f7.json` (606 rows, the gate-passed window the feed and its compare links share) |
| URL behaviour | `curl -s "localhost:3000/en/compare?ids=…" \| grep` for the empty-state / table markers |

### 1.2 Layout, measured on `/en/compare` (8 fixed rows)

| Case | Table | Columns | Row-label column | Header row height | Horizontal scroll available | Page height |
|---|---|---|---|---|---|---|
| 1 id @1440 | 1 246 px | 2 | **302 px** | 47 px | 0 px | 900 px |
| 2 ids @1440 | 1 246 px | 3 | **153 px** | 47 px | 0 px | 900 px |
| 3 ids @1440 | 1 246 px | 4 | **77 px** | 47 px | 0 px | 900 px |
| 3 ids @390 | 341 px | 4 | **34 px** | **179 px** | 0 px | 1 262 px |
| 3 ids @360 | 311 px | 4 | **33 px** | **179 px** | 0 px | 1 340 px |
| 6 ids @1440 | 1 246 px | 7 | **60 px** | 69 px | 0 px | 900 px |
| 6 ids @390 | 341 px | 7 | **29 px** | **289 px** | 0 px | 1 558 px |

Read it as one sentence: *the more models you compare, the narrower the labels that explain them, until on a phone the 11 px row labels are 29 px wide and the header is a 289 px stack of wrapped repo ids.*

Other measured facts:

| Fact | Number |
|---|---|
| Repo ids longer than 40 characters | **152 / 606 (25.1 %)**; longest **102** |
| Longest quantizations cell (`join(", ")`) | **138 characters**, up to 21 entries |
| Runners per model | 1–4 |
| Cell font in `<td>` | 15 px; row labels 11 px (`.label`) |
| `<th>` attributes in the sheet | none — no `scope`, no `caption`, row labels are `<td>` |
| Page-level `?ids=` links (add / remove / swap / clear) | **0** |
| `<h1>` on `/en/compare` with no ids | **0** |

### 1.3 Field coverage on the served snapshot (606 gate-passed rows)

| Field | Reported by | Both sides of a random pair | At least one side |
|---|---|---|---|
| First seen (age) | **100 %** | 100 % | 100 % |
| Downloads | **97.5 %** | 95.1 % | 99.9 % |
| Runners | **94.2 %** | 88.8 % | 99.7 % |
| Library (`libraryName`) | 85.6 % | — | — |
| Weights size (`storageBytes`) | **76.2 %** | 58.1 % | 94.4 % |
| License | **72.6 %** | 52.7 % | 92.5 % |
| Quantizations | **42.6 %** | 18.1 % | 67.0 % |
| Base model (`cardMeta.baseModel`) | 26.4 % | — | — |
| Likes | **21.1 %** | 4.5 % | 37.8 % |
| Params (`paramsTotal`) | **17.7 %** | 3.1 % | 32.2 % |
| VRAM estimate (`vramEstGb`) | **17.2 %** | 2.9 % | 31.4 % |
| Languages | 12.4 % | — | — |
| Params **and** VRAM | 17.2 % | **2.9 %** | 31.4 % |

Consequences the plan is built on:

1. A sheet led by **params/VRAM is empty on 2 of 3 random pairs**. Those two rows cannot be the page's spine; downloads, runners, size, license and age can.
2. **Downloads/day since first seen** is derived from two fields that are each ≥ 97 % present, so it is the one "performance" metric that always prints — and it is the honest one for a 90-day window (it is cumulative downloads ÷ days since we first saw the repo, and the label must say exactly that).
3. Every derived metric that needs params or VRAM (VRAM per 1B, bytes per param) is available on ~1 in 6 models and must be **hidden, not approximated**.

### 1.4 Defects

| # | Defect | Measured |
|---|---|---|
| **D1** | The taught URL format (`?ids=owner/model`) does not resolve | `?ids=axiomofmind/Moss-Image-base-GGUF` → "No models match"; `?ids=axiomofmind-Moss-Image-base-GGUF` → table |
| **D2** | Unknown ids are dropped silently | `?ids=<slug>,garbage` → 1-column sheet, no notice |
| **D3** | More than 6 ids truncated silently | `slice(0, 6)` in `page.tsx` |
| **D4** | Duplicate ids render duplicate columns | `?ids=a,a` → 2 identical columns, both "best" |
| **D5** | No add / remove / swap / clear on the page | 0 `?ids=` links on the route |
| **D6** | No picker, no search, no suggestion | 1 `<input>` on the page, and it is the desk search |
| **D7** | Squeezed, not scrolled: labels unreadable as models are added | 34 px labels @390, 60 px @1440 with 6 models |
| **D8** | Sticky header is decorative | `thead` sticky but header top −31 px after a 362 px page scroll |
| **D9** | Fixed 8 rows; all-empty rows still printed | 8 rows, `params` empty on 82 % of models |
| **D10** | "best" is undefined, tie-blind, and wrong-direction on size metrics | `min` on params/VRAM declares the smaller model "best"; `findIndex` marks only the first maximum; no rule printed |
| **D11** | No `generateMetadata`, no h1 on the empty route, `sitemap` lists `/compare` | `document.title` = site title; 0 `h1` without ids |
| **D12** | Not a real table for assistive tech | no `caption`, no `scope`, labels in `<td>` |
| **D13** | Sparse cells print a bare "—" with no explanation and no coverage note | `—` on 100 % of `params` cells for a params-less pair |
| **D14** | A single id renders a "comparison" of one, with no prompt to add a second | measured 1-id sheet: 2 columns, `best` count 0 |

---

## 2. Decisions

| # | Decision | Reason (measured) |
|---|---|---|
| **C1** | **URL is the state, but it accepts what people actually paste**: `owner/model`, `owner-model` slug, `https://huggingface.co/owner/model` (with `/tree/main`, trailing `/`), any case, `%2C`-encoded separators | D1: the taught format is the broken one. One parser in `lib/compare.ts`, used by both the address and the add form, so the two can never disagree |
| **C2** | **Cap 4 models** (default 2) | At 1 246 px of sheet, 4 columns × 276 px keeps the label column at a fixed 140 px; 6 columns forced the label column to 60 px in auto layout (§1.2). Four is also the most a decision needs |
| **C3** | **Add / remove / swap / clear are plain GET links and one GET form** — no client JS | The whole site is server-rendered; `ScrollStrip` is the only client component in this area and it exists for a different reason (D5) |
| **C4** | **Below 1 024 px the sheet keeps its shape**: a fixed 90 px label column pinned left, model columns at 148 px minimum inside the existing `ScrollStrip` (visible scrollbar, drag-to-pan, keyboard tab stop) | Measured: 2 models fit a 390 px screen without scrolling (90 + 2×148 = 386). With 4 the overflow is 296 px and is reachable by bar / drag / arrow keys — the affordance DESIGN-V2 §297 asked for and DESIGN-V3 §0.2.9 already solved once for the ribbon |
| **C5** | **Rows collapse when nobody reports the value**, and a partial row prints its coverage in the label (`Weights size · 2/3`) | D9/D13: 82 % of models have no params; printing an all-dash row is noise that teaches nothing |
| **C6** | **Missing values say "not reported"** (visually a dash, with the words for assistive tech and a `title`) instead of a bare `—` | Same data can only be compared where it exists; a dash with no legend reads as "zero" |
| **C7** | **Direction is per row and printed once**, and "best" is marked only where it is a fact | `↑` higher: downloads, downloads/day, likes, likes per 1k downloads. `↓` lower: weights size, VRAM, VRAM per 1B. **No direction**: params, quantizations, license, category, runners, first seen, base model — a smaller model is not a better model, it is a smaller one |
| **C8** | **Ties are all marked**, and only when ≥ 2 models report the value | D10: `findIndex` marked one of two equal maxima |
| **C9** | **A delta under each numeric value, against the first column** (`+1.2k`, `−2.1 GB`, `+38/d`), suppressed at 0 and when either side is missing | The page's question is "which", and a difference answers it better than two numbers. The first column is the baseline because the URL's order is preserved |
| **C10** | **"Top differences" is factual, not a verdict**: 3 sentences of the form `Downloads/day: 41.2 vs 6.1 (6.7×)` for the rows with the largest relative gap where both sides report | Same rule as the rest of the site (DESIGN-V3 §0.1: no unverifiable composite score). Every number printed here is also printed in a row |
| **C11** | **No composite "winner", no score, no chart** | A blend of downloads and VRAM cannot be checked by the reader and would be the third undocumented number on the site |
| **C12** | **`generateMetadata` on the route**: pair title ("A vs B — Compare"), description naming the window and the snapshot, canonical URL **deduped with the order preserved**, and `robots: { index: false, follow: true }` whenever ids resolve | D11: compare URLs are a tool, not content; the permutations are near-infinite and all self-canonical. `/compare` (no ids) stays indexable and stays in the sitemap |
| **C13** | **Real table semantics + a working sticky header**: `<caption class="sr-only">`, `<th scope="col">`, `<th scope="row">`, `aria-describedby` pointing at the "how best is decided" footnote; the sheet wrapper must not create a vertical scroll port above the `thead` | D12, D8 |
| **C14** | **One snapshot read per request**: `getModelsBySlugs(slugs)` (Map lookup) + `getCompareSuggestions(seed)` in `lib/store.ts`; row building is a pure function in `lib/compare.ts` | Today the route does `Promise.all(slugs.map(getModel))` — N snapshot reads for one sheet |

---

## 3. The page

### 3.1 States

| Ids given | What renders |
|---|---|
| **0** | `PageHeader` (kicker `COMPARE`, h1, one-sentence lede naming the window and the snapshot age) → **picker**: a GET form ("Paste a repo id — `owner/model`"), 8 most-downloaded models of the window as Add chips, and **3 computed pairs** ("Two embedding models from this week: A vs B") → a footnote on how the sheet works |
| **1** | The sheet with one column, a notice "One model — add a second to see differences", and **6 nearest neighbours** (same category first, then closest downloads) as Add links |
| **2–4** | The sheet, the "add" form above it, per-column remove, swap, clear, copy link |
| **>4** | The first 4 in URL order + a notice naming the dropped ones |
| **some unresolvable** | The resolvable ones + a notice: `2 of 3 addresses are not in this snapshot: garbage, nope` |
| **duplicates** | Deduped to one column + a notice (or silently, when the two forms resolve to the same repo — the notice is the honest choice) |
| **none resolvable** | `EmptyState` (v3 ruled version, `DataNotice`) + the picker + the repo-id format examples that actually work |

### 3.2 Sheet anatomy (≥ 1 024 px)

```
COMPARE                                             edition · snapshot 3h ago
Compare models
Two to four repos side by side, from the last 7 days.

[ owner/name             ] [ Add ]        swap · clear · copy link      (2 of 4 is printed in the header)

                                   ╷ axiomofmind/     ╷ AmirFazlollahi/
            (blank corner)         ╷ Moss-Image-base  ╷ Gemma3-1B-…
                                   ╷ [plate] Coding  ╷ [plate] LLM       ✕
─────────────────────────────────────────────────────────────────────────────
FIT                                                                    2/2
  Weights size                 ↓   ╷ 6.14 GB          ╷ 2.09 GB   · best
                                   ╷ +4.05 GB         ╷ —
  Params                           ╷ —                ╷ 1.0B
  Quantizations                    ╷ Q4_K_M, Q8_0     ╷ BF16
─────────────────────────────────────────────────────────────────────────────
RUNS ON                                                                2/2
  Runners                          ╷ llama.cpp, ONNX  ╷ transformers
─────────────────────────────────────────────────────────────────────────────
TRACTION                                                               2/2
  Downloads                    ↑   ╷ 12.3k            ╷ 4.1k
                                   ╷ +8.2k            ╷ —
  Downloads / day              ↑   ╷ 41.2/d           ╷ 6.1/d  · best
  Likes                        ↑   ╷ —                ╷ 12
─────────────────────────────────────────────────────────────────────────────
PROVENANCE                                                             2/2
  License                      ·   ╷ apache-2.0       ╷ mit
  First seen                   ·   ╷ 3d ago           ╷ 4d ago
  Base model                   ·   ╷ —                ╷ google/gemma-3-1b
  Hugging Face                 ·   ╷ ↗ open           ╷ ↗ open

Top differences
  Weights size       6.14 GB vs 2.09 GB (2.9×)
  Downloads / day    41.2/d vs 6.1/d (6.7×)

How to read this sheet — ↑ higher is better, ↓ lower is better, · no direction.
"best" marks the extreme printed value among the models that report it.
Deltas are against the first column. VRAM is an estimate (see glossary).
```

Rules:

- The **first column is the baseline**, its deltas are blank, and the header says so (`· baseline` under its name only when ≥ 3 columns).
- Group rules (`FIT`, `RUNS ON`, `TRACTION`, `PROVENANCE`) reuse `.section-title` / `.rule-strong`.
- Each group prints its own coverage (`2/2`) so a reader can see how much of the sheet is actually filled.
- Row labels are `<th scope="row">`, 13 px `.label`-ish but `normal-case`, **fixed 140 px** — the label column never shrinks because the table is `table-layout: fixed`.
- Values are mono, right-aligned, `tabular-nums`; units are part of the value (`6.14 GB`, `41.2/d`).
- "best" is a text chip, not a colour: `· best` (kept from today) so it survives greyscale and `prefers-contrast`.
- The `✕` in a column header links to the same URL with that slug removed, `aria-label="Remove <name>"`; it is a 24 px target (the site's measured minimum).

### 3.3 Mobile (< 1 024 px)

Same `<table>` (not cards — cards would delete the comparison, which is the job):

- label column `sticky left-0`, **90 px**, opaque `--bg` with a 1 px right rule; the first cell of the header row is the blank corner and it is sticky in both axes;
- each model column `min-width: 148px`;
- the wrapper is `ScrollStrip` (`label` = "Model comparison", visible 4 px themed scrollbar, drag-to-pan, `tabIndex=0`);
- header cells clamp to 2 lines with `title` = full repo id (25 % of ids are > 40 chars, longest 102 — inventing short names is not an option, clamping is);
- groups and the "Top differences" block stay; the footnote stays.

### 3.4 Rows (order = group, then measured coverage)

| Group | Row | Source | Format | Direction | Coverage |
|---|---|---|---|---|---|
| Fit | Weights size | `storageBytes` | `formatBytes` | ↓ | 76.2 % |
| Fit | Params | `paramsTotal` | `formatParams` | · | 17.7 % |
| Fit | Quantizations | `quantizations` | join, clamp to 4 + `+n` | · | 42.6 % |
| Fit | VRAM estimate | `vramEstGb` | `~N GB` + glossary link | ↓ | 17.2 % |
| Fit | VRAM per 1B params | `vramEstGb / (paramsTotal/1e9)` | `N GB/B` | ↓ | both 17.2 % |
| Runs on | Runners | `runners` | join with `·` | · | 94.2 % |
| Runs on | Library / pipeline | `libraryName`, `pipelineTag` | text | · | 85.6 / 93.1 % |
| Traction | Downloads | `downloads` | `formatNumber` | ↑ | 97.5 % |
| Traction | Downloads / day since first seen | `downloads / max(1, daysSince(firstSeenAt))` | `N/d` | ↑ | ~97.5 % |
| Traction | Likes | `likes` | `formatNumber` | ↑ | 21.1 % |
| Traction | Likes per 1k downloads | `likes / downloads * 1000` | `N` (0.1) | ↑ | both 21.1 % |
| Provenance | License | `license` | text + link to filtered feed | · | 72.6 % |
| Provenance | Quality gate | `qualityPassed`, `gateReason` | chip | · | 100 % |
| Provenance | First seen | `firstSeenAt` | `Nd ago` | · | 100 % |
| Provenance | Base model | `cardMeta.baseModel` | text, links to that model when tracked | · | 26.4 % |
| Provenance | Hugging Face | `url` | `↗ open` | · | 100 % |

Derived rows carry their formula in the row label's `title` and in the footnote; the ones needing two low-coverage inputs (`VRAM per 1B`, `Likes per 1k`) collapse to nothing on most pairs, which is the point.

---

## 4. Data layer

### 4.1 New pure module `src/lib/compare.ts`

```ts
export interface CompareToken { raw: string; slug: string }
export interface CompareInput { slugs: string[]; tokens: CompareToken[]; duplicates: string[]; overflow: string[] }
export function parseCompareIds(raw: string | string[] | undefined, cap?: number): CompareInput
export function toRepoId(value: string): string        // HF URL / bare id / slug → owner/model
export function compareSlugOf(value: string): string | null
export function splitResolved(tokens: CompareToken[], models: ClassifiedModel[]): { models; rejected: string[] }
export function compareRows(models: ClassifiedModel[], locale: Locale): CompareRow[]
export function bestIndexes(row: CompareRow): number[]  // all ties, only when >= 2 numeric values
export function rowDeltas(row: CompareRow): Array<string | null> // vs index 0, null when not comparable
export function topDifferences(rows: CompareRow[], limit?: number): Difference[]
```

`parseCompareIds` rules (test table, ≥ 12 cases):

| Input | Result |
|---|---|
| `owner/model` | slug `owner-model` |
| `owner-model` | slug `owner-model` |
| `https://huggingface.co/owner/model` | slug `owner-model` |
| `https://huggingface.co/owner/model/tree/main` | slug `owner-model` |
| `OWNER/Model` | resolves case-insensitively against the snapshot |
| `a, b ,c` | 3 slugs, trimmed, order kept |
| `a,a` | 1 slug + `duplicates: ["a"]` |
| `a,b,c,d,e` | 4 slugs + `overflow: ["e"]` (cap 4) |
| `garbage` | `rejected: ["garbage"]`, 0 slugs |
| `a%2Cb` | 2 slugs (encoded separator) |
| `""`, `,`, `, ,` | 0 slugs, nothing rejected (blank means "not set", per `cleanSearch`) |
| `%E0%A4%A` (bad escape) | raw value, no throw |
| > 102-char id | accepted, clamped in the header only |

### 4.2 Store additions (`src/lib/store.ts`)

```ts
export async function getModelsBySlugs(slugs: string[]): Promise<ClassifiedModel[]> // one loadSnapshot + Map
export async function resolveModelSlug(candidate: string): Promise<string | null>  // exact, then lower-case index
export async function getCompareSuggestions(seed: ClassifiedModel | null, limit: number): Promise<ClassifiedModel[]>
```

`getCompareSuggestions(null)` (empty page) → most-downloaded of the 7-day window, gate passed.
`getCompareSuggestions(seed)` (1 model) → same category first (downloads desc), then the rest of the window, excluding the seed and duplicates.

### 4.3 Tests

`tests/compare.test.ts` (new):

1. the parse table above (each row a case);
2. a row with 0 reporters is dropped; a row with 1 reporter still renders and gets **no** best mark;
3. ties mark every index;
4. `params` never carries a direction and never prints "best";
5. deltas are `null` when either side is missing, `null` at 0, signed otherwise;
6. `topDifferences` never emits a pair that is not printed in a row;
7. fixtures from the real snapshot shapes (a params-less GGUF model, a fully specced safetensors model, a gated model).

`tests/i18n.test.ts` (new): both dictionaries have identical key sets, no blank values, and every `t()` key used by `src/app/[locale]/compare` exists.

---

## 5. Implementation steps

| Phase | Work | Files |
|---|---|---|
| **P0** | Parser + pure row model + tests (no UI change) | `src/lib/compare.ts`, `tests/compare.test.ts`, `tests/i18n.test.ts` |
| **P1** | Store additions (single snapshot read, resolver, suggestions) | `src/lib/store.ts` |
| **P2** | Sheet component: grouped rows, fixed label column, deltas, best/ties, coverage notes, empty-value wording, real table semantics | `src/components/compare/CompareSheet.tsx` (new) |
| **P3** | Route: parse → resolve → notices (rejected/overflow/duplicates/none) → picker (form + Add chips + computed pairs + neighbours) → `PageHeader` + `DataNotice` + footnote; `generateMetadata` with canonical (sorted, deduped) + `noindex` when ids resolve | `src/app/[locale]/compare/page.tsx` |
| **P4** | Mobile: `sticky` label column + `ScrollStrip` wrapper + 148 px columns + 2-line clamped headers | `CompareSheet.tsx`, `globals.css` (`.compare-*` helpers if needed) |
| **P5** | i18n keys (en + tr), docs index, screenshots, measurement | `src/i18n/dictionaries/*.json`, `docs/README.md`, `.shots/` |
| **P6** | FeedCard wording: the card's "Compare" link stays a *replace* (one model) but the sheet's own add form is the multi-add path; add `title`/`aria-label` "Compare with…" so the replace behaviour is not a surprise | `src/components/FeedCard.tsx` |

New i18n keys (~30, both languages, parity enforced by the new test):
`compare.lede`, `compare.addModel`, `compare.pasteHint`, `compare.pastePlaceholder`, `compare.add`, `compare.added`, `compare.remove`, `compare.swap`, `compare.clear`, `compare.copyLink`, `compare.selected`, `compare.ofCap`, `compare.baseline`, `compare.best`, `compare.notReported`, `compare.coverage`, `compare.groupFit`, `compare.groupRuns`, `compare.groupTraction`, `compare.groupProvenance`, `compare.rateSinceFirstSeen`, `compare.vramPerB`, `compare.likesPerK`, `compare.topDifferences`, `compare.howToRead`, `compare.deltaNote`, `compare.oneModel`, `compare.suggestTitle`, `compare.suggestPair`, `compare.neighbours`, `compare.rejected`, `compare.overflow`, `compare.duplicates`, `compare.noneResolved`, `compare.weights`, `compare.gate`, `compare.openHf`, `compare.formatExamples`.

---

## 6. Acceptance criteria

| # | Criterion | How |
|---|---|---|
1 | 0 px document horizontal overflow with 2 and 4 models at 320/360/390/768/1024/1280/1440 | `scripts/audit-ui.ts` sweep + `.shots/plan-compare-measure.mjs` |
2 | Row-label column ≥ **140 px** at ≥ 1 024 px and ≥ **90 px** (pinned) below | CDP `getBoundingClientRect` on `tbody th` |
3 | Header row ≤ **96 px** desktop / ≤ **64 px** mobile with a 102-char repo id in a 4-model sheet (today: 47 / **289**) | same probe |
4 | `thead` sticks: after `window.scrollTo(0, 400)` the header top is **0 ± 1 px** (today: **−31**) | same probe |
5 | Available horizontal scroll at 390 with 4 models = **≥ 250 px** and reachable by a visible scrollbar, drag and arrow keys (today: **0**) | `scrollWidth − clientWidth` + manual keypress |
6 | No row renders when 0 of N models report it; a 1-reporter row renders without a `best` mark | unit test (4.3 #2) |
7 | `?ids=owner/model`, the slug form, and an HF URL all resolve | unit test + `curl` |
8 | An unknown id produces a named notice; 5 ids produce 4 columns + a notice; duplicates produce 1 column | `curl` + unit test |
9 | Add → remove round-trip: `/compare?ids=a` + add `b` → columns `a,b`; remove `a` → column `b` | `curl` |
10 | `document.title` differs per pair; compare URLs with ids are `noindex`; `/compare` stays in `sitemap.xml` | `curl` |
11 | Dictionaries equal (key sets + no blanks) and every compare key present | `tests/i18n.test.ts` |
12 | `npm test`, `npm run typecheck`, `npm run lint` green | CI |
13 | Screenshots `.shots/compare-v2-2up-1440.png`, `-4up-1440`, `-2up-390`, `-4up-390`, plus a print-media pass | `scripts/screenshot.ts` |

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Long repo ids (25 % > 40 chars, longest 102) destroy the header | fixed 140/148 px columns + `line-clamp-2` + `title` + the plate; never invent a short name |
| Derived "downloads / day" misread as a growth rate | label says *since first seen*, the tooltip prints `downloads ÷ days since 2026-10-15`; it is not a delta from a previous snapshot (that is `lib/heat.ts`'s job and it has no baselines yet — 0/606 rows carry `downloadsAtFirstSeen`) |
| More rows = more numbers nobody checks | every printed number is also on `/m/[slug]` or the card; no composite score (C11) |
| Mobile scroll hides the label column again | label column is `sticky left-0`, verified by probe criterion #2 |
| A picker becomes a second search UI that drifts from the feed's filters | the picker queries the same `getFeed`/`getCompareSuggestions`; it has no filters of its own |
| `noindex` on compare URLs could look like an SEO regression | `/compare` itself stays indexed and keeps its sitemap entry; only the id permutations are excluded |

## 8. Out of scope

Saved comparisons, share cards, CSV export, charts, a per-quantization VRAM matrix, 5+ models, cross-category "best overall" scoring, client-side state.

---

## 9. Implementation log — 2026-10-20

Implemented in one pass. Every number below was measured **after** the change with `node .shots/compare-verify.mjs` (15 cases, JSON written to `.shots/compare-verify.json`) and `.shots/compare-shots.mjs` (six screenshots).

| Plan item | Result (measured) |
|---|---|
| **P0** parser + row model | `src/lib/compare.ts` (pure; `now` and `knownSlugs` are injected so the row model is testable) and `tests/compare.test.ts`, **12 cases**: every address form, decode-then-split, dedupe, cap, row collapse, tie marking, no direction on params, deltas, top differences, pair suggestions |
| **P1** store | `getModelsBySlugs` (one snapshot read + exact-then-case-insensitive index), `getTrackedSlugs`, `getCompareSuggestions` |
| **P2/P3** sheet + route | `src/components/compare/CompareSheet.tsx`, `src/components/compare/ComparePicker.tsx`, rewritten `src/app/[locale]/compare/page.tsx` with `generateMetadata` |
| **P4** mobile | 96 px pinned label column, 148 px model columns, horizontal scroll range **345 px at 390 px** and **415 px at 320 px** with four models; label column at **x = 16 px after scrolling to the end** |
| **P5** i18n | **67 new keys** in both dictionaries, parity enforced by the new `tests/i18n.test.ts` (key sets equal, no blanks, every key the compare surface asks for exists) |
| Gates | `npm test` **159/159**, `npm run lint` clean, `npm run typecheck` clean |

### 9.1 Measured after (4-model sheet, 102-character repo id included)

| Case | Label column | Header row | Horizontal scroll | Header after page scroll |
|---|---|---|---|---|
| @1440 | **140 px** | **83 px** | 0 (fits) | **0 px — sticky** |
| @1024 | 140 px | **99 px** | 0 (fits) | **0 px — sticky** |
| @768 | 140 px | **99 px** | 0 (fits) | **0 px — sticky** |
| @390 / 360 / 320 | **96 px (pinned)** | **83 px** | 345 / 375 / 415 px | scrolls with the page (see §9.2) |

Document overflow is **0 px** at 320/360/390/768/1024/1280/1440. The zero-id page is no longer a blank viewport: it renders the picker, 8 add-chips and **3 computed pairs** (1 198 px tall at 1440, was 844 px of nothing).

Address handling, measured: `?ids=axiomofmind/Moss-Image-base-GGUF` and `?ids=https://huggingface.co/…` both resolve; `?ids=a,a` renders one column with a named notice; six addresses render four columns plus `A sheet holds 4 models; dropped: e5, f6`; an unknown address produces `2 of 3 addresses are not in this snapshot: xx/garbage` **as typed**. The add form answers **307 → `/en/compare?ids=…`**, and a typo answers with a named notice instead of a silent drop. `document.title` is `Moss-Image-base-GGUF vs Gemma3-1B-… — Compare`, the canonical is deduped with the order preserved, and resolved sheets carry `robots: noindex, follow`.

### 9.2 Deviations from the plan (and why)

| Planned | Landed | Reason |
|---|---|---|
| Canonical URL with ids **sorted** | deduped, **order preserved** | The first column is the baseline every delta is computed against (§2 C9), so `?ids=b,a` and `?ids=a,b` are different documents. Sorting the canonical would have declared the rendered sheet a duplicate of a sheet with the opposite deltas. |
| Header row ≤ 96 px desktop / ≤ 64 px mobile | **≤ 100 px everywhere** (83 at 1440 with four models, 99 at 1024/768) | The column header carries the name, the owner, the category, the age and the remove control. 64 px would have meant hiding what the column *is*. The rule also caught a real defect on the way: with the plate and the remove button as separate flex items, the name was left 53 px of room at 768 px and the header row grew to **189 px** — the plate is now `lg`-only and the remove control sits beside the name. |
| `thead` sticks at every width | sticks from **768 px** up; below that the label column is pinned and the header scrolls with the page | `overflow-x: auto` computes `overflow-y` to `hidden`, which makes the wrapper a scroll port with zero vertical range, so `position: sticky` can never reach the viewport (measured: −494 px with four models). `overflow-y: clip` does not help: the spec turns it into `hidden` for exactly this reason. Below 768 px the sheet genuinely needs a horizontal scroller (148 px minimum columns), so the choice is between a sticky header and readable columns — the columns win, and the group rules plus the pinned label keep orientation. |
| Empty state reuses `EmptyState` | dedicated ruled block in the compare route | `EmptyState` is still used by the feed, news, research and the 404 paths and is out of this route's scope; the compare zero state needed a form, chips and computed pairs, not a message and a button. |
| — | `CompareActions` lost its model count | The page header's `aside` already prints `2 of 4 models`; printing it twice within 100 px was noise. |

One more measured defect fixed in passing: the previous sheet's `min` direction declared the **smaller** model "best" on params and VRAM. Params now carries no direction at all (a smaller model is smaller, not better), and size-shaped rows (`weights`, `vram`, `vram per 1B`) keep `min` with the rule printed in the footnote.
