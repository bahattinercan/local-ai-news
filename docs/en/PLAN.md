# Local AI News - Detailed Plan v2 (EN)

> Turkish mirror: [docs/tr/PLAN.md](../tr/PLAN.md)
>
> **Update 2026-10-14:** decision 2 (Neon Postgres) was reversed - there is no
> database. See [DATA-STORAGE.md](DATA-STORAGE.md).

**Product:** a public website that tracks newly released **locally runnable (open-weight) AI models** by category tabs, with a news feed that updates on a schedule.

All API claims below were measured against the live Hugging Face API on 2026-10-13.

---

## 1. Locked decisions

| # | Decision | Detail |
|---|---|---|
| 1 | **Next.js (App Router) + TypeScript** | SSR/ISR + API routes in one package; avoids browser-side HF rate limiting |
| 2 | **Neon Postgres** | ingest writes directly; the Vercel app only reads |
| 3 | **Hugging Face only** as data source | no Ollama scrape, no OpenRouter, no GitHub releases in v1 |
| 4 | **TR + EN** | locale routing `/en`, `/tr`; strings only in dictionary files |
| 5 | **Default freshness window: 7 days** | presets 24h / 7d / 30d / 90d |
| 6 | **News updates regularly** | ingest every 10 min, `/news` page, generated RSS output |
| 7 | **Code fully English** | identifiers, comments, JSON keys, test names, commits |
| 8 | **Docs bilingual** | `docs/en/*` (source of truth) + `docs/tr/*` (mirror), `docs/README.md` index |
| 9 | **Quality gate is a user-facing filter** | `quality_passed` column + "Show everything" toggle (default off) |
| 10 | **News includes derived release announcements** | not only daily papers |
| 11 | **Public site** | SEO, structured data, abuse protection, attribution, growth caps |

---

## 2. Product name & domain

RDAP-checked on 2026-10-13 (`rdap.org`): **404 = not registered at check time**, 200 = already registered. Availability can change; `.news` TLD has registrar restrictions that RDAP does not show.

| Name | Domain | RDAP |
|---|---|---|
| **OpenWeight Radar** | openweightradar.com | ✅ 404 (available) |
| **Local Model News** | localmodel.news | ✅ 404 (available) |
| **Local Weights Radar** | localweightradar.com | ✅ 404 (available) |
| **OpenWeight Watch** | openweightwatch.com | ✅ 404 (available) |
| **Localweight News** | localweight.news | ✅ 404 (available) |
| Local AI Radar | localairadar.com | ❌ taken |
| RunLocal | runlocal.ai | ❌ taken |
| Local AI News | localai.news | ❌ taken |
| Model Pulse | modelpulse.ai | ❌ taken |

**Recommendation: `OpenWeight Radar` (openweightradar.com).**
Reason: "AI" is ambiguous and already taken in the good slots; "open-weight" is the precise thing this site tracks, and it covers image/video/audio/coding models, not only LLMs. "Local" is expressed by the filter, not the brand. Runner-up if you want the news angle: **localmodel.news**.

Brand rules: name in English (decision 7), TR UI uses the same brand name untranslated.

---

## 3. Scope definition - what counts as a "local AI model"

A record enters the feed only if:

1. Weights are downloadable → `gated: false` (field confirmed present).
2. At least one local runner can serve it: `llama.cpp`, `Ollama`, `MLX`, `vLLM`, `transformers`, `diffusers/ComfyUI`, `koboldcpp`, `ExLlama`, `llamafile`.
3. Closed-API models (OpenAI/Google closed) are **not** listed as models - they only appear in news.

Shown in the UI as a **"Runs locally"** badge, filterable.

---

## 4. Category taxonomy (tabs)

