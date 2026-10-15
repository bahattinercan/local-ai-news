# News & AI-detail expansion plan (EN)

> Turkish mirror: [docs/tr/NEWS-PLAN.md](../tr/NEWS-PLAN.md)
> Status: **plan, verified against live data 2026-10-15.** Every number below was measured, not assumed. Commands are in §7.

Scope: make the site show *local AI news* (today it shows an arXiv-like research feed) and give access to *AI detail*. It revises locked decision 3 in [PLAN.md](PLAN.md) ("Hugging Face only"), so it must land together with a [DECISIONS.md](DECISIONS.md) entry.

---

## 1. Measured starting point

The live snapshot (private Vercel Blob, `generatedAt 2026-10-15T20:54Z`) holds **1062 models + 154 news items**.

### 1.1 The news page is not a local-AI news page

| Measurement | Value |
|---|---|
| news by kind | `paper` 150, `release` 4 |
| items touching local/runtime terms (llama.cpp, gguf, vram, quantiz, …) | **28 / 104** in the older snapshot (27 %) |
| `summary` present | 154 / 154 (100 %) |
| `summary` length | min 25, median **1526**, max 1917 chars → 150 / 154 exceed the 280-char card clamp |
| `url`, `thumbnail`, `upvotes` | 100 %, 98 %, 96 % |
| `organization` | 120 / 154 (78 %) |
| `modelSlug`, `categoryKey` | **7 / 154 (5 %)** ← cross-linking a news item to a model almost never resolves |

So: papers from HF `daily_papers` dominate, and `modelSlug` is too sparse to build a "related model" block on.

### 1.2 Model detail data is thin, and some of it can never be backfilled

| Field | Coverage (1062 models) | Among the 388 gate-passing |
|---|---|---|
| `paramsTotal` | 77 (7 %) | 76 (**20 %**) |
| `paramDtypes` | 77 (7 %) | — |
| `vramEstGb` | 76 (7 %) | — |
| `quantizations` | 225 (21 %) | — |
| `storageBytes` | 311 (29 %) | — |
| `runners` | 709 (67 %) | — |
| `sampleImages` | 9 (1 %) | — |
| `spaces` | 21 (2 %) | — |

**Why `paramsTotal` is only 7 %:** it comes from `safetensors.parameters` on the detail endpoint, which GGUF repositories do not have. Split by library: `libraryName=gguf` → 46 models, `paramsTotal` **0 %**, but `quantizations` 70 %. The models that matter most for local inference are exactly the ones with no parameter count.

**Detail fetches are capped and never retried.** The last CI run reported `gate passed: 407`, `detail lookups: 300`, `requests used: 319 / 400` — so 107 gate-passing models got no detail. In `src/lib/ingest.ts:157` an already-known model is skipped (`if (seen.has(normalized.externalId)) continue;`) *before* enrichment, so those models will never be enriched on a later run. Storage/merge does not accumulate detail; it only accumulates rows.

**What is fetched but thrown away:** `src/lib/sources/hf.ts:202-207` parses `siblings` (file list), `cardData` (model card) and `usedStorage`, but `ClassifiedModel` (`src/lib/model.ts`) has no field for them.

### 1.3 Refuted: deriving params from file size

The obvious workaround for the GGUF gap — `paramsTotal ≈ storageBytes / bytesPerParam(quantization)`, using the existing `BYTES_PER_PARAM` table in `src/lib/runner/vram.ts` — **does not work**. Tested on the 51 models that have both values:

| Result | Count |
|---|---|
| within ±30 % of the declared `paramsTotal` | **23 / 51 (45 %)** |
| worst deviation | **108×** (`muhammad-taqi512/SLORA-LTX`: 208 GB inferred vs 1.92 B declared) |

Cause: `usedStorage` counts every file in the repository (several quantizations, LoRA adapters, optimizer state), not the primary weights. Decision: **do not ship a VRAM calculator built on this derivation.** A calculator may only appear where a real `paramsTotal` exists, or the params must be typed in by the user.

