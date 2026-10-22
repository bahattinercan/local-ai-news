# OpenWeight Radar

**English** | [Türkçe](README.tr.md)

Track newly released **open-weight AI models you can run locally** — LLMs, image, video, audio, coding, multimodal, embedding, vision and robotics models — with a news feed that refreshes on a schedule.

The product name is **OpenWeight Radar**. The repository and deployment project are still called `local-ai-news`, and the public origin is `https://local-ai-news.vercel.app` (no custom domain by decision).

Everything is built from **one JSON snapshot**. There is no Postgres/Neon database: an ingest job publishes `data/feed.json` to Vercel Blob, and the Next.js app reads it with a 15-minute cache plus the committed snapshot as a fallback.

---

## What it does

- **Tracks local-fit models** discovered on Hugging Face, sorted by creation date and filtered to open weights.
- **Nine category tabs** with a quality gate that keeps personal LoRA noise out of the feed.
- **A news desk** fed by model releases, Hugging Face daily papers, runtime releases (llama.cpp, Ollama, vLLM) and r/LocalLLaMA.
- **Model pages** with parameter count, quantization, runner detection, VRAM estimate, copyable run command, model-card excerpt, license, sample output and related news.
- **A compare sheet** for up to four models, a **stats desk** with two explicit time axes, and a bilingual **glossary**.
- **SEO plumbing**: canonical URLs, hreflang, JSON-LD, per-page OG images, a sitemap that advertises only useful pages, and a robots policy that allows search while denying training crawlers.
- **TR + EN** UI with `/en` and `/tr` routes, English as the default and the source of truth for entity facts.

---

## Quick start

**Requirements:** Node.js **>= 22** and npm. No database or Docker is needed.

```bash
git clone https://github.com/bahattinercan/local-ai-news.git
cd local-ai-news
npm install

cp .env.example .env      # optional for local browsing
npm run dev               # http://localhost:3000
```

The committed `data/feed.json` is enough to browse the site. You only need credentials to fetch fresh data or publish a snapshot.

Useful first checks:

```bash
npm run typecheck
npm test
npm run lint
```

To work with fresh data locally:

```bash
npm run sources-check     # live source health report
npm run ingest            # writes data/feed.json
npm run dev
```

`npm run ingest` consumes the Hugging Face rate-limit budget. A dry run performs the network calls but does not write the snapshot:

```bash
npm run ingest -- --dry
```

---

## Environment variables

Copy `.env.example` to `.env`. Next.js loads it automatically. `npm run publish` loads it itself, but the other scripts read variables from the process environment — run them with an env file (`npx tsx --env-file=.env scripts/ingest.ts`) or pass the values in the shell (`HF_TOKEN=... npm run ingest`).

| Variable | Required | Purpose |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | For publishing / remote reads | Vercel Blob token. `npm run publish` uploads the snapshot with it, and the app uses it to discover/read a private Blob object. |
| `SNAPSHOT_URL` | Optional | Explicit snapshot URL. If unset, the app discovers the Blob object from the token. |
| `INGEST_SECRET` | For `POST /api/ingest/run` | Shared secret checked against the `x-ingest-secret` header or `?secret=`. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical origin used by canonical links, hreflang, sitemap, RSS and OG metadata. Defaults to `https://local-ai-news.vercel.app`. |
| `HF_TOKEN` | Optional | Raises the Hugging Face limit from 500 requests / 300 s to the authenticated tier. |
| `NEXT_PUBLIC_REPO_URL` | Optional | Public source-repository link in the footer. Hidden when unset. |
| `GOOGLE_SITE_VERIFICATION` | Optional | Search Console verification token. |
| `BING_SITE_VERIFICATION` | Optional | Bing Webmaster verification token. |

`.env` is gitignored; `.env.example` is the tracked template.

---

## Commands

### Application

```bash
npm run dev          # Next.js dev server
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . --max-warnings 0
npm test             # tsx --test tests/*.test.ts (node:test)
```

### Data pipeline