| # | Tab (EN) | Tab (TR) | Key | Rule |
|---|---|---|---|---|
| 1 | Language / LLM | Dil / LLM | `llm` | `pipeline_tag = text-generation` |
| 2 | Image | Görüntü | `image` | `text-to-image`, `image-generation`, `image-to-image`, `image-editing` |
| 3 | Video | Video | `video` | `text-to-video`, `image-to-video`, `video-generation`, `video-to-video` |
| 4 | Coding | Kod | `coding` | `text-generation` + tag/name regex (`code`, `coding`, `coder`, `codex`, `swe`, `agentic`) or curated org list |
| 5 | Audio | Ses | `audio` | `automatic-speech-recognition`, `text-to-speech`, `audio-to-text`, `music-generation`, `audio-classification` |
| 6 | Multimodal | Çoklu Mod | `multimodal` | `visual-question-answering`, `image-to-text`, `document-question-answering` |
| 7 | Embedding / RAG | Gömme / RAG | `embedding` | `feature-extraction`, `sentence-similarity`, reranker signals |
| 8 | Vision / CV | Görme / CV | `vision` | `object-detection`, `image-segmentation`, `depth-estimation`, `zero-shot-image-classification`, `image-classification` |
| 9 | Robotics / Agent | Robotik / Agent | `robotics` | `robotics`, `visual-document-retrieval`, function-calling signals |
| 10 | News | Haber | `news` | daily papers + derived release announcements |

Tab bar: `All · Language · Image · Video · Coding · Audio · Multimodal · Embedding · Vision · Robotics · News` (11 tabs incl. All).

Notes:
- **No `coding` pipeline_tag exists** → rule-based classification is mandatory.
- A model can belong to several categories (`model_categories`); `primary_category` drives the tab.
- Rules live in `categories.match_rules` JSONB, not hardcoded.
- `category_overrides` for manual corrections.

---

## 5. Data sources (HF only, measured)

| Endpoint | Status | Notes |
|---|---|---|
| `GET /api/models?pipeline_tag=X&sort=createdAt&limit=N` | ✅ 200 | `sort`: `createdAt`, `lastModified`, `downloads`, `likes`, `trendingScore` |
| `GET /api/models?tag=gguf` | ✅ | combinable with `pipeline_tag` |
| `GET /api/models/{id}?full=true` | ✅ | `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated`, `model-index` |
| `GET /api/trending?type=model` | ✅ | `recentlyTrending[].repoData`, includes `authorData.avatarUrl` |
| `GET /api/daily_papers` + `?date=YYYY-MM-DD` | ✅ | 50/day; `title`, `summary`, `thumbnail`, `organization`, `githubRepo`, `upvotes`, `publishedAt` |
| `Link: <...&cursor=base64>; rel="next"` | ✅ | opaque string, never parse |
| `Access-Control-Allow-Origin` | ✅ reflected | still call from the server |
| `RateLimit-Policy: fixed window; "api"; q=500; w=300` | ⚠️ | **500 requests / 300 s per IP** |
| `https://huggingface.co/blog.rss` | ❌ **404** | no blog RSS |
| `GET /api/users/{name}`, `GET /api/organizations/{name}` | ❌ **error without token** | avatars come only from the trending response |
| `X-Total-Count` | not returned on `limit=1` | counts computed from our DB |

**Important asymmetry (measured):** `?full=true` on the *list* endpoint returns `siblings` but **not** `safetensors`. So:
- runner detection from `siblings` filenames → no extra request
- real parameter count (`safetensors.parameters`) → requires one detail request per model, only for gate-passing models

Live sample:
```
text-to-video, sort=createdAt
  OsmanKhalidSiddiqui/CogVideoX-2b              2026-10-13  diffusers
  robertbschuette/LTX-2.3-uncensored-v1.4-FP8   2026-10-13  gguf
  unsloth/LTX-2.5-FP8                           2026-10-13  diffusers
text-to-image, sort=createdAt
  Qwen/Qwen-Image-2.1-Turbo   likes 688 · downloads 9665 · safetensors BF16 7.115B params
```

---

## 6. Architecture

