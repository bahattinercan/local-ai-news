# Source inventory (EN)

Measured 2026-10-13. Live check: `npm run sources-check` (offline: `npm run sources-check --dry`).

| Source | Endpoint | Status | Note |
|---|---|---|---|
| hf_models | `GET /api/models?pipeline_tag=X&sort=createdAt` | ✅ 200 | sorts: `createdAt`, `lastModified`, `downloads`, `likes`, `trendingScore` |
| hf_model_detail | `GET /api/models/{id}?full=true` | ✅ 200 | `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated` |
| hf_trending | `GET /api/trending?type=model` | ✅ 200 | `authorData.avatarUrl` is only available here |
| hf_daily_papers | `GET /api/daily_papers?date=YYYY-MM-DD` | ✅ 200 | ~50/day |
| hf_blog_rss | `https://huggingface.co/blog.rss` | ❌ 404 | no RSS exists |
| hf_users | `GET /api/users/{name}` | ❌ error | needs a token |
| hf_organizations | `GET /api/organizations/{name}` | ❌ error | needs a token |

## Hard constraints

- Rate limit: `RateLimit-Policy: fixed window; "api"; q=500; w=300` → 500 requests / 300 s per IP.
- Per-run budget in `scripts/ingest.ts`: 400 requests (HF allows 500 per 300s
  unauthenticated), with at most 300 model-detail lookups. A run that runs out
  of budget finishes with what it fetched instead of crashing.
- `?full=true` on the **list** endpoint returns `siblings` but **not** `safetensors` → one detail request per gate-passing model.
- Pagination cursor is a base64 blob in the `Link` header; carry it as an opaque string.
- `pipeline_tag` can be null.