```bash
npm run sources-check              # live source health (200 + item count per source)
npm run sources-check -- --dry     # offline fixtures
npm run ingest                    # fetch HF + feeds, write data/feed.json
npm run ingest -- --dry            # fetch without writing
npm run cards-backfill            # fill missing model-card excerpts
npm run classify-check            # 40 fixture models -> expected categories
npm run publish                   # upload data/feed.json to Vercel Blob
```

`npm run ingest` accepts budget flags:

```bash
npm run ingest -- \
  --max-per-category=200 \
  --pages=2 \
  --max-requests=400 \
  --max-detail-lookups=300 \
  --max-backfills=120 \
  --max-cards=80
```

`npm run cards-backfill` accepts `--limit=40`, `--dry`, `--all` (include gate-rejected rows) and `--refresh` (clear stored excerpts before re-reading the cards).

### Verification helpers

These scripts need a Chrome instance with remote debugging enabled (`--remote-debugging-port=9222`), except `seo-audit`, `contrast` and the SEO unit tests.

```bash
npm run verify-ui          # layout/DOM sweep at multiple widths
npm run verify-nav         # exactly one aria-current per route
npm run verify-theme       # theme survives a language switch
npm run verify-glossary    # glossary layout/cross-link/overflow checks
npm run seo-audit          # offline SEO contract audit
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 360
npx tsx scripts/contrast.ts
npx tsx scripts/type-census.ts http://localhost:3000/tr
npx tsx scripts/screenshot.ts http://localhost:3000
npx tsx scripts/fetch-snapshot.ts
```

`fetch-snapshot.ts` downloads the snapshot production actually serves (to `.shots/live-snapshot.json` by default) so measurements describe real data instead of the committed fallback.

---

## Architecture

```
Hugging Face API  ─┐
HF daily papers    ├─►  GitHub Actions (every 10 min)
GitHub/Reddit feeds┘         │
                             │  sources-check
                             │  ingest
                             │  classify-check
                             │  publish
                             ▼
                    Vercel Blob: feed.json
                             │
                             │  read with a 15-minute cache
                             ▼
                    Next.js on Vercel
                    ├─ server-rendered pages
                    ├─ /api/* JSON routes
                    ├─ /feed.rss
                    ├─ /sitemap.xml, /robots.txt
                    └─ OG image routes

        data/feed.json in the repo = bundled fallback
```

### Data flow details

1. **GitHub Actions** runs `.github/workflows/ingest.yml` on a 10-minute schedule (`*/10 * * * *`) and on `workflow_dispatch`.
2. `sources-check` reports the health of every enabled source. A source with no items is visible instead of silently missing.
3. `ingest` loads the published snapshot (Blob) and the repo copy, unions them, keeps the earliest `firstSeenAt`, and merges fields so newer non-empty values win while empty or poisoned values never replace a real one.
4. The Hugging Face client lists each category (two pages by default), applies the quality gate, and spends detail requests only on gate-passing models.
5. New models get `firstSeenAt = now` and `downloadsAtFirstSeen` as a growth baseline. Existing models are not re-added.
6. Derived `release` news is created for models with enough signal. Daily papers are upserted so upvotes refresh without duplicate rows.
7. Atom/RSS sources (runtime releases, r/LocalLLaMA) are merged by prefixed external id. A failing feed keeps its previous items.
8. Backfill passes fill missing detail fields and model-card excerpts, with their own caps and reserved headroom.
9. Manual category overrides from `data/overrides.json` are applied, the snapshot is sorted and capped, and `data/feed.json` is written.
10. `publish` uploads that file to Vercel Blob. The site picks it up within the cache window; no redeploy is triggered.

The workflow requires the repository secrets `HF_TOKEN` (optional but recommended) and `BLOB_READ_WRITE_TOKEN`.

> GitHub's scheduled runs can be delayed. The docs recommend triggering `workflow_dispatch` from cron-job.org if exact 10-minute cadence matters. The workflow supports both.

---

## Data model

The snapshot has two arrays:

```ts
interface Snapshot {
  generatedAt: string;
  models: ClassifiedModel[];
  news: SnapshotNews[];
}
```

### `ClassifiedModel` (abridged)

| Field | Meaning |
|---|---|
| `externalId` | Hugging Face repo id, e.g. `Qwen/Qwen-Image-2.1-Turbo` |
| `slug` | URL-safe id used by `/m/[slug]` |
| `name`, `author`, `url` | Display name, Hub author/org, Hub URL |
| `primaryCategory`, `categories` | Tab category and all matching categories |
| `pipelineTag`, `libraryName`, `license`, `licenseName` | Hub metadata |
| `createdAt`, `updatedAt` | Hugging Face repo dates |
| `firstSeenAt` | When the Radar first saw the row — this is what “new” means |
| `downloads`, `likes`, `trendingScore` | Hub metrics; `trendingScore` is null in practice |
| `downloadsAtFirstSeen` | Baseline for in-window growth; `null` means unknown |
| `gated` | Gated repos are excluded from the feed |
| `qualityPassed`, `gateReason` | Gate verdict and why (`likes`, `downloads`, `org`, `samples`, `failed`) |
| `paramsTotal`, `paramDtypes`, `storageBytes` | Safetensors parameter count/dtypes and repo storage |
| `quantizations`, `runners` | Detected from tags, files and safetensors |
| `vramEstGb` | Estimated weights + KV cache footprint |
| `sampleImages`, `spaces` | Card widget outputs and related Spaces |
| `files` | Weight files with sizes, capped at 40 |
| `cardSummary` | Plain-text model-card excerpt; `undefined` = never fetched, `null` = fetched and empty |
| `cardMeta` | Base model, datasets and languages from `cardData` |

### `SnapshotNews`

| Field | Meaning |
|---|---|
| `externalId` | Dedupe key; feed items are prefixed with their source key |
| `kind` | `paper`, `release`, `announcement`, `runtime`, `community` |
| `title`, `summary`, `thumbnail`, `url` | Display content and source link |
| `publishedAt`, `organization`, `upvotes` | Provenance and ranking signal |
| `modelSlug`, `categoryKey` | Optional link back to a model page |

News text is normalized before display: a missing byline stays absent, and poisoned values such as `"[object Object]"` never reach the UI.

### Storage limits

The writer caps the snapshot at **2,000 models** and **1,000 news rows**, dropping the oldest entries. This keeps one JSON file cacheable and cheap to read.

---

## Ingest pipeline

### Sources

**Hugging Face** is the model source of truth:

- `GET /api/models` — list by `pipeline_tag`, search term and creation date; cursor pagination is treated as opaque.
- `GET /api/models/{id}?full=true` — `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated`.
- `GET /api/trending?type=model` — the only response with `authorData.avatarUrl`.
- `GET /api/daily_papers` — roughly 50 papers per day.

**News feeds** (decision 3 was revised on 2026-10-15):

- Reddit `r/LocalLLaMA` Atom feed → `community`
- GitHub release Atom feeds for llama.cpp, Ollama and vLLM → `runtime`

Known-unusable sources are kept in the registry with `enabled: false` so nobody re-adds them blindly: Hugging Face has no blog RSS, and the users/organizations endpoints fail without a token.

### Request budget

Hugging Face allows **500 requests / 300 s per IP** unauthenticated. The ingest defaults to a **400-request** budget per run, with at most 300 detail lookups, 120 detail backfills and 80 model-card reads. A run that exhausts the budget finishes with what it fetched instead of crashing; the next run continues.

### Deduplication and history

- Model identity is `externalId`; news identity is `externalId`.
- Re-runs never duplicate a model or a news row.
- Merging keeps the earliest `firstSeenAt`, so history accumulates instead of regressing when a model leaves the listing window.
- A published snapshot and the repo snapshot are unioned, not replaced; newer non-empty values win, while empty or poisoned values are treated as missing.

---

## Classification, quality gate, runners and VRAM

### Categories

Nine model categories plus the news surface:

`llm`, `image`, `video`, `coding`, `audio`, `multimodal`, `embedding`, `vision`, `robotics`.

Rules live in `src/lib/classify/rules.ts` (pipeline tags, name regex, tag regex) and can be corrected per repo in `data/overrides.json`.

Precedence when several rules match:

```
coding > video > image > audio > multimodal > embedding > vision > robotics > llm
```

There is no `coding` pipeline tag on Hugging Face, so coding classification is deliberately regex-based.

The regression gate is `npm run classify-check`: 40 fixture repos must land in their expected category.

### Quality gate

A model passes if **any** of these is true:

- `likes >= 5`
- `downloads >= 50`
- the author is in the curated org list
- the model card has sample outputs (widget or sample files)

Gated repos never enter the feed. Gate-failed rows are only stored when they have at least `likes >= 1`, `downloads >= 10`, or a curated author.

The gate is a **user-facing filter**, not an invisible rule: the feed defaults to “Passed only” and offers “Show everything”. That view is restricted to windows of 30 days or less inside a category, so the result set cannot explode.

### Runners and quantization

Runner detection combines the Hub library name, tags and weight filenames:

`llama.cpp`, `Ollama`, `MLX`, `vLLM`, `ComfyUI`, `transformers`, `ExLlama`, `koboldcpp`, `llamafile`, `Core ML`, `OpenVINO`, `ONNX`.

Quantizations come from tags, filenames and safetensors dtypes (`Q4_K_M`, `FP8`, `AWQ`, `GPTQ`, `MLX-4BIT`, …).

### VRAM estimate

The UI shows an approximate footprint:

```
weights = params × bytes_per_param(quantization)
KV cache = 0.15 GB per billion params at 4096 tokens
VRAM ≈ weights + KV cache
```

It is explicitly an estimate and is displayed with `~`. A 7B model at BF16 is roughly 15 GB; at Q4 it is roughly 5 GB.

---

## Routes and API

All page routes are locale-prefixed (`/en/...`, `/tr/...`). The middleware redirects unknown first segments to a locale and 308s old filter URLs to `/models`.

### Pages

| Route | Purpose |
|---|---|
| `/{locale}` | Broadsheet front page: edition figures, most-downloaded band, lead story, rail |
| `/{locale}/models` | Filterable model index: window, sort, runner, params, license, search, pagination |
| `/{locale}/c/{category}` | Category feed with the same filters; tab badges describe the feed they open |
| `/{locale}/m/{slug}` | Model detail: specs, quantizations, files, VRAM, run command, card excerpt, related news |
| `/{locale}/news` | Releases, runtime updates and community posts (papers excluded) |
| `/{locale}/research` | Hugging Face daily papers |
| `/{locale}/n/{id}` | News detail with source attribution and linked model |
| `/{locale}/stats` | Data Desk: totals, categories, gate breakdown, cadence, tracking, runners, news wire |
| `/{locale}/compare?ids=…` | Comparison sheet for up to four models |
| `/{locale}/glossary` | Bilingual glossary index with search |
| `/{locale}/glossary/{slug}` | Glossary entry with evidence, examples and cross-references |

### Generated / machine routes

| Route | Purpose |
|---|---|
| `/feed.rss?lang=en&category=image` | RSS mirror of `/news` (papers excluded) |
| `/sitemap.xml` | Indexable pages only, localized, with alternates and real `lastModified` |
| `/robots.txt` | Search crawlers allowed; training crawlers denied; `/api/` disallowed |
| `/{locale}/opengraph-image` and entity OG routes | 1200×630 social images |

### JSON API

| Route | Notes |
|---|---|
| `GET /api/categories` | Category keys and bilingual labels; `s-maxage=900` |
| `GET /api/feed?category=video&window=7d&sort=trending&runner=gguf&maxParams=13&license=open&gate=passed&q=ltx&page=1` | Returns `{ query, total, pages, count, models }`; page is clamped; `s-maxage=900` |
| `GET /api/models/{slug}` | One model or `404`; `s-maxage=900` |
| `GET /api/news?window=7d&scope=news&category=video&kind=release` | `scope` is `news`, `research` or `all`; `s-maxage=300` |
| `GET /api/stats?window=30d&gate=passed` | One Data Desk board: `totals`, `categories`, `gateReasons`, `cadence`, `tracking`, `runners`, `wire` |
| `POST /api/ingest/run` | Secret-protected and intended for local/dev only; production ingest runs in Actions |