```
                    ┌──────────────────────────────┐
                    │  Ingest worker (GH Actions)  │
                    │  every 10 min via cron-job.org│
                    │  → workflow_dispatch         │
                    └───────────────┬──────────────┘
                                    │ writes
                                    ▼
                          Neon Postgres (models, news, ...)
                                    │ reads
                    ┌───────────────▼──────────────┐
                    │  Next.js on Vercel           │
                    │  ISR 900s + API routes       │
                    │  per-IP rate limit middleware │
                    └───────────────┬──────────────┘
                                    ▼
                          React UI (tabs, feed, detail, news)
```

**Ingest runs outside the web app** because of Vercel function timeouts + the HF budget. Single writer only - the public site never proxies HF.

**Request budget per run (must stay under 500/300s):**

| Work | Requests |
|---|---|
| 10 categories × 2 pages | 20 |
| trending + daily papers | 2 |
| detail fetch, gate-passing models only (~30) | 30 |
| headroom / retries | 40 |
| **Total** | **~92** |

On `429`, back off using `Retry-After` and skip the remaining categories for that run.

---

## 7. Schema (Drizzle, Neon)

```sql
sources (
  key TEXT PRIMARY KEY,
  base_url TEXT NOT NULL,
  tier SMALLINT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_status SMALLINT,
  last_run_at TIMESTAMPTZ,
  note TEXT
)

categories (
  key TEXT PRIMARY KEY,
  label_en TEXT NOT NULL,
  label_tr TEXT NOT NULL,
  match_rules JSONB NOT NULL,
  sort_order SMALLINT NOT NULL
)

models (
  id BIGSERIAL PRIMARY KEY,
  source_key TEXT NOT NULL REFERENCES sources(key),
  external_id TEXT NOT NULL,              -- "Qwen/Qwen-Image-2.1-Turbo"
  slug TEXT NOT NULL,                     -- url-safe form of external_id
  name TEXT NOT NULL,
  author TEXT,
  author_avatar TEXT,                     -- only available from trending response
  primary_category TEXT NOT NULL REFERENCES categories(key),
  pipeline_tag TEXT,                      -- ⚠️ nullable, confirmed
  library_name TEXT,
  license TEXT,
  license_name TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL,     -- "new" is defined by this
  downloads INTEGER,
  likes INTEGER,
  trending_score INTEGER,
  gated BOOLEAN,
  quality_passed BOOLEAN NOT NULL DEFAULT false,
  gate_reason TEXT,                       -- 'likes' | 'downloads' | 'org' | 'samples' | 'failed'
  params_total BIGINT,                    -- safetensors.parameters (detail request)
  param_dtypes JSONB,
  storage_bytes BIGINT,                   -- usedStorage
  quantizations JSONB,
  runners JSONB,
  vram_est_gb REAL,
  sample_images JSONB,
  spaces JSONB,
  url TEXT NOT NULL,
  UNIQUE (source_key, external_id)
)

model_categories (model_id BIGINT REFERENCES models(id) ON DELETE CASCADE,
                  category_key TEXT REFERENCES categories(key),
                  PRIMARY KEY (model_id, category_key))

model_tags (model_id BIGINT REFERENCES models(id) ON DELETE CASCADE,
            tag TEXT NOT NULL, PRIMARY KEY (model_id, tag))

news (
  id BIGSERIAL PRIMARY KEY,
  source_key TEXT NOT NULL REFERENCES sources(key),
  external_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('paper','release','announcement')),
  title TEXT NOT NULL,
  summary TEXT,
  thumbnail TEXT,
  url TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  organization TEXT,
  upvotes INTEGER,
  model_id BIGINT REFERENCES models(id),
  category_key TEXT REFERENCES categories(key),
  UNIQUE (source_key, external_id)
)

category_overrides (external_id TEXT PRIMARY KEY, category_key TEXT NOT NULL, note TEXT)

ingest_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  source_key TEXT NOT NULL,
  items_total INTEGER NOT NULL DEFAULT 0,
  items_new INTEGER NOT NULL DEFAULT 0,
  items_gate_passed INTEGER NOT NULL DEFAULT 0,
  requests_used INTEGER NOT NULL DEFAULT 0,
  error TEXT
)

CREATE INDEX idx_feed_new ON models (primary_category, first_seen_at DESC);
CREATE INDEX idx_feed_gate ON models (primary_category, quality_passed, first_seen_at DESC);
CREATE INDEX idx_feed_trending ON models (primary_category, trending_score DESC);
CREATE INDEX idx_news_published ON news (published_at DESC);
CREATE INDEX idx_news_kind ON news (kind, published_at DESC);
CREATE INDEX idx_tags ON model_tags (tag);
```

