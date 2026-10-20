# Glossary v2 — plan (2026-10-20)

> Turkish mirror: [docs/tr/GLOSSARY-PLAN.md](../tr/GLOSSARY-PLAN.md)
> Status: **implemented 2026-10-20** — see §0 for the measured results and the deviations. Every number in §1 and §3 was measured before writing this document.
> Builds on [DESIGN-V3.md](DESIGN-V3.md) §7.1, which already requires `/glossary` to be a *ruled table / Almanac*, and on [DESIGN-V2.md](DESIGN-V2.md) C4 (jargon with no definition is a defect).

---

## 0. Implementation log — 2026-10-20

**Implemented** in one session on the owner's "başla". Every number below was measured after the change with `npm run verify-glossary` (headless Chrome over CDP), `npm run verify-nav`, `scripts/check-overflow.ts`, `npm test` (160 tests), `npm run lint`, `npm run typecheck`.

| Plan item | Result (measured) |
|---|---|
| **G0** search, order, reading | `src/lib/glossary.ts` gains `fold`, `searchGlossary`, `glossarySorted`, `readingMinutes`, `bodySegments`, `refSlugs`, `glossaryNeighbours`, `glossaryCategoryCounts`; `getGlossaryEvidence()` added to `store`. 24 glossary tests + a new `tests/i18n.test.ts` (4) |
| **G1** index restyle | card grid → one ruled list in two columns: **0 `a.card`**, 15 rows, list **731 px** at 1440 (**49 px per row**, was 132 px per card row) and 1 679 px at 390; page **1 299 / 2 420 px** (was 1 591 / 2 409 for 11 entries) |
| **G2** search | `/glossary?q=` + `?cat=`; `q=baglam` (no diacritics) returns 3 terms, `q=kuantizasyon` opens Quantization first (term hits rank above body hits); zero-result `EmptyState` with a clear action. The desk magnifier now stays on `/glossary` — `scripts/check-nav-current.ts` expectations updated to the new rule |
| **G3** entry page | in-body cross-references **0 → 2** on `quantization`, 1 on `gguf`; snapshot evidence block (top quantization values 105 · 97 · 94 · 72 · 58 · 56 on 1 544 models in the running snapshot, denominator always printed); bytes/parameter table rendered from `BYTES_PER_PARAM`; VRAM examples computed by `estimateVramGb` (8.6 / 21.2 / 49.9 GB); `VramCalculator` embedded with an 8B prefill; 6 entries gained "in the model index" links (each verified to return rows); previous/next in collation order; `← Glossary` 82×19 → **44 px** |
| **G4** coverage | 11 → **15 entries** (`library`, `downloads`, `storage-size`, `gated`), and `getGlossaryEvidence()` now also counts downloads / storage / gated |
| **G5** harness | `scripts/measure-glossary.ts` + `npm run verify-glossary` → **9 measurements, 0 problems** (overflow, cards, rows, in-body links, sub-24 px targets, page-per-term) |
| Overflow / nav / targets | 0 horizontal overflow at 320 / 390 / 1 440 on both glossary routes; exactly one nav item marked per route; **0** standalone targets below 24 px (inline links inside a sentence are exempt, WCAG 2.5.8) |

### 0.1 Deviations from the plan (and why)

