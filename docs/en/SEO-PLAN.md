# SEO plan — from 252 advertised URLs to a findable archive

> Turkish mirror: [docs/tr/SEO-PLAN.md](../tr/SEO-PLAN.md)
> Status: **plan**, written 2026-10-20. Nothing in §11 has shipped yet.
> Measured against the production deployment (`https://local-ai-news.vercel.app`, the origin the app advertises) and a local `next dev` on `:3000` serving the published snapshot `generatedAt 2026-10-20T20:42:42Z` — **1 402 models, 529 gate-passed, 210 news items** (bundled fallback: 915 / 347 / 104).
> Scope: crawlability, index policy, metadata, structured data, content depth, demand capture. Not in scope: paid acquisition, link buying, a CMS migration, or machine-translating 1 400 entity pages.
>
> **Revision 2 (2026-10-20):** added the competitor/SERP evidence (§2.1), the query portfolio with win conditions (§2.2), the realistic SERP-feature list (§2.3), the domain migration runbook (§3.5), the content quality rubric (§7.7), the internal link matrix (§8.1), event instrumentation and indexing accelerators (§10.4–10.6), the 90-day calendar (§11.5), link acquisition (§11.6), pruning (§11.7) and the file-level implementation map (§16). Three earlier assumptions were corrected: a model page will not earn a Software App rich result without ratings; FAQ/HowTo markup is not a rich-result lever; and a generic VRAM calculator is too crowded to be the P2 differentiator.

---

## 0. Summary

The hard part of this product exists: a unique dataset, nine category desks, a glossary, a stats desk, news, RSS, JSON-LD and two locales. The plumbing that lets a crawler read any of it does not.

- **Every content route we measured returns the same `<title>` and description.** Measured on `/`, `/models`, `/c/llm`, `/m/…`, `/news`, `/glossary/gguf` and `/stats` (production, 2026-10-20): all seven return `OpenWeight Radar — New open-weight models you can run locally`. Only `/compare` exports a route-level `generateMetadata` (the `[locale]` layout supplies the one sitewide value), and only the TR chrome changes the tagline.
- **There is no canonical, no hreflang, no Open Graph and no Twitter card on any route.** Measured: 0 `rel="canonical"`, 0 `hreflang`, 0 `property="og:*"` on `/en`.
- **The sitemap advertises 252 URLs and zero model pages.** 1 402 model pages exist per locale — **2 804 URLs are structurally invisible**. The news list is also hard-capped at 200 while the served snapshot holds 210 items, so at least 10 pages can never be advertised.
- **Unknown model, news and category URLs answer `200`** — three soft-404 classes that GSC will report as "submitted URL can be crawled but is not indexed".
- **Locale redirects are `307`**, not `308`, on both `/` and `/prefixless`.
- **Every HTML response is `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.** No ISR, no CDN hit, worst-case TTFB for crawlers and readers.
- **The served snapshot has 0 model-card summaries.** 7.5 % of models report params, 31 % a license, 18 % files. Most model pages are a spec grid with several `—` rows and no sentence about the model.
- **RSS items link off-site** (`huggingface.co`, `github.com`), so the feed sends readers and link equity away from the 210 canonical detail pages the site already built.
- **The brand domain in the code's own default (`openweightradar.com`) is NXDOMAIN.** Production only works because `NEXT_PUBLIC_SITE_URL` points at the `vercel.app` host.

The plan is deliberately ordered by leverage, not by URL count: **P0 makes the site crawlable and measurable (days), P1 defines what deserves to be indexed (one week), P2 adds the content that can actually rank (two weeks), P3 earns links and iterates.** Success is measured in GSC coverage and impressions, not in pages generated.

---

## 1. What a crawler sees today

### 1.1 Method

| What | Where / command |
|---|---|
| Production surface | `https://local-ai-news.vercel.app` (the host the running app advertises) |
| Local surface | `next dev` on `:3000`, published Blob snapshot `2026-10-20T20:42:42Z` |
| Head extraction | `curl -s <url> \| rg -o '<title>\|<meta name="description"\|rel="canonical"\|hreflang\|property="og:'` |
| Sitemap | `curl -s <origin>/sitemap.xml \| rg -c '<url>'` and `\| rg -c '/m/'` |
| Status classes | `curl -s -o /dev/null -w '%{http_code}'` for valid and invalid variants |
| Snapshot coverage | `.seo-probe.ts` (throwaway) → `loadSnapshot()` with `.env`, counting non-empty fields |
| Redirects / cache | `curl -sI`, `curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}'` |

### 1.2 What production answers

| Route | Document title | Canonical | hreflang | OG/Twitter | Status |
|---|---|---|---|---|---|
| `/` | site title | — | — | — | `307 → /en` |
| `/en` | site title | — | — | — | 200 |
| `/en/models` | site title | — | — | — | 200 |
| `/en/c/llm` | site title | — | — | — | 200 |
| `/en/m/realrebelai-MOSS-Imagine_ComfyUI` | site title | — | — | — | 200 |
| `/en/news` | site title | — | — | — | 200 |
| `/en/glossary/gguf` | site title | — | — | — | 200 |
| `/en/stats` | site title | — | — | — | 200 |
| `/en/compare?ids=…` | pair title | yes | — | — | 200, `noindex` |
| `/en/m/does-not-exist` | site title | — | — | — | **200 (soft 404)** |
| `/en/n/does-not-exist` | site title | — | — | — | **200 (soft 404)** |
| `/en/c/notacategory` | site title | — | — | — | **200 (soft 404)** |
| `/en/glossary/nope` | 404 page | — | — | — | 404 ✓ |
| `/models` (no locale) | — | — | — | — | `307 → /en/models` |

### 1.3 Defects, measured

| # | Defect | Evidence | Search impact | Phase |
|---|---|---|---|---|
| **D1** | One title/description for every route | 7/7 routes identical | Google rewrites titles; pages compete with each other; CTR collapses | P0 |
| **D2** | No canonical tags | 0 on every route | Query permutations (`window/sort/gate/runner/maxParams/license/q/page`) all look like separate documents | P0 |
| **D3** | No hreflang, no `x-default` | 0 `hreflang` links | EN/TR pairs compete; TR pages may be treated as duplicates of EN | P0 |
| **D4** | No OG/Twitter metadata | 0 `og:*`, 0 `twitter:*` | Shared links render as bare URLs; no image, no headline | P0 |
| **D5** | Sitemap omits every model page | 252 URLs, **0** contain `/m/`; 2 804 model URLs exist | 2 804 URLs depend on deep pagination and internal links alone | P0 |
| **D6** | Sitemap caps news at 200 and sends no model `lastmod` | 210 news pages; 200 `<lastmod>` (all news) | 10 pages fall out; recrawl prioritisation is blind for models | P1 |
| **D7** | Soft 404s | 3/3 invalid model/news/category probes return 200 | Index bloat; GSC "soft 404"; crawl budget wasted | P0 |
| **D8** | Locale redirects are 307 | `/` and `/models` → 307 | Temporary redirects do not consolidate signals as strongly as 308 | P0 |
| **D9** | No index policy on query URLs | `/models?window=30d&sort=downloads`, `?page=2`, `?runner=ollama` all 200, no canonicals | Effectively unbounded duplicate URL space | P1 |
| **D10** | `no-store` on every HTML response | `Cache-Control: private, no-cache, no-store…` on `/en` and a model page | No CDN caching, slower TTFB/LCP, more crawler pressure | P1 |
| **D11** | RSS links off-site | `<link>https://huggingface.co/…</link>` per item | Feed readers never reach the canonical detail page; no internal link equity | P1 |
| **D12** | JSON-LD is thin or points off-site | model `CreativeWork` with `url` = HF; news `NewsArticle` with `url` = external; list `ItemList` uses external URLs; no `WebSite`/`Organization`; no breadcrumbs on model/news | Weak entity understanding, no breadcrumb/sitelink eligibility | P1 |
| **D13** | Model pages have no prose | served snapshot: `cardSummary` **0/1 402**, params **105 (7.5 %)**, license **434 (31 %)**, files **254 (18.1 %)**, quantizations **304 (21.7 %)**, storage **466 (33.2 %)** | Thin/near-duplicate pages at scale; nothing to rank for long-tail queries | P2 |
| **D14** | No verification, analytics or OG assets | no `google-site-verification`, no Bing token, no analytics script, no `opengraph-image` route | No data to act on; no measurement loop | P0 |
| **D15** | Brand domain does not resolve | `openweightradar.com` → NXDOMAIN; production uses `local-ai-news.vercel.app` | Authority accrues to a shared `*.vercel.app` host, not to the product | P0 (owner) |

### 1.4 What already works — do not break it

