# OpenWeight Radar

Tracks newly released open-weight AI models that can be run locally, by category tabs, with a news feed that updates on a schedule.

Yeni çıkan, yerelde çalıştırılabilir açık ağırlıklı AI modellerini kategori sekmeleriyle takip eden site; haber akışı zamanlanmış olarak güncellenir.

**Docs / Dokümantasyon:** [docs/README.md](docs/README.md) (EN + TR mirror).

## Commands

```bash
npm run sources-check          # SOURCE HEALTH report (add --dry for offline fixtures)
npm run ingest                 # ingest to Neon, or write data/feed.json when DATABASE_URL is absent
npm run classify-check         # 40 fixture models -> expected categories (regression gate)
npm test                       # unit tests
npm run typecheck
npm run lint
npm run dev
```

## Environment

Copy `.env.example` to `.env`:

- `DATABASE_URL` — Neon connection string
- `INGEST_SECRET` — protects `POST /api/ingest/run`
- `NEXT_PUBLIC_SITE_URL` — canonical origin for sitemap/RSS/hreflang
- `HF_TOKEN` — optional, raises the HF rate limit

## Layout

```
src/lib/sources/     HF adapter + source registry
src/lib/classify/    category rules + quality gate
src/lib/runner/      runner detection + VRAM estimate
src/lib/db/          Drizzle schema + store (Neon or data/feed.json)
src/i18n/            en.json / tr.json dictionaries
scripts/             verify-sources, ingest, classify-check, measure-ui
```
