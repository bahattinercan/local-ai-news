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
- **Known limit:** the tab badge cannot follow the *active* query, because the tab
  bar renders in the locale layout, which never receives `searchParams`. Narrowing
  the window or the gate narrows the list (pagination total follows it); the badge
  keeps reporting the default 7-day, gate-on view.

## Not implemented yet (F6 remainder)

Admin override panel, email digest, local Ollama integration (`localhost:11434/api/tags`), external news sources (would break decision 3).