- Locale-prefixed routes and `<html lang>`; dictionaries are the only string source.
- One `<h1>` per route; real page types (front, index, category, model, news, glossary, stats, compare).
- Glossary JSON-LD is the best on the site: `DefinedTerm` + `BreadcrumbList`, 15 entries × 2 locales.
- `/compare` already implements the pattern this plan generalises: deduped canonical, `noindex` on id permutations, `generateMetadata`.
- `sitemap.ts`, `robots.ts`, `feed.rss` and `icon.svg`/`apple-icon.png` exist and return 200.
- `middleware.ts` already has the exclusion list that keeps `/sitemap.xml`, `/robots.txt`, `/feed.rss` and static files out of the locale redirect.

### 1.5 Content inventory (served snapshot, 2026-10-20)

| Surface | URLs today | Indexable (proposed §3) | Unique prose today |
|---|---|---|---|
| Front page + index + 9 categories + news/research/stats/compare/glossary | 16 × 2 = 32 | 32 | category pages: one dictionary line, no per-category intro |
| Glossary terms | 15 × 2 = 30 | 30 | strong (definition + evidence + calculator) |
| Model pages | 1 402 × 2 = 2 804 | **430 × 2 = 860** now → 529 × 2 after card backfill | none (0 summaries) |
| News details | 210 × 2 = 420 | 420 | median summary 1 404 chars, p10 207 |
| Total | **3 286** | **1 342** now → 1 540 after card backfill | |

Gate-passed models: **529**. Of those, **430** report at least four of `params/license/library/storage/vram/runners/quantizations/files`; **324** report five or more. `cardSummary` is **0** on the served snapshot; the bundled fallback still has 24, from an earlier ingest (§7.1 explains the budget arithmetic).

---

## 2. Strategy and decisions

| # | Decision | Rationale |
|---|---|---|
| **S1** | **One canonical host on a real domain.** Attach `openweightradar.com` (or a chosen alternative), 308 `*.vercel.app` → it, and set `NEXT_PUBLIC_SITE_URL` to the custom origin. | Authority cannot compound on a shared preview host; the brand domain in the code default is NXDOMAIN today. |
| **S2** | **Every route exports `generateMetadata`.** Shared helpers live in `src/lib/seo.ts`; `metadataBase` is set once in `[locale]/layout.tsx`. | One title for the whole site is the single largest on-page defect. |
| **S3** | **Two locales are translations, not mirrors.** EN is canonical-default (`x-default`), TR gets translated titles/descriptions and real TR copy on category/glossary/guide pages; entity names stay untranslated. | hreflang only helps when the alternate is genuinely for a different audience; identical pages with a different chrome are not. |
| **S4** | **Index policy is a predicate, not a hope.** Each route type has an explicit `isIndexable*()` function and a unit test; noindexed URLs are excluded from the sitemap. | 1 400 thin pages are worse than 430 useful ones. Canonicals alone do not stop crawl waste. |
| **S5** | **The sitemap is the discovery contract.** Only 200 + indexable URLs, with `lastModified`; split by type; no query strings. | The current sitemap is a partial dump that omits the site's largest content type. |
| **S6** | **Structured data describes the internal page.** `url`/`mainEntityOfPage` are Radar URLs; HF/GitHub go in `sameAs`/`isBasedOn`. | Google needs to understand the page it indexed, not the external source. |
| **S7** | **Content depth before programmatic scale.** No `[category] × [VRAM tier]` matrix. At most 12 curated demand pages in P2, each with data a reader cannot get elsewhere. | Thin programmatic pages are the fastest way to lose a new domain. |
| **S8** | **ISR for HTML, no-store only for `/api`.** `revalidate = 300` on lists/news, `900` on model/sitemap; the snapshot fetch is cached, not `no-store`. | The ingest runs every 10 minutes; a 5–15 minute cache is fresher than needed and removes the TTFB penalty. |
| **S9** | **RSS is an internal product.** Items link to `/n/{id}`; the source is an attribute, not the destination. | The feed should create sessions and links, not hand them to GitHub. |
| **S10** | **SEO regressions fail CI.** `scripts/seo-audit.ts` asserts titles, canonicals, hreflang reciprocity, sitemap/index consistency, soft 404s and JSON-LD parsing. | The repo already gates classification with `classify-check`; SEO deserves the same. |

### 2.1 SERP reality: who already owns these queries

Evidence: a multi-query search snapshot on 2026-10-20 surfaced the domains below. This is **not a rank-order audit**; it is a map of the content types and incumbents a new domain has to beat. Queries used: `open weight models list tracker`, `local llm vram calculator`, `yerel yapay zeka modeli çalıştırma`. Re-run it before P2 and record the result in §17.

| Domain / product | What it owns today | Strength | Gap we can exploit |
|---|---|---|---|
| **Hugging Face** (`huggingface.co`) | First-party model pages, `/<org>/<model>` queries, docs | Domain authority; canonical source | No local-fit verdict: runner command, VRAM at quant/context, file sizes, gate, cross-model comparison |
| **Ollama library** (`ollama.com/library`) | "run <model> ollama", `ollama run` queries | Brand + one-command UX | Only Ollama-compatible models; no safetensors/MLX/vLLM coverage, no VRAM or license fit |
| **LM Studio / llama.cpp docs** | GUI and runtime setup queries | Product docs and trust | Not catalogues; no freshness, no cross-model data |
| **NLP.COM.AI models** | "open weight models" catalogue, monthly release archives | Deep per-model prose, architecture, licenses, papers | Text-LLM-centric; no runner/VRAM/quantization fit, no image/video/audio breadth |
| **The Open Weights, Open Model Weights, LLM Watch, Optinest, AI Release Tracker** | Release ledgers, family changelogs, evidence histories | Structured records, editorial summaries, date coverage | Mostly text LLMs; no local runnability layer; some are JS-heavy and thin to a crawler |
| **FitLLM, LLMeter, VRAMCalculator, willitrunai, apxml, looot, InsiderLLM, flaviocopes.com** | "vram calculator", "will it fit" | Dedicated tools, hardware presets | Tools without a fresh model catalogue; no per-model page with command + license + file list |
| **GitHub `awesome-*` lists, r/LocalLLaMA** | Curated links and community recommendations | Trust and links | Static, stale, unstructured |

What this means:

1. **Do not position as "another open-weight model list".** The list is table stakes; the local-fit layer is the wedge.
2. **Do not lead with a generic VRAM calculator.** Eight polished calculators already exist. Lead with per-model pages that answer "can I run it, with what command, at what quant, in how much VRAM, under what license". The calculator is a feature inside those pages, not the product.
3. **Breadth is a real differentiator.** The incumbents are text-LLM catalogues; nine modalities (image, video, audio, coding, robotics, embedding, vision, multimodal, LLM) is a story none of them tells.
4. **Turkish has no data-driven local-AI catalogue in the results we saw**, only generic tutorials (DataCamp, Microsoft Learn, Octopi). That is the cheapest international niche.

### 2.2 Query portfolio and win conditions

No keyword volumes are claimed; none were measured with a keyword tool. The portfolio is ordered by **fit to the data we already have** and by how beatable the current result type is.

| # | Cluster | Example queries (EN / TR) | Target | Who owns it now | Our win condition | Phase |
|---|---|---|---|---|---|---|
| 1 | Freshness / discovery | "new open weight models", "new open source AI models this week" / "yeni açık kaynak yapay zeka modelleri" | `/`, `/models`, `/news`, `/c/*` | HF, release ledgers | A visible `firstSeenAt`, a 10-minute ingest and nine categories in one place | P0–P1 |
| 2 | Model long-tail | "<repo>", "<model> VRAM", "<model> GGUF", "<model> ollama", "<model> license" | `/m/{slug}` | HF, Ollama | Local-fit table + per-runner command + file sizes + license + similar models | P2 |
| 3 | Run-it / fit | "how much VRAM for a 7B model", "run <model> on 8 GB" / "7b model kaç gb ram" | `/m/*` + 3 fit guides | Calculators | Real GGUF file sizes and concrete model picks, not a generic formula | P2 (conditional, §7.5) |
| 4 | Comparison | "<a> vs <b>", "best local coding model", "best local image model" | curated guides + `/compare` | Blogs, Reddit | Same-snapshot deltas, gate, downloads/day, printable commands | P2–P3 |
| 5 | Definitional | "what is quantization", "Q4_K_M", "gguf vs safetensors" / "quantization nedir" | `/glossary/*` | Blogs, docs | Definition + live evidence from the snapshot + calculator + model links | P1–P2 |
| 6 | Category | "open weight video models", "local image generation models", "open embedding models" | `/c/*` | Generic lists | Per-category counts, runner coverage, gate, median VRAM | P2 |
| 7 | Data / statistics | "open weight model statistics", "how many open models released" | `/stats` + monthly study | Nobody strong | A citable dataset with CSV and a monthly finding | P3 |
| 8 | Brand / navigational | "OpenWeight Radar" | `/`, `/about` | — | Consistent `Organization`, `sameAs`, about/method pages | P0–P1 |

### 2.3 Expected SERP features — and the ones we will not get