### 1.4 Sources that actually work (live-tested)

| Candidate | HTTP | Items | Usable |
|---|---|---|---|
| `r/LocalLLaMA/.rss` | 200 first call, **429 on bursts** | 25 | yes, with cooldown |
| `ggml-org/llama.cpp/releases.atom` | 200 | 10 | yes |
| `ollama/ollama/releases.atom` | 200 | 10 | yes |
| `vllm-project/vllm/releases.atom` | 200 | 10 | yes |
| HN Algolia `search_by_date` | 200 (JSON) | topic search | optional |
| `simonwillison.net/atom/everything/` | 200 | 30 | optional |
| `huggingface.co/blog` | 200, **HTML** | 0 | no feed |
| `lmstudio.ai/changelog` | 200, **HTML** | 0 | no feed |

Reddit needs the browser `User-Agent` + `Accept` headers; three consecutive calls two seconds apart all returned **429**, so treat any non-200 as "keep the existing items" rather than "empty the feed".

---

## 2. Constraints the code path imposes

Verified by reading the code, because they change the plan:

1. **New `kind` values are safe for the reader.** `isUsable()` (`src/lib/store.ts:72`) only checks that `models` is a non-empty array. It does not validate `news` or `kind`, so publishing `runtime` / `community` will not make the running app reject the snapshot.
2. **New `kind` values are unsafe for the UI and the query parser.** `t()` falls back to the raw key (`dict[key] ?? key`), so a missing dictionary entry renders the literal text `news.runtime`. `newsQuerySchema.kind` is `z.enum(["paper","release","announcement"])` (`src/lib/query.ts:67`), so `?kind=runtime` throws a zod error until the enum is extended.
3. **`externalId` is the dedupe key** and is already namespaced by prefix (`paper.id`, `release:<model>`). New sources must follow: `reddit:<id>`, `gh:<owner/repo>:<tag>`.
4. **`MAX_SNAPSHOT_NEWS = 1000`** (`src/lib/ingest.ts:210`) with 154 rows today → ~846 rows of headroom. No cap change needed.
5. **`sources-check` runs before ingest in CI and is Hugging-Face-hardcoded.** `scripts/verify-sources.ts` calls `HfClient` directly for a fixed list of four checks and hardcodes the disabled ones. A new adapter that is not wired in here means the CI health report silently omits it.
6. **`registry.ts` is generic, the fetching is not.** `SourceDefinition` (key/baseUrl/tier/enabled/note) fits new sources, but everything that fetches lives in `hf.ts`. New sources need their own adapter module.

---

## 3. Numeric gates

| # | Gate | Fallback when the gate fails |
|---|---|---|
| G1 | Params/VRAM UI only where `paramsTotal != null` (20 % of gate-passing models today) | Show the spec row as absent, never as `—`; offer a manual "enter parameter count" field so the calculator is still reachable |
| G2 | Params must never be *derived* from `storageBytes` (refuted, 45 % accurate) | If parity is ever wanted, measure it again and require ≥ 90 % within ±30 % before enabling |
| G3 | A news item's "related model" block requires `modelSlug` (5 % coverage) | Omit the block entirely; do not render an empty section |
| G4 | A new source ships only if `sources-check` reports 200 with items > 0 for it | Keep the source disabled in `registry.ts` (`enabled: false`) with the measured failure in `note` |
| G5 | Reddit ingest must tolerate 429 | On any non-200, retain the previous items for that source and record the failure in the health report; never ship an empty source |

---

## 4. Phases

### Phase 0 — Health-check and schema groundwork (prerequisite)
- `scripts/verify-sources.ts`: replace the hardcoded HF list with a registry-driven loop that calls `check()` per source, so `enabled: true` implies "checked in CI".
- `src/lib/sources/registry.ts`: extend `SourceDefinition` with `check` metadata; keep every new source `enabled: false` until G4 passes.
- `src/lib/query.ts`: extend `newsQuerySchema.kind`, and `src/i18n/dictionaries/{en,tr}.json`: add `news.runtime`, `news.community` (constraint 2).
- Acceptance: `npm run sources-check --dry` still passes; typecheck/lint/tests green.

