# Decisions log (EN)

## Locked decisions (2026-10-13)

1. Next.js App Router + TypeScript.
2. Neon Postgres.
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
- **Snapshot fallback:** when `DATABASE_URL` is absent, the app reads `data/feed.json`. This keeps local development runnable without a database.
- **Rate limiter:** in-memory per-IP map. On Vercel this is per function instance, not global — acceptable for v1, replace with Upstash/Redis if abuse appears.
- **VRAM estimate:** weights + KV cache approximation (`BYTES_PER_PARAM` × params + 0.15 GB per billion params at 4096 tokens). Shown with `~` in the UI.
- **Avatars:** `/api/users/{name}` and `/api/organizations/{name}` error without a token, so avatars come only from the trending response, with a monogram fallback.

## Not implemented yet (F6 remainder)

Admin override panel, email digest, local Ollama integration (`localhost:11434/api/tags`), external news sources (would break decision 3).