| Feature | Realistic? | Why / action |
|---|---|---|
| Breadcrumbs in the result | **Yes** | `BreadcrumbList` on every model, news and glossary detail page |
| Article / NewsArticle rich result | **Yes**, where image + author + publisher exist | Use the source organisation as `author`; never invent one. Items without an author may not qualify |
| Sitelinks | Possible after brand demand | Clear IA, consistent internal links, an about page, `Organization` + `sameAs` |
| Image pack | Limited | Only 10/1 402 models have a sample image; generated plates are not content images. Add alt text and an image sitemap for the 151 news thumbnails |
| Discover | Limited | Needs large, unique content images. News thumbnails (151/210) are the only realistic surface; model pages are not |
| FAQ rich result | **No** | Google restricted FAQ rich results in 2023. Use FAQ copy for readers and AI answers; do not add `FAQPage` expecting a SERP feature |
| HowTo rich result | **No** | Deprecated. Skip `HowTo` markup |
| Software App rich result | **No** (without ratings) | Requires `offers` plus `aggregateRating`/`review`. We will not fabricate ratings; `SoftwareApplication` is for entity understanding, not a rich result |
| Sitelinks search box | **No** | Retired. Do not add `SearchAction` |
| Dataset rich result | **No** in web search | Dataset Search only; still useful for citations and the monthly study |
| Video rich result | n/a | No video surface |

---

## 3. Index policy — the contract

### 3.1 Route matrix

| Route | Index | Canonical | In sitemap | Notes |
|---|---|---|---|---|
| `/{locale}` | yes | self | yes, `hourly` | front page |
| `/{locale}/models` | yes | self | yes, `hourly` | page 1 only |
| `/{locale}/models?page=N` (N ≥ 2) | yes | self | no | pagination is a path, not a duplicate; internal links + sitemap page 1 suffice |
| `/{locale}/models?window|sort|gate|runner|maxParams|license|q` | **no** | `/models` | no | `robots: { index: false, follow: true }`; never canonical a filtered page to page 1 of a *different* result set |
| `/{locale}/c/{category}` | yes | self | yes | category intro copy required (§7.3) |
| `/{locale}/c/{category}?…` | **no** | `/c/{category}` | no | same policy as the index |
| `/{locale}/m/{slug}` | predicate §3.2 | self | yes when indexable | `noindex,follow` otherwise; keep it linkable |
| `/{locale}/n/{id}` | yes if summary ≥ 300 chars OR kind ≠ `paper` | self | yes | all 210 qualify today (papers ≥ 300: 150/150) |
| `/{locale}/news`, `/research` | yes | self | yes, `hourly` | query variants canonical to the route, `noindex` |
| `/{locale}/glossary` | yes | self | yes | `?q=`/`?cat=` → `noindex,follow` |
| `/{locale}/glossary/{slug}` | yes | self | yes | 15 terms |
| `/{locale}/stats` | yes | self | yes | `?days=` → canonical `/stats`, `noindex` |
| `/{locale}/compare` (no ids) | yes | self | yes | tool landing page |
| `/{locale}/compare?ids=…` | **no** | deduped, order preserved | no | already implemented; keep |
| `/{locale}/guides/*`, `/tools/*` (P2) | yes | self | yes | curated only |
| `/api/*` | no | — | no | `Disallow: /api/` in robots |
| 404 / not-found | no | — | no | real 404 status + `noindex` |

### 3.2 Model predicate (measured volume)

```ts
// src/lib/seo.ts
const SPEC_KEYS = ["paramsTotal", "license", "libraryName", "storageBytes", "vramEstGb", "files", "quantizations", "runners"] as const;

export function specCount(model: ClassifiedModel): number {
  return SPEC_KEYS.filter((key) => (Array.isArray(model[key]) ? model[key].length > 0 : model[key] != null)).length;
}

export function isIndexableModel(model: ClassifiedModel): boolean {
  return model.qualityPassed && (specCount(model) >= 4 || (model.cardSummary?.trim().length ?? 0) >= 200);
}
```

| Predicate | Models today | × 2 locales |
|---|---|---|
| `qualityPassed` | 529 | 1 058 |
| `qualityPassed && specCount ≥ 3` | 454 | 908 |
| **`qualityPassed && (specCount ≥ 4 || summary ≥ 200)`** | **430** | **860** |
| `qualityPassed && specCount ≥ 5` | 324 | 648 |

Start with the 430; the same predicate expands to all 529 automatically once card backfill lands (§7.1). Non-passing models stay `noindex, follow` but remain reachable, comparable and linkable — the gate stays a quality signal, not a wall.

### 3.3 Query-string policy

- Exactly one parameter combination is canonical per surface: the bare route.
- `page` is the exception: it is a distinct document and self-canonical.
- Filtered pages return `robots: { index: false, follow: true }` and `alternates.canonical` pointing at the bare route. `follow` matters: the filtered pages link to model pages.
- `/compare?ids=…` keeps its existing `noindex` + deduped canonical (the only correct implementation on the site today).
- Never put a query URL in the sitemap and never `Disallow` a URL that carries `noindex` — the crawler must be able to see the directive.

### 3.4 404s and redirects

| Case | Today | Target |
|---|---|---|
| Unknown model slug | 200 + empty state | `notFound()` → 404, `noindex` |
| Unknown news id | 200 + empty state | `notFound()` → 404 |
| Unknown category | 200 + empty state | validate against `CATEGORY_RULES`, `notFound()` → 404 |
| `/` and no-locale paths | 307 | 308 via `NextResponse.redirect(url, 308)` |
| `/?window=…` → `/en/models?window=…` | 308 (already) | keep |
| `*.vercel.app` → custom domain | none | 308 at the platform level, before Next |

Add `src/app/[locale]/not-found.tsx` with a real search form and links to `/models`, `/news`, `/glossary`; keep the 404 body useful but never indexable.

Next only returns a 404 status **before streaming starts**; after that the not-found UI renders with a `200` and an injected `<meta name="robots" content="noindex">`. These routes suspend on the snapshot, so verify the status with `curl` and, if it is 200, call `notFound()` from `generateMetadata` as well (metadata resolution is blocking for crawlers) or resolve the entity before the first Suspense boundary.

### 3.5 Canonical host and migration runbook

The site is currently live on `local-ai-news.vercel.app` while the code's default is the NXDOMAIN `openweightradar.com`. Moving after indexing starts costs more than moving now.

1. **Choose one host** — apex (`https://openweightradar.com`) or `www` — and 308 the other to it permanently. Never serve both.
2. Add the domain in Vercel, set the DNS records it prints, and wait for TLS. Do not announce the domain before it resolves.
3. Set `NEXT_PUBLIC_SITE_URL` to the final origin in Production/Preview, redeploy, and verify that sitemap, robots, RSS, canonical and OG URLs all print the **same** host.
4. 308 `local-ai-news.vercel.app/*` → the custom host at the platform level, before Next. Keep it for at least 12 months.
5. GSC: add a **Domain property**, verify with DNS TXT, submit `/sitemap.xml`, then use **Change of address** for the old host if it has indexed pages. Bing: import from GSC and submit the same sitemap.
6. Update every external profile (GitHub, Hugging Face org, X, newsletters, README badges) to the new host.
7. Post-cutover checks: canonical host returns 200; old host returns 308 on every path including `/en`; no `vercel.app`, `localhost` or `http://` appears in any head or sitemap; one `metadataBase`.
8. Expect four weeks of coverage fluctuation. Do not change titles or canonicals during the migration window; you will not know which change caused what.

---

## 4. Metadata specification

### 4.1 Sitewide (`src/app/[locale]/layout.tsx`)

```ts
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openweightradar.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "OpenWeight Radar — open-weight models you can run locally",
    template: "%s · OpenWeight Radar"
  },
  description: "Track new open-weight AI models you can run locally: params, VRAM, quantization, runners and license, updated every 10 minutes.",
  applicationName: "OpenWeight Radar",
  // canonical + languages are set per page, not here: the layout has no path.
  // metadataBase only makes those absolute.
  openGraph: {
    type: "website",
    siteName: "OpenWeight Radar",
    locale: "en_US",
    alternateLocale: ["tr_TR"],
    // Images come from the opengraph-image file conventions; do not hardcode them twice.
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : {}
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
};
```

Notes:
- `metadataBase` makes relative `alternates`/`images` absolute; every dynamic route still passes absolute values.
- `max-image-preview: large` is what enables large thumbnails in Discover/Search.
- The verification values are env vars, not committed strings.
- Root layout is `[locale]/layout.tsx` (there is no `app/layout.tsx`), so this is the correct place.

### 4.2 Titles and descriptions per route

Titles are absolute on dynamic routes so the brand suffix never pushes the entity past ~60 characters. Descriptions are 120–160 characters and always contain a number (count, params, date) so they cannot be boilerplate.

