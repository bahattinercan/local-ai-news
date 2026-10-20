# Decisions log (EN)

## Locked decisions (2026-10-13)

1. Next.js App Router + TypeScript.
2. ~~Neon Postgres~~ — **reversed 2026-10-14**: no database at all. The snapshot
   lives in Vercel Blob; see `docs/en/DATA-STORAGE.md`.
3. Hugging Face only as a data source.
4. TR + EN, default `en`.
5. Default freshness window: 7 days.
6. News updates every 10 minutes (cron-job.org → `workflow_dispatch`).
7. Code, comments, JSON keys, test names and commits in English.
8. Docs bilingual: `docs/en/*` source of truth, `docs/tr/*` mirror.
9. Quality gate is a user-facing filter (`quality_passed`, `gate_reason`, "Show everything").
10. News includes derived `release` announcements.
11. Public site: SEO, JSON-LD, hreflang, per-IP rate limit, attribution, growth caps.

## Deviations from the plan, with reasons

- **i18n:** `next-intl` was replaced with a minimal dictionary loader (`src/i18n/index.ts` + `src/i18n/dictionaries/{en,tr}.json`). Same file layout and flat keys as the plan; fewer moving parts, no middleware coupling.
- **Ingest location:** the ingest runs in GitHub Actions and writes to Neon directly; the Vercel app only reads. Reason: function timeouts + the 500/300s HF budget.
- **Storage:** there is no Postgres. The ingest job publishes `data/feed.json`
  to Vercel Blob (`npm run publish`), the app reads it with a 15-minute cache
  (`SNAPSHOT_URL`, or discovered from `BLOB_READ_WRITE_TOKEN`), and falls back
  to the snapshot bundled in the repo so the site is never empty. Reversal
  condition: if relational queries or per-user state are ever needed, a
  database comes back.
- **Rate limiter:** in-memory per-IP map. On Vercel this is per function instance, not global — acceptable for v1, replace with Upstash/Redis if abuse appears.
- **VRAM estimate:** weights + KV cache approximation (`BYTES_PER_PARAM` × params + 0.15 GB per billion params at 4096 tokens). Shown with `~` in the UI.
- **Avatars:** `/api/users/{name}` and `/api/organizations/{name}` error without a token, so avatars come only from the trending response, with a monogram fallback.

## Filter query handling (2026-10-16)

Measured on the live tree, then fixed — all six points below were reproducing on
`localhost:3000` before the change:

- **A blank parameter means "not set".** A GET form submits *every* named control,
  so pressing *Apply* with an untouched select or an empty search box produced
  `?window=7d&runner=&maxParams=&license=&q=`; Zod's `.min(1)` / `.enum()` rejected
  those values and `/`, `/c/[category]`, `/news` and `/research` answered **500**.
  `cleanSearch()` now drops blank and whitespace-only values before validation and
  every enum/number field falls back to its default (`.catch()`) instead of
  throwing, so a hand-edited `?window=abc&page=0` degrades to the default view
  rather than breaking the page. The API routes share the same parsers, so
  `/api/feed?q=` no longer 500s either.
- **`page` is read.** `parseFeedQuery` never handed `page` to the schema, so
  `/c/[category]?page=2` rendered page 1 and the numbered pagination was a dead
  end (`parseNewsQuery` had the same bug fixed earlier).
- **Tab counts describe the feed they open.** `getCategoryCounts()` runs the same
  `filterModels()` as the list (default 7-day window, quality gate applied, gated
  repos hidden), so the tab and the page total agree — `getStats` counted every
  tracked model and the tab printed "Multimodal 153" for a page with 33 cards.
- **The pulse is scoped to the page.** `getPulse(days, category)` filters the
  tracked/passed/hot numbers by category, so a category page no longer leads with
  "top category: Embedding / RAG"; that stat is only rendered where it carries
  information.
- **The active-filter summary lists only what the user set.** The defaults
  (window / sort / gate) used to be announced as active on every page, and the
  summary printed raw enum values ("Quality gate: passed") instead of the words
  the control shows ("Passed only"). Values now come from the control's own option
  list, and *Clear* only appears when there is something to clear.
- **The category strip belongs to the pages, not the layout.** A layout receives
  neither the route params nor `searchParams`, so the old `TabBar` could not mark
  the active tab (every category page highlighted "All") and could not count the
  filtered view. It now renders inside each page: the feed pages pass their parsed
  filters, the badge is `getCategoryCounts(filters)` — the reader's window, gate,
  runner, size, license and search applied to each category — the links carry
  those filters, so switching category keeps the view instead of silently
  resetting it, and the active tab gets `aria-current="page"`. With no filters set
  the numbers are the default 7-day, gate-on view, so a badge always equals the
  pagination total of the page it opens (checked on six categories, with and
  without filters).