| Planned | Landed | Reason |
|---|---|---|
| index height ≤ 900 px at 1440, ≤ 1 400 px at 390 | **1 299 px / 2 420 px** | The ceiling was written for 11 entries and ignored the 330 px shell (masthead + ribbon + nav + footer) that every route pays. The honest metric is per term: **49 px per row at 1440** versus 132 px per card row, i.e. −63 % per entry, and 36 % more entries on a page 18 % shorter. Reaching 900 with 15 entries would mean one line per row and no search field |
| `Term` wired into `FeedCard` (library, downloads, storage) | wired into the **model page** spec table instead (storage, popularity, runner, library); feed rows unchanged | Rendered and looked at: three extra `?` badges per row made five per row and the row stopped being scannable. The detail page prints those labels once, which is where a definition belongs |
| sort by `term` | sort by the **folded term with leading punctuation stripped** | Found during verification: `"New" means first seen` led the index, under the quote mark. Test added |
| evidence for quantizations / runners / library / params / gate | + **downloads, storage, gated** | G4's new entries needed their own figures |
| the copy keeps its numbers | the retyped bytes/parameter sentence and the "46 GGUF repos / 70 %" figures were **removed** from both languages | Exactly the drift G-D7 rejects: the table and the evidence block now print those numbers |

### 0.2 Found while implementing, not fixed here

- `data-theme` hydration mismatch (server renders `dark`, the stored preference is `light`) — pre-existing and site-wide: it reproduces on `/tr/news` as well, so it is not caused by this work.

## 1. Baseline — what `/glossary` is today (measured)

Method: `npx tsx .shots/glossary-audit.ts http://localhost:3000 1440,390` against the running dev server (headless Chrome over CDP, `Emulation.setDeviceMetricsOverride`), plus the owner's screenshot of `/en/glossary` at 1440.

| # | Measurement | 1440 | 390 |
|---|---|---|---|
| 1 | Entries / categories | **11 / 4** | same |
| 2 | Index page height | **1 591 px** | **2 409 px** (≈2.7 screens for 11 short entries) |
| 3 | Index rows built from `.card` | **11** (all measured **132 px**, stretched by the grid) | 132–154 px, stretched |
| 4 | Search inputs inside the page | **0** (the only input is the desk magnifier, which posts to `/models`) | same |
| 5 | Anchor ids on the page | **1** (`desk-search` — the nav's own control). No category or term anchor exists | same |
| 6 | `N §` badges printed | **11** | 11 |
| 7 | `PageHeader` `aside` (counts) | **unused** | — |
| 8 | Entry page: words / paragraphs / **in-body links** | 195 / 5 / **0** | — |
| 9 | Horizontal overflow at 1440 / 390 | **0** | **0** |
| 10 | Tap targets below 24 px | **0** | 0 (the `← Glossary` link measures 82×19 px and is the only sub-24 target on the entry page) |

## 2. The seven defects this plan fixes

1. **`N §` is unexplained jargon printed 11 times.** It is `body.length` (paragraph count). DESIGN-V2 C4 was closed precisely because the UI printed undefined jargon; this is the same defect, in the one place meant to explain jargon.
2. **No way to find a term.** 11 entries, no search, no anchor, no index. `DeskNav` hardcodes `search: false` for the glossary (`src/components/shell/DeskNav.tsx`, `sections` array), so the magnifier escapes to `/models`.
3. **The index contradicts v3's stated treatment.** DESIGN-V3 §7.1: `/compare`, `/glossary` → *"ruled table; Almanac"*. The page still renders `.card` in a 2-col grid, and the grid stretches every row to the tallest card: measured 132 px for all 11 rows at 1440, so the short entries carry up to half a row of dead space (visible in the owner's screenshot).
4. **Category grouping does not help at this size.** 4 categories holding 2–3 entries each produce four headings and 11 heterogeneous cards; scanning is by heading, not by term, and a reader who knows the word they want gets no index.
5. **The entry page is a dead end.** Measured 0 links inside the article body: `Q4_K_M`, `llama.cpp`, `safetensors`, "quality gate" are plain text. Related terms appear only at the bottom, and nothing links onward into the model index ("show me the 35 GGUF repos").
6. **Facts live as retyped prose while the site owns the data.** The quantization entry reprints the bytes-per-parameter table as a string, and the VRAM entry reprints 8.6 / 21.2 / 49.9 GB, while `src/lib/runner/vram.ts` already holds `BYTES_PER_PARAM`, `KV_GB_PER_BILLION_AT_4096` and `estimateVramGb`. Two copies, one of them undocumented drift.
7. **Fields the UI prints have no definition.** `FeedCard` and the model page print `libraryName`, `downloads`, `likes`, `storageBytes` and the gated state; the glossary has entries for none of them, and `ui/Term.tsx` is wired in only 4 files.