| Route | Title | Description |
|---|---|---|
| `/` | `OpenWeight Radar — open-weight models you can run locally` | `1 402 open-weight models tracked, 529 pass the quality gate. New LLM, image, video, audio and coding models you can run locally, updated every 10 minutes.` |
| `/models` | `All open-weight models — OpenWeight Radar` | `Browse every tracked model: filter by window, runner, params and license. 430 pages with full specs, 9 categories, updated hourly.` |
| `/c/{category}` | `New {label} models you can run locally — OpenWeight Radar` | `{N} new {label} models first seen in the last {window}. Filter by runner, params and license; sorted by downloads, likes or recency.` |
| `/m/{slug}` | `{repoId} — {params?} local {category} model` (truncate to 60) | `{repoId}: {params} {category} model first seen {date}. {quantizations} · {runners} · ~{vram} GB VRAM · {license}. Run command and file list.` |
| `/n/{id}` | `{clean title} — {kind} · OpenWeight Radar` | First 155 characters of `newsText(...).body`, cleaned of URLs. |
| `/news` | `Local AI news — releases, runtimes and announcements` | `{N} model releases and runtime updates from the last {window}, with the source and the model each one mentions.` |
| `/research` | `Open-weight AI papers — daily research feed` | `{N} papers from the Hugging Face daily feed, filtered to work that ships open weights you can run.` |
| `/glossary` | `Local AI glossary — quantization, VRAM, GGUF, MoE` | `{15} terms behind the spec sheets, each with the numbers from the current snapshot and a VRAM calculator.` |
| `/glossary/{slug}` | `{term}: {short definition}` (≤ 60) | `{summary} Definition, evidence from {N} tracked models, and a VRAM calculator.` |
| `/stats` | `Open-weight model statistics — the Data Desk` | `1 402 models tracked, 529 pass the gate, {median} median downloads. Category share, runner coverage, gate pass rate and daily cadence.` |
| `/compare` | `Compare open-weight models side by side` | `Two to four models on one sheet: params, VRAM, quantization, runners, license, downloads per day and the differences that matter.` |

`{params?}` means the segment is omitted cleanly rather than printing `null` or `—`. Every title is generated by a pure function in `src/lib/seo.ts` and unit-tested with a model that has all fields, one with none, and one with only a summary.

### 4.3 hreflang rules

- Every indexable page emits exactly three alternates: `en`, `tr`, `x-default` → EN.
- Alternates are reciprocal: `/en/x` and `/tr/x` must both list the pair. The audit script checks both directions.
- Entity routes (`/m`, `/n`, `/glossary`) use the same slug in both locales; only the chrome language changes.
- Do not emit hreflang for `noindex` pages, 404s or query-filtered pages.
- `x-default` is emitted in both HTML and the sitemap. Sitemap hreflang annotations accept `x-default`, and `alternates.languages` in `sitemap.ts` can carry it; keep the value identical to the HTML tag.

### 4.4 Open Graph images

- Site default: `src/app/[locale]/opengraph-image.tsx` → 1200×630, nameplate + tagline + live counts.
- Model: `{repoId}`, category, params, VRAM, price `Free`, Radar mark. News: cleaned headline + source + date. Glossary: term + one-line definition.
- The repo uses `next/font/google`, which returns CSS/font objects that satori cannot consume. `ImageResponse` needs raw `ArrayBuffer` TTF/OTF. Commit one OFL font (Space Grotesk 700, latin + latin-ext for Turkish) under `src/assets/fonts/` and read it with `readFile` (Node runtime), or fetch it from the deployed origin. Do **not** rely on the bundled default for Turkish glyphs.
- Cache the generated images (`revalidate = 86400`); they are deterministic from the snapshot.

---

## 5. Structured data

| Page | Types | Required / recommended fields | Rule |
|---|---|---|---|
| Sitewide (`layout`) | `WebSite`, `Organization` | `name`, `url`, `inLanguage`, `publisher.logo`, `sameAs` (GitHub, Hugging Face org, X when they exist) | No `SearchAction` — Google retired the sitelinks search box; keep the graph honest. |
| Model | `SoftwareApplication` + `BreadcrumbList` | `name`, `applicationCategory: "DeveloperApplication"`, `applicationSubCategory` (category label), `operatingSystem`, `offers: { price: 0, priceCurrency: "USD" }`, `license`, `datePublished`, `dateModified`, `url` (internal), `sameAs` (HF), `keywords`, `isPartOf` | Never put the HF URL in `url`; it goes in `sameAs`. Omit `offers` when the license forbids commercial use? No — price 0 is still true; put the restriction in `license`. |
| News | `NewsArticle` + `BreadcrumbList` | `headline`, `datePublished`, `dateModified`, `mainEntityOfPage` (internal), `url` (internal), `image` (thumbnail if present), `publisher` = Radar + logo, `author` = source organisation when known, `isBasedOn` = source URL, `articleSection` | The page does not republish the body; `isBasedOn` is the honest link to the source. Google's Article guidelines ask for headline, image, datePublished, author and publisher; when the source organisation is unknown, keep the graph valid and accept that the item may not earn a rich result rather than inventing an author. |
| Lists (`/models`, `/c/*`, `/news`, `/research`) | `ItemList` + `BreadcrumbList` | `itemListElement` with **internal** URLs, `numberOfItems`, `itemListOrder` | Use only the items actually rendered on that page. |
| Glossary index/term | `DefinedTermSet` / `DefinedTerm` + `BreadcrumbList` | existing fields | Keep; add `dateModified` when copy changes. |
| Stats | `Dataset` (optional) | `name`, `description`, `temporalCoverage`, `creator`, `isAccessibleForFree`, `distribution` → `/api/stats` | Only if the owner is comfortable licensing the dataset; otherwise a plain `WebPage`. |
| Compare with ids | none (`noindex`) | — | Structured data on a non-indexable page is wasted bytes. |

Pitfalls measured in the current code:
- The model page's `CreativeWork.url` is the Hugging Face URL, and the news `NewsArticle.url` is the external source. Both tell Google the page is a copy of an off-site document. Fix in the same commit as §4.
- `image` is passed `model.sampleImages[0]`, which exists on **10/1 402** models. Omit the field rather than emit `undefined`/empty.
- Dates must be ISO strings with timezone (`createdAt`, `firstSeenAt`, `publishedAt` are already ISO). `dateModified` should be `updatedAt || firstSeenAt`, never `new Date()` at render time.
- Do not emit `aggregateRating` from likes/downloads; they are not ratings and would be fabricated.

---

## 6. Sitemaps, robots and feeds

### 6.1 Sitemap split

Use `generateSitemaps` (Next 16 passes `id` as `Promise<string>`) with four groups:

| id | Contents | URL budget today |
|---|---|---|
| `0` | Core routes × locales: front, models page 1, 9 categories, news, research, glossary, stats, compare | 32 |
| `1` | Glossary terms × locales | 30 |
| `2` | Indexable models × locales | 860 today, 1 058 after backfill |
| `3` | All news details (no cap) | 420 |

Each entry: absolute `url`, `lastModified` (`updatedAt || firstSeenAt` for models, `publishedAt` for news, copy version for glossary/guides), `changeFrequency`, `alternates.languages` for `en`/`tr`/`x-default`, and `images` for the 151 news thumbnails and the 10 model sample images. No `priority` (Google ignores it). The image sitemap is tiny but it is the only image surface the site has.

After deploying, verify what `/sitemap.xml` actually returns: with `generateSitemaps`, the children live under `/sitemap/{id}.xml`; if the root does not produce an index automatically, list each child in `robots.txt` explicitly. Do not ship a robots file that points at a 404.

### 6.2 robots.txt

```
User-Agent: *
Allow: /
Disallow: /api/

User-Agent: GPTBot
Allow: /

User-Agent: ClaudeBot
Allow: /

User-Agent: PerplexityBot
Allow: /

User-Agent: Google-Extended
Allow: /

Sitemap: https://<canonical-host>/sitemap.xml
```

- `/api/` is JSON, not content; disallow it to keep crawl budget on pages.
- Do not `Disallow` filters, `?page=`, or `/compare?ids=` — those carry `noindex` and the crawler must be able to read it.
- Allowing AI crawlers is a product decision (citations and referrals vs. training use). Document it in `DECISIONS.md`; the block above is the recommendation.
- No `Host:` directive (Yandex-only, deprecated).

### 6.3 RSS

Current feed: 50 items, `<link>` points at the external source, `atom:link rel="self"` points at `/news` rather than the feed URL. Target:

- `<link>` and `<guid isPermaLink="true">` → the internal `/n/{externalId}` canonical page.
- Add `<source url="{item.url}">{organization}</source>` for attribution.
- `atom:link rel="self"` → `/feed.rss?lang={lang}` (plus the category variant when present).
- Add `<enclosure url="{thumbnail}" type="image/…"/>` when a thumbnail exists (151/210).
- Keep the 7-day window and 50-item cap; add `?kind=` later if readers ask.
- The feed must be advertised in the head of `/news` and `/research` (`alternates.types["application/rss+xml"]`).

---

## 7. Content depth — the part that actually ranks

### 7.1 Model pages

**Root cause of `cardSummary: 0`.** `runIngest` runs the detail backfill first and computes the card budget afterwards:

