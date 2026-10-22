# Removing Neon - data storage plan (EN)

Status: **decided - option C (Vercel Blob)**. Implementation in progress.

## 1. Goal

The site has no Postgres/Neon anywhere. Everything reads one JSON snapshot.
What must still work: feed, category tabs, model detail, news, stats, compare,
RSS, sitemap - and the news feed must keep updating on a schedule.

Current state: `src/lib/db/store.ts` has two paths (Neon via Drizzle, and a
`data/feed.json` fallback). 456 KB snapshot, 343 models, 51 news rows.

## 2. Where the snapshot lives - the real decision

| Option | Update cadence | Extra service | Rebuild per update | Cost | Risk |
|---|---|---|---|---|---|
| **A. Commit `data/feed.json` to `main`** | any | none | **yes** | 0 | 144 builds/day blows Vercel Hobby's ~1000 builds/month |
| **B. Actions writes to a `data` branch / release asset, app fetches with ISR** | 10 min | none | no | 0 | GitHub raw rate limits, cold-start latency |
| **C. Vercel Blob** | 10 min | Vercel token | no | free tier | needs a Vercel project |
| **D. Cloudflare R2 / KV** | 10 min | CF account | no | free tier | another account |

**Recommendation: B**, with the repo snapshot as a bundled fallback so the site
is never empty. Rationale: zero paid services, no rebuild storm, and the ingest
job already runs in GitHub Actions (decision 6), so it can publish its own
output.

Cadence: ingest every 10 minutes, publish every run; the app caches with
`revalidate: 900` and an in-memory TTL, so it fetches at most ~4 times/hour.

## 3. Code changes

**Delete**
- `src/lib/db/client.ts`, `src/lib/db/schema.ts`
- `drizzle.config.ts`, `drizzle/` (generated migration)
- deps: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- scripts: `db:generate`, `db:migrate`

**Rewrite**
- `src/lib/db/store.ts` → `src/lib/store.ts`: snapshot loader (local file +
  remote fetch), in-memory cache, all query/sort/filter logic in JS.
  Remove `isDbConfigured()` and every DB branch.
- `EmptyState.SnapshotNotice` → a plain "data refreshed {time}" line.
- `api/ingest/run` → keep for local/dev only; on read-only filesystems return
  `501` with a pointer to the Actions workflow.

**Add**
- `data/overrides.json` - manual category overrides (replaces the
  `category_overrides` table). Read by `classify/rules.ts`.
- `scripts/publish-snapshot.ts` - writes `data/feed.json` and uploads it.

## 4. Ingest flow after the change

```
cron-job.org → workflow_dispatch → Actions
  → npm run ingest            (HF budget: 92 requests)
  → npm run classify-check    (regression gate)
  → publish data/feed.json to the data branch / release asset
  → app picks it up within 15 min via ISR
```

No app rebuild is triggered by a data update.

## 5. Growth limits (now enforced in code, not by a database)

- cap snapshot at 2000 models / 1000 news rows, oldest dropped first
- keep 90-day window; anything older is pruned at write time
- payload is 456 KB today; if it grows past ~1 MB, split into
  `models.json` + `news.json`, or trim unused fields (`sampleImages`,
  `paramDtypes`)

## 6. Verification

1. `grep -rn DATABASE_URL src scripts docs` → no hits.
2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all clean.
3. `curl localhost:3101/api/feed` works with no env vars set.
4. Cold vs warm load measured with `scripts/audit-ui.ts`.
5. RSS and sitemap still 200.

## 7. Docs to update

- `docs/{en,tr}/DECISIONS.md`: decision 2 (Neon) is reversed; record the reason
  and the reversal condition ("if relational queries or per-user state are
  ever needed, a DB comes back").
- `README.md`: drop the Neon line.
- `docs/{en,tr}/PLAN.md`: keep as the historical plan, add a pointer to this
  file.

## 8. Order of work

1. Decide §2 (needs your input).
2. Delete DB code + deps, rewrite the store (≈1 file).
3. Wire the publish step into the workflow.
4. Update docs and `.env.example`.
5. Run the verification list.

Estimated: one focused session. Nothing in the UI changes except the notice
banner.