**Critical:** `first_seen_at` ≠ `created_at`. Re-uploads keep the old `createdAt`; "new" means first observation.

---

## 8. Quality gate (decision 9: it is a filter, not just an internal rule)

Gate passes if any of:
- `likes ≥ 5`
- `downloads ≥ 50`
- author in the curated org list
- `cardData.widget` has sample outputs

Behaviour:
- `quality_passed` + `gate_reason` are stored, so the UI can show **why** a model is in the feed.
- UI toggle **"Show everything" / "Her şeyi göster"** - default off. When on, it shows gate-failed rows with a muted badge.
- "Show everything" is restricted to windows ≤ 30 days and requires `category` to be set, otherwise result sets explode.
- Gate-failed models are **not stored raw** unless they at least have `likes ≥ 1` or `downloads ≥ 10` or a curated author. Otherwise skipped entirely.

**Growth caps (public site):**
- ingest window limited to models created in the last 90 days
- max 200 items per category per run
- expected volume: ~150 gate-passing models/day → ~55k rows/year (fine for Neon)

---

## 9. News pipeline (decision 10)

Three kinds, all HF-only:

1. **`paper`** - `daily_papers` (50/day), upserted so `upvotes`/discussion changes are reflected.
2. **`release`** - derived from the model feed: `first_seen_at` inside the window **and** `quality_passed` **and** (`trending_score ≥ 100` **or** `likes ≥ 50` **or** curated org).
3. **`announcement`** - daily papers whose `organization` is in the curated org list, or a model that spikes in `trendingScore` between two runs.

