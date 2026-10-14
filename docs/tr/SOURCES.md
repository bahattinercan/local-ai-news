# Kaynak envanteri (TR)

13 Ekim 2026 ölçümü. Canlı kontrol: `npm run sources-check` (network'süz: `npm run sources-check --dry`).

| Kaynak | Endpoint | Durum | Not |
|---|---|---|---|
| hf_models | `GET /api/models?pipeline_tag=X&sort=createdAt` | ✅ 200 | sort: `createdAt`, `lastModified`, `downloads`, `likes`, `trendingScore` |
| hf_model_detail | `GET /api/models/{id}?full=true` | ✅ 200 | `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated` |
| hf_trending | `GET /api/trending?type=model` | ✅ 200 | `authorData.avatarUrl` yalnızca burada |
| hf_daily_papers | `GET /api/daily_papers?date=YYYY-MM-DD` | ✅ 200 | günde ~50 |
| hf_blog_rss | `https://huggingface.co/blog.rss` | ❌ 404 | RSS yok |
| hf_users | `GET /api/users/{name}` | ❌ error | token gerekir |
| hf_organizations | `GET /api/organizations/{name}` | ❌ error | token gerekir |

## Sert kısıtlar

- Rate limit: `RateLimit-Policy: fixed window; "api"; q=500; w=300` → IP başına 500 istek / 300 sn.
- `scripts/ingest.ts` run bütçesi: 400 istek (HF kimlik olmadan 300s'de 500
  izin veriyor), en fazla 300 model detay sorgusu. Bütçe ortada tükenirse run
  crash etmek yerine aldığı veriyle bitiyor.
- `?full=true` **list** endpoint'inde `siblings` döndürür ama `safetensors` **döndürmez** → kapıyı geçen model başına bir detay isteği.
- Pagination cursor `Link` başlığındaki base64 blob'dur; opak string olarak taşınır.
- `pipeline_tag` null olabilir.
