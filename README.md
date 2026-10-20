# OpenWeight Radar

Tracks newly released open-weight AI models that can be run locally, by category tabs, with a news feed that updates on a schedule.

Yeni çıkan, yerelde çalıştırılabilir açık ağırlıklı AI modellerini kategori sekmeleriyle takip eden site; haber akışı zamanlanmış olarak güncellenir.

**Docs / Dokümantasyon:** [docs/README.md](docs/README.md) (EN + TR mirror).

## Commands

```bash
npm run sources-check          # SOURCE HEALTH report (add --dry for offline fixtures)
npm run ingest                 # fetch Hugging Face data into data/feed.json
npm run publish                # upload the snapshot to Vercel Blob
npm run classify-check         # 40 fixture models -> expected categories (regression gate)
npm test                       # unit tests
npm run typecheck
npm run lint
npm run dev
```

## Environment

Copy `.env.example` to `.env`:

- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token used to publish the snapshot
- `SNAPSHOT_URL` — optional explicit snapshot URL; otherwise discovered from the token
- `INGEST_SECRET` — protects `POST /api/ingest/run`
- `NEXT_PUBLIC_SITE_URL` — canonical origin for canonical links, sitemap, RSS and hreflang
- `GOOGLE_SITE_VERIFICATION` — optional Search Console verification token
- `BING_SITE_VERIFICATION` — optional Bing Webmaster verification token
- `HF_TOKEN` — optional, raises the HF rate limit

## Layout

```
src/lib/sources/     HF adapter + source registry
src/lib/store.ts   snapshot loader (Vercel Blob + repo fallback) + queries
src/lib/classify/  category rules + quality gate
src/lib/runner/    runner detection + VRAM estimate
src/i18n/            en.json / tr.json dictionaries
scripts/             verify-sources, ingest, classify-check, publish-snapshot, measure-ui
```