API routes are rate-limited per IP (60 requests / minute) by the middleware. The limiter is in-memory, so on Vercel it is per function instance, not global.

Query parsing is deliberately forgiving: blank values mean “not set”, every enum/number field falls back to a default, and a hand-edited `?window=abc&page=0` degrades to a valid view instead of a 500.

---

## Internationalization

- Locales: `en` (default) and `tr`.
- Dictionaries: `src/i18n/dictionaries/en.json` and `tr.json`, flat keys.
- UI strings live only in those dictionaries, never in source code.
- The middleware detects `Accept-Language`, redirects `/` to `/{locale}`, and emits `Vary: Accept-Language`.
- Category labels and glossary entries are bilingual; entity facts (repo ids, numbers) are not translated.
- Dates and numbers use locale-aware formatting.

The docs convention is mirrored: **EN is the source of truth, TR is the mirror**. Every document exists in `docs/en/` and `docs/tr/`.

---

## SEO and crawler policy

- Every page emits a canonical URL and `en` / `tr` / `x-default` alternates.
- List pages with filters or pagination are `noindex, follow`; a crawler can still fetch them and read the directive.
- Model pages are indexable when they report at least six specs, or pass the gate with four specs or 200 characters of card prose. Near-empty pages stay reachable but `noindex`.
- News pages are indexable; papers need a substantial summary.
- JSON-LD is emitted for articles, models, glossary entries and list pages.
- OG images are generated per page segment at 1200×630.
- The sitemap advertises indexable model/news pages, not every row, and carries real modification dates.
- `robots.txt` uses a search-only policy: wildcard search engines are allowed; training/fetch crawlers in `TRAINING_CRAWLERS` are denied; answer engines that cite and link are allowed.
- `/api/` is disallowed for crawlers so crawl budget stays on pages.

---

## Caching

| Layer | TTL |
|---|---|
| Snapshot in-process cache | 15 minutes (`900_000` ms) |
| `/api/feed`, `/api/categories`, `/api/models/*`, `/api/stats` | `s-maxage=900` |
| `/api/news`, `/feed.rss` | `s-maxage=300` |
| Sitemap revalidation | 900 seconds |
| Page rendering | reads the same cached snapshot |

A data update never triggers a redeploy. The Blob object changes and the app picks it up after the cache window.

---

## Deployment

### Vercel

1. Import the repository into Vercel.
2. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin.
3. Set `BLOB_READ_WRITE_TOKEN` (and optionally `SNAPSHOT_URL`) for snapshot reads.
4. Set `INGEST_SECRET`, verification tokens and `NEXT_PUBLIC_REPO_URL` if needed.
5. Deploy. The build does not require a database.

No build-time data fetch is required: the committed `data/feed.json` is the fallback.

### GitHub Actions

Add repository secrets:

- `BLOB_READ_WRITE_TOKEN` — required for `npm run publish`.
- `HF_TOKEN` — optional, raises the Hugging Face rate limit.

The `ingest` workflow runs `sources-check` → `ingest` → `classify-check` → `publish`. The `seo` workflow runs typecheck, lint, unit tests and the offline SEO audit on `main` and on PRs that touch routes, SEO code, the snapshot or `package.json`.

### Why the ingest is not an API route

Vercel functions have timeouts and a read-only filesystem. `POST /api/ingest/run` exists for local development and returns `501` when it cannot write the snapshot. Production ingest must run in Actions (or another writable worker) and publish to Blob.

---

## Testing and CI