```ts
const backfillBudget = Math.max(0, Math.min(options.maxBackfills ?? 120, options.maxRequests - client.requestsUsed - 10));
const backfilled = backfillBudget > 0 ? await backfillDetails(client, models, backfillBudget) : 0;
const cardBudget = Math.max(0, Math.min(options.maxCards ?? 80, options.maxRequests - client.requestsUsed - 10));
```

With `maxRequests = 400`, listings use ~18, details take up to 300, and card reads are left with 0–10. The result is measurable: the served snapshot has **0** summaries while the feature has shipped. Fix one of:

1. **Reserve before spending**: compute `cardBudget = min(80, floor(0.2 × maxRequests))` first, subtract it from the detail allowance; or
2. **Run it as a separate workflow step**: `npm run cards-backfill -- --limit=150` after `npm run ingest` and before `npm run publish`, so the card pass has its own 150-request budget and its own failure mode. 529 passed models / 150 per run ≈ 4 runs. Add a `cards-backfill` log line to the workflow summary.

Then: refuse to index a model page whose summary is missing and whose spec count is below 4 (§3.2), and surface the summary on the page (already rendered when present).

**Sections that make a page worth indexing** (each must be data-derived, never invented):

| Section | Source | Present today | Rule |
|---|---|---|---|
| What it is | `cardSummary` (README excerpt, ≤ 600 chars) | 0 % | Required for index; attribution + link to HF |
| Specs | params, storage, quants, runners, library, VRAM, license, popularity | 7.5–74.9 % | Print only non-empty rows; no `—` grid |
| Run it | `runCommand(model)` + per-runner commands | 100 % (derived) | Show `llama.cpp`, `Ollama`, `MLX` variants when detected |
| VRAM table | `estimateVramGb` at 4/8/16/24 GB, context 4k/8k | 7.5 % params | If params absent, hide the table, show the calculator |
| Files | `files` | 18.1 % | Keep; it is unique per repo |
| Similar models | same category + param band + runner | 100 % (derived) | 4–6 internal links; this is the crawl mesh |
| Mentioned in | `getModelNews` | 10/210 news carry `modelSlug` | Keep conditional |
| Provenance | first seen, updated, gate reason, license | 100 % | One line: "First seen 12 Oct 2026 · updated 2 h ago" |

Absolute rule: **never render a heading with nothing under it.** The current page already follows this for card summary and mentions; extend it to every block.

### 7.2 News detail

- Keep the policy: summary + attribution + link, never the source body.
- Every page shows: cleaned headline (build tags stripped), kind, category, source organisation, published time, summary, "Read the source" (external, `nofollow`), and 3 related news items.
- Resolve the model link more often. Only **10/210** items have `modelSlug`; the name index already exists (`lib/model-mentions.ts`). Run the reverse match at ingest and store `modelSlug` when exactly one model matches, with a confidence rule (exact repo id or unique model name ≥ 6 chars). A news page that links to a model page and back is the strongest internal link pair on the site.
- Add `dateModified` only when the summary/upvotes actually change; otherwise keep `datePublished`.
- Cap the visible summary at 4 000 chars (already) and keep the `<h1>` the cleaned title.

### 7.3 Category pages

Each `/c/{category}` needs 150–250 words of evergreen intro above the list, generated from snapshot facts but written once per category (not per request):

- what the category contains and which `pipeline_tag`s feed it;
- how many models are tracked, how many pass the gate, median downloads;
- the three most common runners and the median VRAM/params when reported;
- a 3-question FAQ (e.g. "What is the best local coding model right now?", "How much VRAM does a 7B model need?", "What does the quality gate filter?") with answers derived from the page's own numbers. **Markup note:** `FAQPage` will not earn a rich result for this site (Google restricted FAQ rich results in 2023). The copy is for readers and AI answer engines; do not add FAQ schema expecting a SERP feature.
- links to the matching glossary terms and to the closest guide.

Store the copy in `src/i18n/dictionaries/{en,tr}.json` as `desk.intro.{key}` so it stays translated and reviewable in a diff. Do not generate it from the snapshot on every render; the numbers inside it must be updated by the same ingest that changes the list, or the page contradicts itself.

### 7.4 Glossary

Already the best content on the site. Extend, do not rewrite:

- 15 → 25 terms, chosen by query opportunity: `Q4_K_M`, `Q8_0`, `FP8`, `BF16`, `context window`, `KV cache`, `tokenizer`, `MoE routing`, `LoRA`, `merge`, `distillation`, `benchmark`, `throughput`, `tokens/s`, `quantization-aware training`.
- Every term gets a Turkish definition (not a machine translation of the English one), the evidence block it already has, and 2–3 internal links to filtered model lists.
- Add `dateModified` to the `DefinedTerm` when the copy changes.
- The glossary index already answers `?q=`; keep it `noindex` but make the search results link out to terms.

### 7.5 Demand surfaces (P2 — capped at 12; `/best/*` deferred to P3)

| URL | Query intent | Why it can rank | Data it needs |
|---|---|---|---|
| `/tools/vram-calculator` | "vram calculator", "llm vram calculator", "gguf vram hesaplama" | **Conditional.** Eight polished calculators already exist (§2.1); ship this only if it reads real GGUF file sizes from the snapshot and links to `/m/*` pages | `estimateVramGb`, file sizes, quantization table, params input |
| `/guides/run-llm-locally` | "how to run an llm locally" | Step-by-step with real commands from `runCommand` | runner detection, model picks |
| `/guides/best-local-coding-models` | "best local coding model" | A ranked table by downloads/day + params, refreshed from the snapshot | category data, gate, runners |
| `/guides/best-local-image-models` | "best local image model", "flux gguf" | Same, for image | category data |
| `/guides/gguf-vs-safetensors` | "gguf vs safetensors" | Definition + storage/VRAM consequence + real examples | glossary, storage bytes |
| `/guides/local-model-quantization` | "Q4_K_M", "quantization explained" | The quantization table is already built | glossary, `quantizations` |
| `/guides/how-much-vram-for-a-7b-model` | "7b vram", "8b vram" | One query per size band, answered with the calculator **and a list of models that actually fit** | params → VRAM, file sizes |
| `/guides/ollama-vs-llama-cpp` | "ollama vs llama.cpp" | Runner coverage data | runners |
| `/best/{category}` × 9 (**P3**) | "best open {category} model" | Only if each page has a different top-10 table and intro | category data |
| `/about`, `/method`, `/data` | brand + E-E-A-T | Who runs the site, how the gate works, how to cite the data | static copy |

Every one of these must pass the same "unique prose ≥ 150 words + a data table that changes with the snapshot" bar. If a page cannot, it does not ship. No `[category] × [vram]` matrix, no auto-generated "top 10" pages with no editorial choice.

### 7.6 Turkish

- Translate the new category intros, guides and glossary definitions properly; EN is the source, TR is the mirror (repo rule).
- Model and news pages keep English entity names and source text, with a TR chrome and a TR description. That is honest; do not machine-translate 1 400 model cards.
- Add `inLanguage` to JSON-LD and keep `<html lang="tr">`.
- If TR copy cannot be maintained, reduce TR to the UI + glossary/guides and `noindex` the TR entity pages rather than shipping near-duplicates. Decide once; do not leave it ambiguous.
- Mark English excerpts inside a TR page with `lang="en"` (model card text, news summaries, organization names). It helps screen readers and stops language classifiers from treating the whole TR page as English.

### 7.7 Content quality rubric (the publish gate)

Every indexable page is scored 0–2 on six axes before it enters the sitemap. The rubric exists because "unique prose ≥ 150 words" alone can be gamed by templated sentences; this asks whether the page is actually useful.

| Axis | 0 | 1 | 2 |
|---|---|---|---|
| **Unique prose** | none | templated spec sentences only | card excerpt + original context written for this page |
| **Data completeness** | ≤ 2 specs | 3–4 specs | ≥ 5 specs + file list |
| **Local runnability** | no runner or command | one generic command | per-runner commands + VRAM table at ≥ 2 quants |
| **Internal links** | < 2 | 2–3 | ≥ 4 relevant (category, similar models, glossary, news) |
| **Provenance** | none | a date | first seen + updated + gate reason + license + source link |
| **Media / structured data** | neither | JSON-LD only | image + JSON-LD + breadcrumb |

- **Publish threshold: 8/12.** A model page below 8 stays `noindex, follow`.
- Re-score monthly. A page that drops below 6 loses its index status; a page with backlinks is enriched, never deleted.
- The rubric is editorial, not a runtime check. `seo-audit.ts` enforces the mechanical half (word count, links, JSON-LD); this table decides whether the content deserves to exist.

---

## 8. Internal linking and crawl paths