Rules:
- A paper and a derived release for the same model are separate rows but share `model_id` → the news card links to the model detail page.
- News is **upsert**, never insert-only.
- Cadence: every 10 min, cron-job.org → `workflow_dispatch` (GitHub's own `schedule` cron is throttled).
- `/news` shows "updated X min ago"; ISR 300s.
- The site also **produces** `/feed.rss` per category and per language.
- External blogs (marktechpost, JetBrains) are out of v1 - that would break decision 3.

---

## 10. Public-site requirements (decision 11)

- **SEO:** hreflang pairs per page (`/en/...` + `/tr/...`), canonical URLs, `sitemap.xml` per locale, `robots.txt` allowing crawlers.
- **Structured data:** JSON-LD `Article` for news, `CreativeWork` for model pages (name, author, url, datePublished = `created_at`, image = first sample).
- **OG images:** use `cardData.widget` output image when present, otherwise a generated card.
- **Attribution:** every model card links to its HF page and shows the author. Avatar is only obtainable from the trending response (`authorData.avatarUrl`) - `/api/users/{name}` and `/api/organizations/{name}` return errors without a token, so use a monogram fallback.
- **Abuse protection:** our own API routes are rate-limited per IP (Vercel middleware, ~60 req/min), DB-only reads, no HF proxying.
- **License display:** `license` + `license_name` shown per model; models with `license: other` get a warning badge.
- **Analytics:** Plausible or Vercel Analytics. KPIs: DAU, feed CTR, category distribution, RSS subscriber count, gate-pass rate.
- **Legal:** no scraping beyond the public API; respect `gated`; keep a takedown/contact route.

---

## 11. i18n (TR + EN)

- Locale routing `/en/...`, `/tr/...`; default `en`, `Accept-Language` fallback.
- Dictionaries `src/i18n/en.json`, `src/i18n/tr.json`, flat keys.
- **Code stays English** (decision 7): translated strings never appear in source code.
- Category labels come from DB (`label_en`, `label_tr`).
- Dates/numbers via `Intl.DateTimeFormat(locale)`.

---

## 12. UI / UX

### Routes
```
/en, /tr                            → feed (tab: All)
/en/c/[category], /tr/c/[category]  → category feed
/en/m/[id],   /tr/m/[id]            → model detail
/en/news,     /tr/news              → news feed (filter by kind)
/en/compare?ids=a,b                 → comparison
/en/stats                           → the Data Desk (docs/en/STATS-PLAN.md)
```

### Feed card
```
┌───────────────────────────────────────────────┐
│ [preview]  OpenWeight Radar · Image            │
│            Qwen/Qwen-Image-2.1-Turbo          │
│            diffusers · 7.1B params            │
│            🔵 New (3 days) · ♥ 688 · ⬇ 9.6k    │
│            Runners: ComfyUI · GGUF · MLX       │
│            VRAM ~12 GB · license: other        │
└───────────────────────────────────────────────┘
```

### Filters
- Window: 24h / **7d (default)** / 30d / 90d
- Sort: New · Trending · Downloads · Likes
- Runner: llama.cpp / Ollama / vLLM / ComfyUI / MLX
- Size: ≤3B, ≤8B, ≤13B, ≤30B, 30B+
- Quantization: GGUF / FP8 / AWQ / MLX
- License: open / research / other
- Gate: non-gated only
- **Quality gate: Passed only (default) / Show everything**
- Saved filter presets (localStorage)

### Model detail
Preview images, quant file list with sizes, copyable run command, VRAM estimate, HF link, license, spaces using the model, related models, gate reason.

### Theme
`data-theme` + Tailwind v4 `@theme inline` token layer (no `--color-*` collisions), lucide-react.

---

## 13. API routes

```
GET  /api/categories
GET  /api/feed?category=video&window=7d&sort=trending&runner=gguf&max_params=13&license=open&gate=passed&q=ltx
GET  /api/models/:slug
GET  /api/news?window=7d&category=video&kind=paper|release|announcement
GET  /api/stats?window=30d&gate=passed
GET  /feed.rss?category=&lang=
POST /api/ingest/run        (secret-protected, called by cron)
```

Zod schema per query, `limit` max 100, `Cache-Control: public, s-maxage=900`.

---

## 14. Repo structure

```
openweight-radar/            (repo name; product name in docs)
├── docs/
│   ├── README.md            (index → en/ and tr/)
│   ├── en/PLAN.md
│   └── tr/PLAN.md
├── src/
│   ├── app/                 (App Router: pages + api routes)
│   ├── i18n/                (en.json, tr.json)
│   ├── lib/
│   │   ├── db/              (drizzle schema + client)
│   │   ├── sources/         (registry.ts, adapters/hf.ts)
│   │   ├── classify/        (rules, quality gate)
│   │   └── runner/          (runner detection + VRAM estimate)
│   └── components/
├── scripts/
│   ├── verify-sources.ts    (SOURCE HEALTH report, --dry)
│   └── ingest.ts
├── .github/workflows/ingest.yml
└── package.json
```

---

## 15. Conventions

- **Code in English** - identifiers, comments, JSON keys, test names, commit messages.
- **Commits:** Conventional Commits, English subject + body.
  `feat(classify): add coding-category regex rules`
- **Docs bilingual:** every doc as `docs/en/x.md` + `docs/tr/x.md`; EN is source of truth.
- Category labels stored bilingually in DB.

---

## 16. Phases

### F0 - Scaffold + source verification (1 day)
- Next.js + TS + Tailwind v4, `next-intl`, Drizzle + Neon.
- `scripts/verify-sources.ts` → SOURCE HEALTH table for the 5 working endpoints + the 2 known-broken ones (blog.rss, users/organizations).
- **Acceptance:** `npm run sources-check` green on working endpoints, `--dry` works offline with fixtures.

### F1 - Ingest core (2 days)
- HF adapter (pagination, cursor, backoff, budget guard, caps), schema, dedup, quality gate, classifier, runner detection, VRAM.
- **Acceptance:** one run inserts ≥150 gate-passing models; category distribution printed; second run `items_new = 0`; requests used < 100.

### F2 - Feed UI + tabs (2 days)
- Tab bar, cards, filters incl. the gate toggle, empty states, skeletons, dark mode, dictionaries.
- **Acceptance:** headless Chrome screenshots at 375/768/1280 px show no horizontal overflow; 11 tabs render in both languages; gate toggle changes the result set.

### F3 - Model detail (2 days)
- `/m/[slug]`, quant files, copyable run command, VRAM, samples, spaces, gate reason.
- **Acceptance:** 10 sampled models have correct runner/quant/VRAM fields; widget previews render.

### F4 - News pipeline (2 days)
- Daily papers ingest + upsert, derived `release` announcements, news page with kind filter, model linking, generated RSS, cron wiring.
- **Acceptance:** a paper appears within 10 min; re-run updates `upvotes` without duplicating rows; derived releases appear for a spike; `/feed.rss` validates.

### F5 - Deploy + public-site plumbing (1 day)
- Vercel, ISR, per-IP rate limit, sitemap/hreflang/JSON-LD, analytics, GitHub Actions ingest job, health report committed.
- **Acceptance:** production deploy, cron fires on schedule, `/stats` shows weekly per-category counts, Lighthouse SEO score > 95.

### F6 - v2 extras
Comparison page, weekly charts, saved filters, admin override panel, local Ollama integration (`localhost:11434/api/tags`), email digest, external news sources (needs a decision to break decision 3).

---

## 17. Testing

- **Unit:** classifier rules, quality gate, VRAM formula, dedup, RSS generation, hreflang/sitemap generation.
- **Integration:** `verify-sources.ts --dry` against fixtures (no network).
- **Regression gate:** `npm run classify-check` - 40 fixture models → expected categories.
- **UI:** headless Chrome screenshots (viewport sweep + mobile widths).

---

## 18. Risks / pitfalls (measured)

1. **HF limit 500 req / 300 s per IP** - a browser-side SPA would be blocked on launch day. Server-side ingest + cache is mandatory.
2. **`pipeline_tag` can be null** - observed as a `KeyError` in a live probe.
3. **Noise** - personal LoRA sellers dominate `sort=createdAt`; without the gate the feed is unusable.
4. **No HF blog RSS (404)** - news relies on daily papers + derived releases.
5. **`/api/users/{name}` and `/api/organizations/{name}` error without token** - avatars only from the trending response.
6. **`safetensors` is not in the list response** - needs one detail request per gate-passing model.
7. **Cursor pagination** - base64 blob, opaque string, never parse.
8. **"New" definition** - `first_seen_at`, not `created_at`.
9. **Gated models** - excluded from the feed, keep a filter toggle.
10. **Category rules drift** - curated org list goes stale; `category_overrides` is the escape hatch.
11. **Public-site growth** - cap ingest to 90 days and 200 items/category/run, or "Show everything" bloats Neon.
12. **Vercel cron limits** - use cron-job.org + `workflow_dispatch`, not GitHub's `schedule`.
13. **Domain availability is a snapshot** - RDAP 404 today can be registered tomorrow; `.news` has registrar restrictions.

---

## 19. Plan self-check (what changed in v2)

- Added: product name + measured RDAP availability.
- Added: quality gate as a user-facing filter with `quality_passed` / `gate_reason` columns and storage caps.
- Added: derived `release` announcements + `kind` filter + upsert requirement.
- Added: public-site section (SEO, JSON-LD, hreflang, attribution, per-IP rate limit, analytics, legal).
- Corrected: `safetensors` is **not** returned by the list endpoint even with `?full=true` - only `siblings` is. Runner detection is free, param count costs one request.
- Corrected: avatar endpoints do not work without a token.
- Removed from v1 scope: Ollama scrape, OpenRouter, GitHub releases (decision 3).
- Confirmed still valid: rate limit numbers, sort values, tag filter, cursor pagination, daily papers date param, `pipeline_tag` nullability, blog.rss 404.