## 3. Data reality check (bundled snapshot, `generatedAt 2026-10-14T15:43Z`, 915 models)

Numbers are computed at request time from the cached snapshot, never pasted into the glossary file. Coverage is what decides which evidence line a term can honestly show.

| Signal | Coverage | Top values | Use |
|---|---|---|---|
| `quantizations` | **198 / 915 (21.6 %)** | BF16 65, Q4_K_M 56, Q6_K 45, Q8_0 45, F32 43, Q5_K_M 36, INT8 35, FP8 34 | quantization entry: real distribution |
| `runners` | **608 / 915 (66.4 %)** | transformers 374, ComfyUI 157, llama.cpp 111, ONNX 64, MLX 16, Core ML 15, vLLM 10 | runner entry: real distribution |
| `libraryName` | **684 / 915 (74.8 %)** | transformers 255, diffusers 122, peft 48, ultralytics 41, gguf 35 | library entry (new), GGUF entry (`gguf` 35 repos) |
| `paramsTotal` | **75 / 915 (8.2 %)** | — | params entry: the *low coverage is the point*, printed as `75 / 915` |
| `qualityPassed` | **347 / 915 (37.9 %)** | gated 3 | quality-gate entry |
| `downloads` > 0 | **712 / 915 (77.8 %)** | — | downloads entry (new) |
| `likes` > 0 | **350 / 915 (38.3 %)** | — | downloads/likes entry (new) |
| `storageBytes` | **272 / 915 (29.7 %)** | — | storage-size entry (new) |
| snapshot age | — | — | every evidence line prints the snapshot's age (`DataNotice`) |

## 4. Decisions