- **Breadcrumbs on every detail page** (visible + JSON-LD): Home → Category → Model, Home → News → Item, Home → Glossary → Term.
- **Model → category → model**: each model page links to its category and 4–6 similar models; each category page links to its top 24 and paginates.
- **Model ↔ news**: news detail links to the model (when resolved), model page lists mentions (already).
- **Glossary ↔ data**: every term links to a filtered model list and to the calculator (already); the list pages link back to the term when the filter is about that term.
- **Crawl depth**: every sitemap URL must be reachable from `/` in ≤ 3 clicks. The audit script crawls the internal links and reports the depth distribution; a URL that only exists in the sitemap is a warning, not a failure.
- **Pagination**: 24 models/page × 1 402 = 59 pages. `page` is indexable and self-canonical; the sitemap carries page 1 only; category pages and "similar models" carry the rest.
- Optional `/sitemap` HTML page (hub-of-hubs) is not needed once the XML sitemap is complete; skip it to avoid another indexable thin page.

### 8.1 Internal link matrix

| From | To | Links | Purpose |
|---|---|---|---|
| Front page | models, 9 categories, news, research, glossary, stats | 12–18 | distribute authority from the strongest page |
| `/models` | 24 models/page + categories + glossary | 24 + 12 | discovery and deep pagination |
| Category `/c/*` | 24 models + sibling categories + 2 glossary terms | 24 + 4 | crawl mesh and topical clustering |
| Model `/m/*` | category, 4–6 similar, glossary terms, mentions, HF (`nofollow`) | 8–12 | keep the reader and the crawler inside the site |
| News `/n/*` | model (when resolved), category, 3 related news, list | 4–6 | connect freshness to evergreen pages |
| Glossary term | filtered model list, calculator, 2 related terms | 4 | convert definitions into model sessions |
| Stats `/stats` | filtered lists for every number | 8–15 | make the data desk a hub |
| Guides / fit pages | 6–10 models + glossary + calculator | 8–12 | commercial-intent path to model pages |
| Footer | about, method, data, RSS, glossary | 5 | trust pages and feed discovery |

Rule: no page is a leaf. Every indexable page links up (breadcrumb), sideways (siblings) and down (children/related).

---

## 9. Performance and caching

| Item | Today | Target |
|---|---|---|
| HTML cache | `private, no-store` on every page | `s-maxage=300, stale-while-revalidate=600` for lists/news; `s-maxage=900` for model/sitemap |
| Rendering | dynamic SSR everywhere; glossary static params only | ISR + `generateStaticParams` for the top 200 models and latest 100 news |
| Snapshot fetch | `fetch(..., { cache: "no-store" })` | `next: { revalidate: 900 }` + in-memory TTL for dev |
| TTFB | measure with `curl -w '%{time_starttransfer}'` | < 500 ms p75 at the edge |
| LCP / INP / CLS | not measured | p75 LCP < 2.5 s, INP < 200 ms, CLS < 0.1 (CrUX after 28 days) |
| Images | `next/image` with remote HF patterns; 10 sample images | add `sizes`, keep the generated plate first |
| Fonts | 3 families, `display: swap` | keep; preload only the display face |
| JS | 140 KB HTML for a model page (RSC payload included) | do not regress; measure build output per route |

Caching policy detail:
- `revalidate = 300` on `/models`, `/c/*`, `/news`, `/research`, `/glossary`, `/stats`; `revalidate = 900` on `/m/*`, `/n/*`, sitemap.
- The ingest publishes every 10 minutes; a 5-minute HTML cache can serve a snapshot up to 5 minutes stale, which is inside the product's own promise ("updated every 10 minutes").
- `/api/*` stays `no-store`; it is rate-limited and not a crawler target.

---

## 10. Measurement

### 10.1 Instrumentation (P0)

- **Google Search Console**: domain property via DNS TXT (do not use an HTML file inside a locale redirect). Submit `/sitemap.xml`, then each child. Set the custom domain as the primary property.
- **Bing Webmaster Tools**: import from GSC; submit the same sitemap.
- **Analytics**: Vercel Analytics or Plausible (cookieless). Events: outbound HF/GitHub click, copy run command, apply filter, add to compare, glossary → model click, RSS click.
- **Rich Results Test** on one URL per type: model, news, glossary, category, stats.
- **CrUX / PageSpeed** after 28 days of traffic (field data needs volume; the lab score alone is not the KPI).

### 10.2 `scripts/seo-audit.ts` (new, CI)

Contract, asserted against a running server (local or preview):

1. Every sitemap URL returns 200 and is not `noindex`.
2. No sitemap URL contains `?`.
3. Every indexable page has a unique `<title>`, a non-empty description, a self-referencing canonical, and reciprocal `en`/`tr`/`x-default` alternates.
4. Every `noindex` page is excluded from the sitemap.
5. `/en/m/<unknown>`, `/en/n/<unknown>`, `/en/c/<unknown>` return 404.
6. `/` and `/models` return 308.
7. `robots.txt` contains the sitemap and `Disallow: /api/`.
8. JSON-LD blocks parse; each has the required fields for its `@type`.
9. Every indexable model/news page has ≥ 150 words of unique prose (extract visible text, strip nav/spec labels) and at least 4 internal links.
10. Every sitemap URL is reachable from `/` in ≤ 3 internal clicks.

Wire it as `npm run seo-audit` and a CI step after `npm run build` + `npm start` in the `ingest` workflow or a dedicated `seo.yml` (nightly + on PRs touching `app/`, `middleware.ts`, `sitemap.ts`, `robots.ts`).

### 10.3 KPIs

| Metric | Baseline (2026-10-20) | 4 weeks | 12 weeks |
|---|---|---|---|
| Indexable URLs in sitemap | 252 | 1 342 (P0) | 1 540 (after card backfill) |
| Routes with a unique title | 0 % (1/8 route types) | 100 % | 100 % |
| Soft-404 probes returning 200 | 3/3 | 0/3 | 0/3 |
| Canonical + hreflang coverage | 0 % | 100 % | 100 % |
| Sitemap URLs returning 200 | not measured per URL yet | 100 % | 100 % |
| Pages scoring ≥ 8/12 on the content rubric | 0 | all indexable | all indexable |
| Referring domains (GSC Links) | not available | baseline | baseline + 10 |
| IndexNow submissions per publish | 0 | every publish | every publish |
| GSC indexed / submitted | not available | establish baseline | ≥ 70 % |
| GSC impressions / 28 days | not available | baseline | 3× baseline |
| Organic clicks / 28 days | not available | baseline | 2× baseline |
| p75 LCP | not available | < 2.5 s | < 2.5 s |
| Valid structured data (all types) | 0 | 100 % | 100 % |
| Rich-result-eligible pages (Article / breadcrumb) | 0 | all news + details | all news + details |

Targets are deliberately relative until GSC has four weeks of data. Do not invent absolute traffic numbers; set them from the first real impressions report.

### 10.4 Event instrumentation

Cookieless analytics only. Six events, each tied to a decision:

| Event | Trigger | Props | Decision it informs |
|---|---|---|---|
| `outbound_source` | click on HF/GitHub/paper | `page_type`, `model_slug`, `source` | Are model pages doing their job or leaking traffic? |
| `copy_command` | copy run command | `model_slug`, `runner` | Which runner commands readers actually use |
| `filter_apply` | submit a filter | `surface`, `filters`, `result_count` | Which filters deserve hub pages |
| `compare_add` | add a model to a pair | `model_slug`, `position` | Which comparisons to curate next |
| `glossary_to_model` | glossary → filtered list | `term`, `target` | Which definitions create model sessions |
| `rss_click` | RSS link / subscribe | `surface`, `lang` | Whether the feed is a real channel |

Do not instrument scroll depth, rage clicks or "engagement time"; they do not answer a question this plan asks.

### 10.5 Indexing accelerators (and what not to build)

| Mechanism | Use it? | Note |
|---|---|---|
| **IndexNow** (Bing, Yandex, Seznam) | **Yes** | Serve a key file at the root and POST changed model/news URLs after `npm run publish` (10 000 per batch). Google does not consume IndexNow |
| Sitemap ping (`/ping?sitemap=`) | **No** | Retired by Google and Bing; the sitemap in robots + GSC is the supported path |
| Google Indexing API | **No** | Only for JobPosting/BroadcastEvent; using it for model pages violates the contract |
| GSC URL Inspection | Spot checks only | No bulk indexing API; use it to debug one URL at a time |
| RSS / WebSub | **No** | No publisher hub; RSS is for readers, not indexing |

### 10.6 Coverage and log review (weekly, 30 minutes)

1. **GSC → Pages:** indexed vs not indexed, and the reason ("Crawled – currently not indexed", "Duplicate, Google chose different canonical", "Soft 404", "Blocked by robots"). Record the five biggest buckets.
2. **GSC → Performance:** queries and pages, last 28 days vs previous 28. Flag any page whose impressions fell > 30 % week over week.
3. **GSC → Sitemaps:** fetched, discovered URLs, errors. A sitemap that stops being fetched is an incident.
4. **Server logs:** Googlebot/Bingbot hit counts, 5xx rate, 404 spikes, and whether bots are crawling `noindex` URLs. Alert if 5xx > 1 % or a new 404 class appears.
5. **CrUX:** p75 LCP/INP/CLS by page group once volume exists.

Write the five numbers into `docs/en/SEO-LOG.md` (new, one line per week) so the next decision has a history instead of a memory.