- **Unit tests:** `tests/*.test.ts`, run with `tsx --test` (node:test). 25 files cover classification, gate, query parsing, snapshot/store behavior, RSS, SEO, stats, compare, glossary, i18n, middleware, OG text, model mentions, VRAM, card text and feed parsing.
- **Fixtures:** `tests/fixtures/` holds feed and classification fixtures. `npm run sources-check -- --dry` uses offline fixtures.
- **Regression gate:** `npm run classify-check` requires all 40 fixture models to land in their expected category.
- **CI:** `.github/workflows/seo.yml` runs `typecheck`, `lint`, `test` and `seo-audit` on `main` and relevant PRs.
- **Data CI:** `.github/workflows/ingest.yml` runs the source health check, ingest, classification gate and publish.
- **UI checks:** the browser-driven scripts (`verify-ui`, `verify-nav`, `verify-theme`, `verify-glossary`, `check-overflow`, `contrast`, `type-census`, `screenshot`) are developer tools for a running server and a Chrome DevTools Protocol port; they are not part of the CI workflow.

Before opening a PR:

```bash
npm run typecheck
npm run lint
npm test
npm run seo-audit
```

If you changed classification rules, also run `npm run classify-check`.

---

## Repository layout

```
local-ai-news/
├── .github/workflows/
│   ├── ingest.yml              # 10-minute data job
│   └── seo.yml                 # typecheck, lint, tests, SEO audit
├── data/
│   └── feed.json               # committed fallback snapshot
├── docs/
│   ├── README.md               # documentation index
│   ├── en/                     # source-of-truth docs
│   └── tr/                     # mirrored Turkish docs
├── scripts/                    # ingest, publish, audits, measurements
├── src/
│   ├── app/
│   │   ├── [locale]/           # pages: front, models, categories, model, news,
│   │   │                       # research, stats, compare, glossary, OG images
│   │   ├── api/                # categories, feed, models, news, stats, ingest
│   │   ├── feed.rss/           # RSS route
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/             # shell, feed, front page, compare, glossary, UI
│   ├── i18n/                   # locale loader + en/tr dictionaries
│   ├── lib/
│   │   ├── classify/           # category rules + quality gate
│   │   ├── runner/             # runner detection, quantization, VRAM, commands
│   │   ├── sources/            # HF client, feed parser, source registry
│   │   ├── store.ts            # snapshot loader + all read queries
│   │   ├── ingest.ts           # ingest pipeline and merge logic
│   │   ├── query.ts            # Zod query parsing and normalization
│   │   ├── seo.ts              # metadata, index policy, crawler lists
│   │   ├── stats.ts            # Data Desk board builder
│   │   ├── compare.ts          # comparison rows and delta logic
│   │   ├── glossary.ts         # bilingual glossary content
│   │   └── ...
│   └── middleware.ts           # locale redirects, API rate limit, platform paths
├── tests/                      # node:test suites + fixtures
├── .env.example
├── next.config.ts
├── package.json
└── README.md / README.tr.md
```

---

## Conventions

- **Code, comments, commit messages, JSON keys and test names are English.**
- **Commits follow Conventional Commits**, e.g. `feat(classify): add coding-category regex rules`.
- **UI strings live in the dictionaries**, never in JSX or route code.
- **Docs are bilingual:** `docs/en/*` is the source of truth, `docs/tr/*` is the mirror. Add both when adding a document.
- **No database:** the snapshot is the contract. If relational queries or per-user state become necessary, that is a documented decision reversal, not an incidental change.
- **Measure before claiming:** the docs record measured numbers and the reason a rule exists. Keep that habit when changing UI or data behavior.

---

## Known constraints and gotchas