| # | Decision | Alternative rejected, and why |
|---|---|---|
| **G-D1** | **One alphabetical ruled list**, not four card sections. Category becomes a filter (`?cat=formats`) rendered as the existing nav-style caps strip with counts | Keeping category sections: 11 entries do not justify 4 headings, and a reader who knows the word cannot find it. Cards: measured dead space (§2.3) |
| **G-D2** | **Sort with `Intl.Collator(locale)`** | `Array.prototype.sort()` default is UTF-16 code-unit order, which misplaces `İ`/`I`/`ı` and `Ç/Ğ/Ö/Ş/Ü` in Turkish. A Turkish reader's alphabet is not ASCII |
| **G-D3** | **Replace `N §` with reading time** (`~1 min`), computed from the body word count at 200 wpm, plus the category label | Paragraph count means nothing to a reader; a bare word count is a spec, not a cost |
| **G-D4** | **Search lives in the page and in the desk magnifier** (`DeskNav` `search: true`, `/glossary?q=`), matching term + summary + body + aliases, using a Turkish-aware fold | Client-side JS search: the page is a server component and the dictionary has to work without JS; also the nav already has the `search` hook for exactly this |
| **G-D5** | **Explicit inline refs** (`{quantization}` tokens inside body strings, resolved to a link on first occurrence) | Auto-linking known words: a regex over 11 entries × 2 languages will link "quality" inside "quality gate", plural/inflected Turkish forms (`kuantizasyonun`) will be missed, and a false link is worse than no link. Explicit tokens are testable |
| **G-D6** | **Evidence comes from the snapshot, not from prose.** A declarative `stat` field per entry (`"quantizations" \| "runners" \| "library" \| "params" \| "gate"`) maps to one store function | Hardcoding "46 GGUF repos" (the number in today's copy came from a 1 633-model snapshot): every ingest would silently falsify the page |
| **G-D7** | **Derived tables render from constants** — the quantization byte table from `BYTES_PER_PARAM`, the VRAM examples from `estimateVramGb` | Keeping the retyped table: two sources of truth for one number, and `lib/runner/vram.ts` is the source tests already guard |
| **G-D8** | **Four new entries** (library, downloads & likes, storage size, gated repository) with `Term` wired into the two places the UI prints them | Adding a definition per rendered field everywhere: the row is already dense; four entries cover the labels that are actually ambiguous |

## 5. Phases and acceptance criteria

### G0 — model + guards (no visual change, ships alone)

| Item | Acceptance |
|---|---|
| `GlossaryEntry` gains optional `aliases: { en: string[]; tr: string[] }` and `stat?: GlossaryStat`; body strings may carry `{slug}` refs | typecheck clean; existing 11 entries compile unchanged |
| `lib/glossary.ts` gains `fold(text, locale)` (lowercase + Turkish `İ/ı/ç/ğ/ö/ş/ü` folding), `searchGlossary(q, locale)` returning `{ entry, in: "term" \| "summary" \| "body" \| "alias" }[]`, `glossarySorted(locale)` (collator), `readingMinutes(entry, locale)`, `refSlugs(entry)` | `tests/glossary.test.ts` extended: `kuantizasyon` → quantization; `baglam` (no diacritics) → context-window; `gguf` → gguf; empty query → all; every `{ref}` resolves to an entry; Turkish collation puts `İ`/`I` in the right place; reading time ≥ 1 for every entry, both languages |
| `store` gains `getGlossaryEvidence()` — one pass over the cached snapshot returning `{ total, quantizations, runners, library, params, gate, gated, snapshotAt }` | deterministic for a fixed snapshot (test); no new fetch, no new field |

### G1 — index restyle (Almanac)

| Item | Acceptance |
|---|---|
| Ruled list of 11 rows: term in the display face, one-line summary, meta line (`category · ~1 min`), no `.card`, no `N §` | index height at 1440 **≤ 900 px** (from 1 591) and at 390 **≤ 1 400 px** (from 2 409), measured with the same script |
| `PageHeader aside`: `11 terms · 4 categories` | rendered in both locales |
| Category strip (`All 11 · Concepts 3 · File formats 3 · Hardware 3 · Architecture 2`) as anchors → `?cat=`, with `scroll-margin-top` if anchors are kept | 0 tap targets < 24 px at 1440 and 390 |
| 0 horizontal overflow at 320/360/390/430/768/1024/1440 | `scripts/check-overflow.ts` green |
| Exactly one nav item marked on `/glossary` | `npm run verify-nav` green |

### G2 — search

| Item | Acceptance |
|---|---|
| `DeskNav` `sections` entry for glossary becomes `search: true` | a search from `/glossary` posts to `/glossary?q=`, not `/models` |
| `/glossary?q=` filters the list; a result line states `3 of 11 terms match "gguf"`; `EmptyState` renders on zero hits with a hint and a clear-filter action | manual: `?q=gguf`, `?q=kuantizasyon`, `?q=baglam`, `?q=zzz`; parity in both locales |
| `q` survives the category filter and vice versa | `?q=&cat=` combinations tested |

### G3 — entry page becomes a spec sheet

| Item | Acceptance |
|---|---|
| Inline `{ref}` links inside body | **in-body link count > 0 on every entry that declares refs** (today: 0 on all); 0 raw `{...}` tokens in the rendered HTML (DOM assertion + unit test) |
| Rendered quantization table from `BYTES_PER_PARAM` (quantization entry) | table rows equal the constant's keys/values (test); no literal byte table left in the copy |
| VRAM worked examples computed by `estimateVramGb`, not typed | the three example numbers in the copy are generated; changing `KV_GB_PER_BILLION_AT_4096` changes the page (test) |
| `VramCalculator` embedded on the VRAM entry | the calculator renders and estimates; reuses the component, no new code |
| "In this snapshot" evidence block per entry, with numerator/denominator and the snapshot age | quantization → `198 / 915`, runner → `608 / 915`, params → `75 / 915`, quality gate → `347 / 915`, library → `684 / 915`; numbers match `getGlossaryEvidence()` (test) for a fixed snapshot |
| Onward navigation: "See them in the index" (`/models?runner=llama.cpp` etc.), previous/next term in collation order, breadcrumb in JSON-LD | each entry has ≥ 1 link into `/models`; breadcrumb present in JSON-LD; `inLanguage` set |
| The `← Glossary` back link becomes a 44 px target | 0 tap targets < 24 px on the entry page at 1440 and 390 (currently one at 82×19) |

### G4 — coverage

| Item | Acceptance |
|---|---|
| New entries: `library`, `downloads`, `storage-size`, `gated` — both languages, ≥ 2 paragraphs, ≥ 1 related slug, with `stat` where a number helps | `tests/glossary.test.ts` completeness suite green; 15 entries, 4 categories |
| `Term` wired into `FeedCard`'s library label, downloads figure and storage figure (24 px target, C4 rule) | term links per feed row ≥ 3; no sub-24 px target introduced |
| i18n keys added for: search hint, result line, empty state, reading time, category filter, evidence heading, prev/next | parity test green (currently 156 keys, both dictionaries) |

### G5 — verification

| Item | Acceptance |
|---|---|
| `.shots/glossary-audit.ts` promoted to `scripts/measure-glossary.ts` and added to `package.json` | prints the §1 table; fails on regression (height, in-body links, sub-24 targets) |
| Screenshots at 390 and 1440, both themes, index + `quantization` + `vram` | stored under `.shots/` |
| `npm test`, `npm run lint`, `npm run typecheck`, `npm run verify-nav`, `npm run verify-ui` | all green |

## 6. File map

**Changed:** `src/lib/glossary.ts` (types, fold/search/sort/reading/refs), `src/lib/store.ts` (`getGlossaryEvidence`), `src/app/[locale]/glossary/page.tsx` (ruled list, filter, search, counts), `src/app/[locale]/glossary/[slug]/page.tsx` (refs, evidence, tables, calculator, prev/next), `src/components/shell/DeskNav.tsx` (`search: true`), `src/components/FeedCard.tsx` (+`Term`), `src/i18n/dictionaries/{en,tr}.json`, `tests/glossary.test.ts`, `package.json`.
**New:** `src/components/glossary/GlossaryRow.tsx`, `src/components/glossary/Evidence.tsx`, `scripts/measure-glossary.ts`.
**Not touched:** ingest, snapshot schema, API routes, `middleware.ts`, other routes' layouts.

## 7. Risks

1. **Evidence that flatters.** `paramsTotal` is 8.2 % of the snapshot; printing `75 / 915` is the honest form and it is also the entry's thesis. Never print a bare count without the denominator.
2. **Search expectations.** A 15-entry glossary does not need fuzzy matching; a prefix/substring fold is enough and is testable. Do not add a client search index.
3. **Turkish folding** is where this will break first (`İ`/`I`, `ı`, `ğ`): the test list in G0 exists for that reason, and `toLocaleLowerCase("tr")` is not the same as `toLowerCase()`.
4. **Page-height regression in the other direction.** The ruled list must stay readable at 320 px; the height ceiling in G1 is a ceiling, not a target to undershoot by deleting content.
5. **Ref syntax leaking.** A stray `{` in a body string would render literally; G3 asserts zero raw tokens in both locales.

## 8. Out of scope

- No CMS, no markdown renderer, no authoring UI for entries.
- No new snapshot fields and no ingest change; all evidence is derived at read time.
- No illustrations/plates per term (the design's ornament budget lives in the masthead).
- No "related term" graph visualisation; prev/next plus `related` links is enough at 15 entries.