### Phase 1 — Model detail (A1), gated by G1/G2
- `src/lib/model.ts`: add optional `siblings?: string[]`, `cardData?: Record<string, unknown>`, `usedStorage?: number | null`.
- `src/lib/ingest.ts`: keep them in `normalizeModel`; add a **backfill pass** that enriches rows where `siblings` is missing, keyed on the field rather than on `seen` (fixes §1.2). Raise `maxDetailLookups` from 300 toward the budget ceiling — the last run used 319/400, so ~370 is affordable.
- Model page: quantisation file table (name + size), model-card metadata (base model, tags, license detail), exact disk size.
- VRAM calculator: rendered only when `paramsTotal` exists, otherwise a manual params input (G1).
- Acceptance: the spec sheet never prints a `—` row; the file table appears for every model that has been enriched.

### Phase 2 — Real local-AI news (B1 + C1 + D1)
- New adapter `src/lib/sources/feeds.ts` (RSS 2.0 + Atom, no new dependency: regex/`XMLParser`-free parsing of `<item>`/`<entry>` is enough for these four feeds, or add `fast-xml-parser` — decide at implementation time).
- Sources, in value order: `r/LocalLLaMA`, `llama.cpp`, `ollama`, `vLLM`.
- `kind`: add `runtime` (runtime releases) and `community` (Reddit). Keep `paper` and `release` as-is.
- New `externalId` prefixes: `reddit:`, `gh:`.
- Non-200 → keep previous items (G5); log to the health report.
- UI: new kind colours; the news page filter already works once the enum is extended (Phase 0).
- Acceptance: `/news` shows ≥ 3 distinct kinds; a forced 429 leaves the feed unchanged.

### Phase 3 — News detail page (A3)
- Route `/{locale}/n/[id]` using the stored `summary` (median 1526 chars, so a real page is warranted rather than a link-out).
- Source attribution + link to the original; no full-text republication (D1).
- Related-model block only when `modelSlug` exists (G3).
- Acceptance: every one of the 154 news rows renders a detail page with a working source link.

### Phase 4 — Concept glossary (A2) — **done**
Two-language explanatory pages (quantization, VRAM, MoE, LoRA, context window, GGUF vs safetensors). Needs content authoring and maintenance in both locales; deliberately last.

---

## 5. Ordering and reversal

Phase order matters: **Phase 0 must ship with Phase 2**, because a new `kind` published before the enum and dictionary keys exist renders as the literal `news.runtime` in the UI (constraint 2). Phase 1 is independent and can ship first.

Documentation duties: revise locked decision 3 in `PLAN.md` (EN + TR) and record the rationale in `DECISIONS.md` (EN + TR).

---

## 6. Risks

- Reddit is a single point of failure for "community" news and rate-limits bursts. It is a bonus source, never the only one.
- Reddit content is user-generated: store title + short summary + link only, and keep attribution.
- Phase 1's backfill adds requests to an ingest run that already uses 319/400. Raising the detail cap without raising `maxRequests` risks `budgetExhausted`, which currently aborts the run mid-category.
- Adding sources grows the news table toward `MAX_SNAPSHOT_NEWS = 1000`; at 4 sources × 10-25 new items/run this is far off, but the prune rule (sort by `publishedAt`, slice 1000) should be stated in the plan.
- Snapshot schema changes must stay backward compatible: the deployed app reads the same Blob that CI overwrites.

## 7. How to reproduce these measurements