---

## 11. Phases

### P0 — crawlable and measurable (1–3 days)

| Task | Files | Acceptance |
|---|---|---|
| Attach the custom domain; 308 `*.vercel.app` → it; set `NEXT_PUBLIC_SITE_URL` | Vercel + env | `curl -I` shows 308 to the custom host; sitemap/robots/RSS all print it |
| `metadataBase`, title template, default description, OG/Twitter defaults, verification | `[locale]/layout.tsx`, `src/lib/seo.ts` | one URL per type has a unique title |
| `generateMetadata` for `/models`, `/c/*`, `/m/*`, `/n/*`, `/news`, `/research`, `/glossary`, `/glossary/*`, `/stats`, `/` | route files | titles/descriptions from §4.2 |
| Canonical + `en`/`tr`/`x-default` alternates on every indexable page | `src/lib/seo.ts` + routes | audit checks reciprocity |
| `notFound()` for unknown model/news/category; 404 template | 3 route files, `not-found.tsx` | 3/3 probes return 404 |
| 308 for `/` and no-locale paths | `middleware.ts` | `curl -w '%{http_code}'` = 308 |
| Sitemap: split by type, add every model page (P1 narrows this to the predicate), remove the news cap, add `lastModified` | `sitemap.ts` | ≥ 1 300 URLs, 0 query strings, all 200 |
| robots: disallow `/api/`, list sitemap, AI crawler policy | `robots.ts` | text matches §6.2 |
| GSC + Bing verification, sitemap submission, analytics | env + platform | properties verified, sitemap "Success" |

### P1 — index policy and structured data (3–5 days)

| Task | Files | Acceptance |
|---|---|---|
| `isIndexableModel`, `isIndexableNews`, `specCount` + unit tests | `src/lib/seo.ts`, `tests/seo.test.ts` | 430 models / 210 news today |
| `noindex,follow` + canonical on every query variant (`page` exempt) | list routes | filtered URLs are noindex and canonical to the bare route |
| `noindex` on `?q=`/`?cat=`/`?days=` | glossary, stats | audit passes |
| Upgrade JSON-LD (SoftwareApplication, NewsArticle, ItemList, WebSite/Organization, BreadcrumbList) | route files + `JsonLd.tsx` | Rich Results Test: 0 errors |
| RSS internal links, `source`, `self`, enclosure | `lib/rss.ts`, `feed.rss/route.ts` | first `<link>` is `/n/…` |
| ISR + cached snapshot, remove `no-store` | route files, `lib/store.ts` | response has `s-maxage` |
| `seo-audit.ts` + `npm run seo-audit` + CI | `scripts/`, workflow | fails on a deliberately broken title in a test branch |

### P2 — content depth (1–2 weeks)

| Task | Files | Acceptance |
|---|---|---|
| Unstarve card backfill (reserve budget or separate workflow step) | `lib/ingest.ts`, `.github/workflows/ingest.yml` | served snapshot: ≥ 80 % of passed models have a ≥ 200-char summary within 5 runs |
| Model page: data-derived sections, no empty headings, similar models, provenance | `m/[slug]/page.tsx` | ≥ 150 words of unique prose on indexable models; no `—`-only grids |
| Category intro + FAQ copy in both dictionaries | `i18n/*.json`, `c/[category]/page.tsx` | 9 × 2 pages with 150–250 words and snapshot numbers |
| News → model resolution at ingest | `lib/ingest.ts`, `lib/model-mentions.ts` | `modelSlug` on > 50 % of news that name a repo |
| 7 guides; the VRAM tool only if the §7.5 condition holds (9 `/best/*` pages are P3, only if each differs) | new routes | each has a unique data table + ≥ 150 words |
| Glossary 15 → 25 terms with TR definitions | `lib/glossary.ts`, dictionaries | 50 indexable term pages |
| OG image routes | `opengraph-image.tsx` per segment | `og:image` 200, 1200×630, Turkish glyphs render |

### P3 — authority and iteration (ongoing)

- Publish one data study per month from `/stats` (e.g. "What 1 400 open-weight releases say about VRAM vs downloads"), with a citation block and a CSV download; this is the link magnet.
- Pitch the study to newsletters/communities (r/LocalLLaMA, Hacker News, TLDR AI) — no paid links.
- Curated comparisons for the top 20 model pairs; keep the `?ids=` permutations `noindex`.
- Quarterly content refresh: prune noindex pages that never earned an impression, merge duplicates, update category copy.
- Experiment log: title formulas, description formulas, OG variants — one change at a time, 28-day windows.

### 11.5 90-day calendar

| Week | Deliverable | Leading metric |
|---|---|---|
| 1 | P0: domain, metadata, canonical/hreflang, 404, 308, sitemap, robots, GSC/Bing | 100 % unique titles; sitemap fetched |
| 2 | P1: predicates, query noindex, JSON-LD, RSS, ISR, audit CI | 0 soft 404; 0 sitemap/index conflicts |
| 3 | Card backfill in the ingest workflow; model page prose sections | ≥ 80 % of passed models have a summary |
| 4 | Category intros + FAQ copy; news → model resolution | 18 category pages with 150+ words |
| 5 | Glossary 15 → 20; 3 guides (run locally, coding, image) | 16 new indexable pages (10 glossary + 6 guides) |
| 6 | Glossary 20 → 25; 3 guides (GGUF, quantization, VRAM) | 10+ glossary pages with evidence |
| 7 | Fit pages (`8 GB`, `16 GB`, `24 GB`) + `ollama vs llama.cpp` + calculator decision | First impressions on fit queries |
| 8 | OG images for site/model/news/glossary; TR copy for hubs | Share previews render |
| 9 | First data study from `/stats` + CSV + citation block | First referring domains |
| 10 | Outreach: newsletters, r/LocalLLaMA, Show HN, awesome lists | 5–10 referring domains |
| 11 | Prune: noindex pages scoring < 6; merge duplicates; redirect map | Indexed/submitted ratio ↑ |
| 12 | Review: GSC coverage, CWV, query portfolio, next quarter | Baseline vs day 1 |

### 11.6 Link acquisition and digital PR

Linkable assets, in order of strength:

1. **Monthly data study** from `/stats` with a CSV and a citation block ("What 1 400 open-weight releases say about VRAM vs downloads"). This is the only asset a journalist or newsletter can cite.
2. **Fit tables** ("models that fit 8 GB, with real file sizes") that no generic calculator has.
3. **Glossary with live evidence** (15–25 terms, each with snapshot numbers).
4. **The open snapshot/API** (`/api/stats`, `/api/feed`) for researchers and small tools.

Targets and rules:

| Target | Angle | Rule |
|---|---|---|
| GitHub `awesome-local-llm` / `awesome-llm` lists | One specific page (study or fit table), not the homepage | Open a PR; no mass submissions |
| r/LocalLLaMA weekly threads | Answer a real question with the data, link only when it helps | No drive-by posting; disclose authorship |
| Hacker News **Show HN** | The tracker + the data study, once | One launch; no reposts |
| Newsletters (TLDR AI, Ben's Bites, Import AI, Last Week in AI) | The monthly finding, 3 sentences + link | No paid placement; no mass email |
| Model authors / runtime repos | A correct, useful page about their release | Only when the page adds value; no link requests |
| University course pages / reading lists | The glossary + dataset | Only if genuinely relevant |

Measure: referring domains (GSC Links), landing pages, anchor text, and whether linked pages are indexable. Do not buy links, exchange links, or build a directory of reciprocal partners.

### 11.7 Pruning and refresh

- Monthly: any page with **0 impressions in 90 days** and a rubric score **< 6** becomes `noindex`; if it duplicates a parent, 301 to the parent; if it is valuable but thin, enrich it instead.
- Never delete a URL with backlinks. Keep a redirect map in `docs/en/REDIRECTS.md` (new) and test it in the audit script.
- Refresh category intros and fit guides when the snapshot's numbers move > 20 %.
- Keep the sitemap and the index policy in sync: a page that flips to `noindex` leaves the sitemap in the same commit.

---

## 12. Verification (commands)

```bash
# 1. Titles are unique per route type
for u in /en /en/models /en/c/llm /en/m/<slug> /en/news /en/glossary/gguf /en/stats; do
  printf "%s: " "$u"; curl -s "http://localhost:3000$u" | rg -o '<title>[^<]*' | head -1
done

# 2. Canonical + hreflang
curl -s http://localhost:3000/en/m/<slug> | rg -o 'rel="canonical"|hreflang="[^"]*"'

# 3. Soft 404s
for u in /en/m/nope /en/n/nope /en/c/nope; do
  printf "%s -> " "$u"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$u"
done

# 4. Redirect status
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/models

# 5. Sitemap composition
curl -s http://localhost:3000/sitemap.xml | rg -c '<url>'
curl -s http://localhost:3000/sitemap.xml | rg -c '/m/'
curl -s http://localhost:3000/sitemap.xml | rg -c '\?'

# 6. Cache
curl -sI http://localhost:3000/en/m/<slug> | rg -i '^cache-control'

# 7. JSON-LD types
curl -s http://localhost:3000/en/m/<slug> | rg -o '"@type":"[^"]*"' | sort -u

# 8. Robots
curl -s http://localhost:3000/robots.txt

# 9. Audit + unit tests
npm run seo-audit
npm test
```

Expected after P0/P1: 7/7 distinct titles, 3 canonical/hreflang pairs, 3/3 404s, 2× 308, sitemap ≥ 1 300 URLs with 0 `/m/` misses and 0 `?`, `s-maxage`, `SoftwareApplication` + `BreadcrumbList`, `/api/` disallowed.

---

## 13. Risks and non-goals

| Risk | Mitigation |
|---|---|
| Index bloat from 3 286 URLs | Predicate + noindex + sitemap exclusion; start at 1 342 |
| Thin model pages | Card backfill is a P2 gate; do not index without prose or ≥ 4 specs |
| hreflang on near-duplicate TR pages | Real TR copy on hubs/glossary/guides; decide the TR entity policy explicitly (§7.6) |
| News duplicate content vs. Hugging Face | Summary + attribution + `isBasedOn` + never republish the body |
| HF request budget starvation | Card backfill gets its own budget or its own workflow step |
| ISR serves a stale snapshot | 5–15 min TTL against a 10-min ingest; the page prints the snapshot time |
| Domain migration | 308 at the platform, GSC "Change of address", keep the old host 308 for ≥ 12 months |
| `noindex` mistaken for a penalty fix | It is an index-quality tool, not a ranking lever; remove it once a page qualifies |
| Analytics privacy | Cookieless Plausible/Vercel Analytics; no consent banner needed if no cookies |
| Card excerpt licensing | ≤ 600 chars, attribution + link, honor the model license; remove on request |

**Non-goals:** link buying, doorway pages, auto-generated model reviews, machine-translating 1 400 cards, keyword-stuffed titles, `aggregateRating` from likes, sitemap entries for pages that are `noindex`.

---

## 14. Open questions (owner's call)

1. **Custom domain now?** `openweightradar.com` is NXDOMAIN; the deployed host is `local-ai-news.vercel.app`. Authority should start on the final domain, not migrate later.
2. **AI crawler policy:** allow GPTBot/ClaudeBot/PerplexityBot/Google-Extended (recommended) or block training while allowing search?
3. **Dataset license:** can `/stats` + `/api/stats` be published as a citable dataset (e.g. CC BY 4.0)? Needed for the `Dataset` schema and the monthly study.
4. **TR entity pages:** translate, keep English with TR chrome, or `noindex`? Pick one.
5. **Non-gate-passed models:** keep them `noindex` forever, or index those with ≥ 6 specs (25 today)?
6. **Analytics:** Vercel Analytics vs Plausible; who owns the property?

---

## 15. Definition of done

- [ ] Custom domain live; one canonical host; `*.vercel.app` 308s to it.
- [ ] Every route type has a unique, data-derived title and description in EN and TR.
- [ ] Every indexable page has a self-canonical and reciprocal `en`/`tr`/`x-default` alternates.
- [ ] Every indexable page has an OG image and a Twitter card.
- [ ] `robots.txt` disallows `/api/`, lists the sitemap, and states the AI crawler policy.
- [ ] Sitemap contains all indexable URLs, no query strings, `lastModified`, and no `noindex` URLs.
- [ ] Unknown model/news/category URLs return 404 with `noindex`.
- [ ] `/` and no-locale paths return 308.
- [ ] Query-filtered pages are `noindex,follow` with a canonical to the bare route; `page` is self-canonical.
- [ ] Model index gate: `qualityPassed && (specCount ≥ 4 || summary ≥ 200)`; unit-tested.
- [ ] JSON-LD validates for `SoftwareApplication`, `NewsArticle`, `ItemList`, `BreadcrumbList`, `WebSite`, `Organization`.
- [ ] RSS items link to `/n/{id}`, carry `<source>` and `rel="self"`.
- [ ] HTML is ISR-cached; `/api` is the only `no-store` surface.
- [ ] Card backfill runs every ingest; ≥ 80 % of gate-passed models have a summary.
- [ ] Category pages have 150–250 words of translated intro + FAQ.
- [ ] Seven guides ship; the VRAM calculator ships only if it reads real GGUF file sizes and links to model pages (§7.5).
- [ ] Every indexable page scores ≥ 8/12 on the content rubric; pages < 6 are `noindex`.
- [ ] IndexNow key is served and every publish pings the changed model/news URLs.
- [ ] The competitor/SERP assumptions in §2.1 were re-checked before P2 and the result logged in §17.
- [ ] Domain migration runbook executed; old host 308s for ≥ 12 months; no mixed-host canonical anywhere.
- [ ] `docs/en/SEO-LOG.md` has one line per week with the five GSC/log numbers.
- [ ] GSC and Bing properties verified; sitemap submitted; analytics recording events.
- [ ] `npm run seo-audit` passes in CI and fails on a broken title/canonical/404/sitemap.
- [ ] Lighthouse SEO 100 on `/`, `/models`, `/c/*`, `/m/*`, `/news`, `/glossary/*`, `/stats`.
- [ ] p75 LCP < 2.5 s, INP < 200 ms, CLS < 0.1 in CrUX.

---

## 16. Appendix A — implementation map

| File | Change | Phase |
|---|---|---|
| `src/lib/seo.ts` (new) | `BASE`, `canonical()`, `languages()`, title/description builders, `specCount()`, `isIndexableModel()`, `isIndexableNews()`, JSON-LD builders | P0–P1 |
| `src/app/[locale]/layout.tsx` | `metadataBase`, defaults, `Organization` + `WebSite` JSON-LD | P0 |
| `src/app/[locale]/page.tsx`, `models`, `c/[category]`, `news`, `research`, `stats`, `glossary`, `glossary/[slug]` | `generateMetadata` with title/description/canonical/alternates/OG | P0 |
| `src/app/[locale]/m/[slug]/page.tsx` | metadata, 404, `SoftwareApplication` + `BreadcrumbList`, data-derived sections, similar models | P0/P2 |
| `src/app/[locale]/n/[id]/page.tsx` | metadata, 404, `NewsArticle` + `BreadcrumbList`, related links | P0/P1 |
| `src/app/[locale]/c/[category]/page.tsx` | category validation → 404, intro copy, `ItemList` | P0/P2 |
| `src/app/[locale]/glossary/[slug]/page.tsx` | metadata, `dateModified`, related links | P0/P2 |
| `src/app/sitemap.ts` | `generateSitemaps` split, predicates, `lastModified`, `images`, `x-default` | P0–P1 |
| `src/app/robots.ts` | `/api/` disallow, sitemap, AI crawler rules | P0 |
| `src/middleware.ts` | 308 for `/` and no-locale paths; keep the static-file exclusions | P0 |
| `src/lib/store.ts` | cached snapshot fetch; remove `no-store` from page data | P1 |
| `src/lib/ingest.ts` | reserve card budget before detail backfill; resolve `modelSlug` for news | P2 |
| `src/lib/rss.ts`, `src/app/feed.rss/route.ts` | internal links, `<source>`, `rel="self"`, enclosure, `alternates.types` | P1 |
| `src/app/[locale]/opengraph-image.tsx` + `m/[slug]`, `n/[id]`, `glossary/[slug]` | `ImageResponse` 1200×630 with a committed TTF (Turkish glyphs) | P2 |
| `src/app/[locale]/not-found.tsx` (new) | useful 404 with search + top links | P0 |
| `scripts/seo-audit.ts` (new), `package.json`, `.github/workflows/seo.yml` (new) | 10-point audit + CI | P1 |
| `tests/seo.test.ts` (new) | predicates, title/description builders, canonical/hreflang pairs | P1 |
| `docs/en/SEO-LOG.md`, `docs/tr/SEO-LOG.md` (new) | weekly five-number log | P1 |
| `docs/en/REDIRECTS.md`, `docs/tr/REDIRECTS.md` (new) | redirect map for pruned/merged pages | P3 |

## 17. Appendix B — revision log

| Version | Date | Change |
|---|---|---|
| v1 | 2026-10-20 | Measured baseline, route/index matrix, metadata spec, structured data, sitemaps/robots/RSS, content depth, phases and verification. |
| v2 | 2026-10-20 | Added competitor/SERP evidence (§2.1), query portfolio (§2.2), realistic SERP features (§2.3), migration runbook (§3.5), rubric (§7.7), link matrix (§8.1), instrumentation/indexing/log review (§10.4–10.6), 90-day calendar (§11.5), link acquisition (§11.6), pruning (§11.7), implementation map (§16). Corrected: Software App rich result is not achievable without ratings; FAQ/HowTo markup is not a lever; the generic VRAM calculator is conditional. |

The next revision should replace §2.1's search snapshot with a recorded SERP audit (date, query, top 10 URLs, feature type) and replace the relative KPIs with the first four weeks of GSC data.