- **The mobile overflow was real and is fixed.** Measured with desktop metrics: at
  360 px the feed document was 769 px wide, because a grid item defaults to
  `min-width: auto` and one card with a 45-character unbreakable repo id sized the
  whole track. `min-w-0` on the grid item, `min-w-0 line-clamp-2` instead of
  `break-words` on the card title (`overflow-wrap: break-word` does not lower
  min-content) and `shrink-0` on the gate chip bring every route to 0 overflow at
  360/390/430/768/1024/1440 — the 360 px document is 345 px. See
  docs/en/DESIGN-V2.md §3 D1 for the initial measurement.
- **`scripts/check-overflow.ts` can fail now.** It emulated small widths with
  `mobile: true`, which inflates the layout viewport to the content width, so
  `scrollWidth - innerWidth` was 0 by construction (the false pass in
  DESIGN.md §6). It now uses desktop metrics, waits until the emulated width is
  the layout width, ignores clipped decorations, and exits non-zero on overflow —
  proved with a 900 px fixture (+540 px, exit 1).

## Model page text (2026-10-18)

A model page was a spec sheet with no prose: the ingest stored `cardData` only, and
the three keys it rendered (`baseModel`, `datasets`, `languages`) are empty on most
GGUF repositories, so `nerkyor/Qwen3.8-27B-…-NInfer` printed numbers, a VRAM box
and a run command with nothing saying what the model *is*.

- **The model card body is read, once.** `HfClient.getModelCard()` fetches
  `/{repo}/raw/main/README.md`; `lib/card-text.ts` turns the Markdown into a
  ≤600-character plain-text excerpt (frontmatter, badge rows, inline HTML, tables,
  code fences and a leading author/affiliation block are dropped). It is stored on
  the row as `cardSummary` and rendered under "About this model" with a link to the
  full card — an excerpt plus attribution, never the whole card.
- **`undefined` and `null` mean different things.** `undefined` = never fetched,
  `null` = fetched and empty, so an empty README costs one request ever, not one
  per run. The backfill (`npm run cards-backfill`, and the same pass inside
  `runIngest`) targets gate-passing models by likes, with its own request cap so
  the detail pass keeps its budget.
- **A model page now shows the reverse link too.** `getModelNews()` asks "what
  mentions this model" — the relation used to run one way only (news → model).
  Matching moved to `lib/model-mentions.ts` because requiring the whole repo name
  in a headline can never fire for 108-character finetune ids (6 / 104 news rows
  carried `modelSlug`), and plain word matching was measurably wrong (20 rows
  attributed to one model via "prompt"). Only version-shaped tokens (six
  characters, containing a digit) are trusted, with `tokenDf <= 3` for mentions and
  `tokenDf === 1` for a stored `modelSlug`. Measured on the served snapshot: 5 of
  915 models gain a mention and every hit is real; the section is not rendered when
  nothing matches (gate G3). On the current corpus the stricter ingest rule added
  **0** new links in 98 unlinked rows, which is the intended conservative result.


## Stats page: two time axes, one window vocabulary (2026-10-20)

Recorded because both change how existing numbers may be read; the full plan and
the measured implementation log are in [STATS-PLAN.md](STATS-PLAN.md).

- **Two named time axes.** `tracked` = `firstSeenAt` (when the Radar first saw the
  row) and `created` = `createdAt` (the Hugging Face repo date). Measured on the
  served snapshot: `firstSeenAt` spans **3** days, `createdAt` **49**, so 7 / 30 /
  90 / 180 days of "first seen" all returned 606 while the only daily series the
  site could honestly draw was the repo-creation one. Every `/stats` panel now
  prints which axis it counts; the inventory panels keep `firstSeenAt` so their
  numbers still equal the feed tabs, and the time panel moves to `createdAt`.
- **One window vocabulary.** `/stats` takes `?window=24h|7d|30d|90d`, the feed's
  own `WINDOWS`, and `?days=` is parsed as an alias (30 → 30d, 180 → 90d). The old
  page offered 7 / 30 / 90 / 180 days, none of which could differ.
- **Decision 9 has one documented relaxation.** "Show everything" stays limited
  to 30 days, and the feed still requires a category; an *aggregate* surface
  (`normalizeFeedQuery(input, { aggregate: true })`) may ask for the whole tracked
  set inside that limit because it renders at most nine rows. The gate panel is
  gate-independent in every state, so what the filter hides is visible even when
  the filter is on.
- **`/api/stats` changed shape** (`stats`/`series` → one board: `totals`,
  `categories`, `gateReasons`, `cadence`, `tracking`, `runners`, `wire`). No code
  consumed the old keys; `docs/*/PLAN.md` was updated in the same change.

## Not implemented yet (F6 remainder)

Admin override panel, email digest, local Ollama integration (`localhost:11434/api/tags`), external news sources (would break decision 3).