- **Hugging Face rate limit:** 500 requests / 300 s per IP unauthenticated. A browser-side SPA would be blocked; ingest and caching are server-side by design.
- **`pipeline_tag` can be null.** Rules must tolerate it.
- **The list endpoint does not return `safetensors`**, even with `?full=true`. Runner detection can use `siblings` for free; parameter counts cost one detail request per model.
- **Cursor pagination is opaque.** Carry the `cursor` string; never parse the base64 blob.
- **`firstSeenAt` is not `createdAt`.** Re-uploads keep the old Hub creation date; “new” means first observation by the Radar.
- **`trendingScore` is null** on every model in the current snapshot, so the trending sort derives a score from likes and downloads. The UI does not pretend the derived value is a Hub fact.
- **Avatar endpoints fail without a token**, so avatars come only from the trending response, with a monogram fallback.
- **Reddit requires a browser User-Agent** and rate-limits bursts. A failed feed keeps its previous items.
- **Poisoned news labels exist** in older snapshots (`organization: "[object Object]"`). The read path normalizes them, and the merge overwrites them on the next ingest.
- **`cardSummary` uses `undefined` vs `null` deliberately:** `undefined` means “never fetched”, `null` means “fetched and empty”, so an empty README is not re-read every run.
- **The in-memory API rate limiter is per instance**, not global. Replace it with a shared store if abuse appears.
- **Compare is capped at four models.** More ids are named in the UI, not silently dropped.
- **The committed snapshot can lag production.** Use `scripts/fetch-snapshot.ts` when measuring live data.
- **Vercel platform paths** (`/_next`, `/_vercel`) bypass locale redirects; otherwise the analytics collector and static assets 404.
- **A data update does not rebuild the site.** If a page looks stale, check the snapshot cache window and the Blob publish step.

---

## Documentation

The full plans, measurements and decision log live under `docs/`. English is the source of truth; Turkish is mirrored.

| Document | English | Turkish |
|---|---|---|
| Documentation index | [docs/README.md](docs/README.md) | — |
| Product plan | [PLAN.md](docs/en/PLAN.md) | [PLAN.md](docs/tr/PLAN.md) |
| Decisions log | [DECISIONS.md](docs/en/DECISIONS.md) | [DECISIONS.md](docs/tr/DECISIONS.md) |
| Data storage (no Postgres) | [DATA-STORAGE.md](docs/en/DATA-STORAGE.md) | [DATA-STORAGE.md](docs/tr/DATA-STORAGE.md) |
| Source inventory | [SOURCES.md](docs/en/SOURCES.md) | [SOURCES.md](docs/tr/SOURCES.md) |
| Category rules | [CATEGORIES.md](docs/en/CATEGORIES.md) | [CATEGORIES.md](docs/tr/CATEGORIES.md) |
| News pipeline | [NEWS-PLAN.md](docs/en/NEWS-PLAN.md) | [NEWS-PLAN.md](docs/tr/NEWS-PLAN.md) |
| Compare sheet | [COMPARE-PLAN.md](docs/en/COMPARE-PLAN.md) | [COMPARE-PLAN.md](docs/tr/COMPARE-PLAN.md) |
| Stats desk | [STATS-PLAN.md](docs/en/STATS-PLAN.md) | [STATS-PLAN.md](docs/tr/STATS-PLAN.md) |
| Glossary | [GLOSSARY-PLAN.md](docs/en/GLOSSARY-PLAN.md) | [GLOSSARY-PLAN.md](docs/tr/GLOSSARY-PLAN.md) |
| SEO | [SEO-PLAN.md](docs/en/SEO-PLAN.md) | [SEO-PLAN.md](docs/tr/SEO-PLAN.md) |
| Design system | [DESIGN.md](docs/en/DESIGN.md) | [DESIGN.md](docs/tr/DESIGN.md) |
| Design v2 audit | [DESIGN-V2.md](docs/en/DESIGN-V2.md) | [DESIGN-V2.md](docs/tr/DESIGN-V2.md) |
| Design v3 (broadsheet) | [DESIGN-V3.md](docs/en/DESIGN-V3.md) | [DESIGN-V3.md](docs/tr/DESIGN-V3.md) |

---

## Not implemented yet

- Admin override panel (the `data/overrides.json` escape hatch exists, but there is no UI).
- Email digest.
- Local Ollama integration (`localhost:11434/api/tags`).
- Further external news sources beyond the current runtime/community feeds — that requires an explicit decision, not an incidental addition.

---

## License

MIT. See [LICENSE](LICENSE).