```bash
# live snapshot (private blob; token comes from .env, never printed)
TOKEN=$(tr -d '\r' < .env | grep '^BLOB_READ_WRITE_TOKEN=' | cut -d'=' -f2-)
URL=$(tr -d '\r' < .env | grep '^SNAPSHOT_URL=' | cut -d'=' -f2-)
curl -s -H "Authorization: Bearer $TOKEN" "$URL" -o .shots/live-snapshot.json

# CI ingest report (gate passed / detail lookups / budget)
gh run view --log | grep -E "gate passed|detail lookups|requests used"

# source health
npm run sources-check        # live   (add --dry for the offline fixture)
```

---

## 8. Results (measured after implementation, 2026-10-15)

Phases 0, 2, 3 and 1 are implemented. Live snapshot `generatedAt 2026-10-15T22:14Z`: 1059 models, 209 news.

| Gate / criterion | Before | After |
|---|---|---|
| distinct news kinds | 2 (`paper`, `release`) | **4** (`paper` 150, `runtime` 30, `community` 25, `release` 4) |
| news rows | 154 | **209** (+55 from the four feeds) |
| feeds answering 200 with items | 0 of 4 | **4 of 4** (Reddit 25, llama.cpp 10, ollama 10, vLLM 10) |
| news items with an on-site page | 0 | **209** (all four kinds verified) |
| models with a file list (`files`) | 0 | **113** (113 of 384 gate-passing = 29%) |
| models with `cardMeta` | 0 | 89 |
| models that could gain detail on a later run | 0 (skipped by `seen`) | **76 backfilled in one CI run** |
| VRAM calculator reachable | n/a | always (real count, else user input — G1) |
| `modelSlug` cross-link on news | 7/154 (5%) | 8/209 (4%) — **G3 still holds, no related block unless it resolves** |

### Plan corrections found while implementing

1. **Per-file sizes need `?blobs=true`.** `?full=true` returns `siblings` without a size, so the planned file table looked impossible. `full=true&blobs=true` returns sizes.
2. **The backfill is not an optimisation, it is the fix.** The main loop skips a known id before enriching it, so 107 of 407 gate-passing models could never gain detail data. The pass is keyed on the missing field.
3. **Detail coverage accumulates, it is not per-run.** Each run backfills up to 120 more models that lack `files`, so coverage climbs over successive runs instead of resetting at the per-run detail cap.
4. **Next 16 does not decode a dynamic segment.** `params.id` arrived percent-encoded; only ids without special characters worked. See NEWS-PLAN Phase 3 / commit `a38f42a`.
5. **`t()` falls back to the raw key**, so a new `kind` needs its dictionary entries in the same release or the UI prints `news.runtime`.
6. **A `_`-prefixed route folder is a private folder** in the App Router and never routes.

### Phase 4: glossary

Ten entries (quantization, VRAM, context window, GGUF, safetensors, parameters, MoE, LoRA, quality gate, "new = first seen") in four categories, at `/{locale}/glossary` and `/{locale}/glossary/[slug]`. Several entries carry this project's own measurements rather than generic definitions: the GGUF parameter gap (46 repos, 0% with a count), the KV-cache growth behind the VRAM examples, and the refuted size-derived parameter count.

Both languages are required fields of one object per entry, so a missing translation fails the build instead of shipping. Tests assert completeness, unique url-safe slugs, that every `related` link resolves, that no entry links to itself, and that the three slugs the model page links to still exist.

### Still open

- ~~Phase 4 (concept glossary) is not started~~ — **done**: 10 entries under `/{locale}/glossary`, both languages required by the type so a missing translation is a compile error, linked from the footer and from the spec-sheet labels on model pages (params, quantization, VRAM).
- `?page` on the news list was being dropped by the query parser, so page 2 rendered page 1. Fixed while adding `scope`, and covered by a test.
~~- The feed is still 72% papers (150/209)~~ — **resolved**: `scope` splits the surfaces. `/news` owns `release`, `announcement`, `runtime`, `community`; `/research` owns `paper`. The sets are disjoint and covered by a test, and the RSS output mirrors `/news`.
- `files` coverage is 29% of gate-passing models today and grows only as fast as the backfill budget; raising `maxBackfills` (or `maxRequests`) speeds it up.
