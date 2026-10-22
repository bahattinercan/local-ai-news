# Local AI News - Detaylı Plan v2 (TR)

> İngilizce eşdeğer: [docs/en/PLAN.md](../en/PLAN.md)
>
> **Güncelleme 14 Ekim 2026:** karar 2 (Neon Postgres) geri alındı - veritabanı
> yok. Bkz. [DATA-STORAGE.md](DATA-STORAGE.md).

**Ürün:** Yeni çıkan **yerelde çalıştırılabilir (open-weight) AI modellerini** kategori sekmeleriyle takip eden, haber akışı düzenli güncellenen **public** bir website.

Aşağıdaki tüm API iddiaları 13 Ekim 2026'da canlı Hugging Face API'sine karşı ölçüldü.

---

## 1. Sabit kararlar

| # | Karar | Detay |
|---|---|---|
| 1 | **Next.js (App Router) + TypeScript** | SSR/ISR + API route'ları tek pakette; tarayıcı tarafı HF rate limit'ini önler |
| 2 | **Neon Postgres** | ingest doğrudan yazar, Vercel uygulaması sadece okur |
| 3 | **Yalnızca Hugging Face** kaynak | v1'de Ollama scrape, OpenRouter, GitHub release yok |
| 4 | **TR + EN** | `/en`, `/tr` locale routing; metinler yalnızca sözlük dosyalarında |
| 5 | **Varsayılan tazelik penceresi: 7 gün** | presetler 24s / 7g / 30g / 90g |
| 6 | **Haberler düzenli güncellenir** | 10 dakikada bir ingest + `/news` sayfası + üretilen RSS |
| 7 | **Kod tamamen İngilizce** | identifier'lar, yorumlar, JSON key'leri, test adları, commit'ler |
| 8 | **Dokümantasyon iki dilli** | `docs/en/*` (kaynak) + `docs/tr/*` (eşdeğer), `docs/README.md` indeks |
| 9 | **Kalite kapısı kullanıcıya açık bir filtre** | `quality_passed` kolonu + "Show everything" toggle (varsayılan kapalı) |
| 10 | **Haberler türetilmiş release duyurularını da içerir** | yalnızca paper değil |
| 11 | **Public site** | SEO, structured data, abuse koruması, atıf, büyüme sınırları |

---

## 2. Ürün adı ve domain

13 Ekim 2026'da `rdap.org` üzerinden ölçüldü: **404 = kontrol anında kayıtlı değil**, 200 = kayıtlı. Durum değişebilir; `.news` TLD'sinde registrar kısıtları RDAP'ta görünmez.

| Ad | Domain | RDAP |
|---|---|---|
| **OpenWeight Radar** | openweightradar.com | ✅ 404 (boş) |
| **Local Model News** | localmodel.news | ✅ 404 (boş) |
| **Local Weights Radar** | localweightradar.com | ✅ 404 (boş) |
| **OpenWeight Watch** | openweightwatch.com | ✅ 404 (boş) |
| **Localweight News** | localweight.news | ✅ 404 (boş) |
| Local AI Radar | localairadar.com | ❌ dolu |
| RunLocal | runlocal.ai | ❌ dolu |
| Local AI News | localai.news | ❌ dolu |
| Model Pulse | modelpulse.ai | ❌ dolu |

**Öneri: `OpenWeight Radar` (openweightradar.com).**
Gerekçe: "AI" belirsiz ve iyi slotlar zaten dolu; "open-weight" tam olarak bu sitenin takip ettiği şeyi tanımlıyor ve LLM'lerin yanında görüntü/video/ses/kod modellerini de kapsıyor. "Local" marka değil filtre olarak ifade ediliyor. Haber açılsın istersen ikinci seçenek: **localmodel.news**.

Marka kuralları: ad İngilizce (karar 7); TR arayüzde marka adı çevrilmeden kullanılır.

---

## 3. Kapsam çizgisi - "local AI modeli" ne demek?

Bir kayıt ancak şu şartlarla feed'e girer:

1. Ağırlıklar indirilebilir → `gated: false` (alan API yanıtında doğrulandı).
2. En az bir yerel runner çalıştırabiliyor: `llama.cpp`, `Ollama`, `MLX`, `vLLM`, `transformers`, `diffusers/ComfyUI`, `koboldcpp`, `ExLlama`, `llamafile`.
3. Kapalı API modelleri (OpenAI/Google closed) model olarak listelenmez - yalnızca haberde görünür.

UI'da **"Runs locally"** rozeti olarak gösterilir ve filtrelenebilir.

---

## 4. Kategori taksonomisi (sekmeler)

| # | Sekme (EN) | Sekme (TR) | Key | Kural |
|---|---|---|---|---|
| 1 | Language / LLM | Dil / LLM | `llm` | `pipeline_tag = text-generation` |
| 2 | Image | Görüntü | `image` | `text-to-image`, `image-generation`, `image-to-image`, `image-editing` |
| 3 | Video | Video | `video` | `text-to-video`, `image-to-video`, `video-generation`, `video-to-video` |
| 4 | Coding | Kod | `coding` | `text-generation` + tag/name regex (`code`, `coding`, `coder`, `codex`, `swe`, `agentic`) veya curated org listesi |
| 5 | Audio | Ses | `audio` | `automatic-speech-recognition`, `text-to-speech`, `audio-to-text`, `music-generation`, `audio-classification` |
| 6 | Multimodal | Çoklu Mod | `multimodal` | `visual-question-answering`, `image-to-text`, `document-question-answering` |
| 7 | Embedding / RAG | Embedding / RAG | `embedding` | `feature-extraction`, `sentence-similarity`, reranker işaretleri |
| 8 | Vision / CV | Görü | `vision` | `object-detection`, `image-segmentation`, `depth-estimation`, `zero-shot-image-classification`, `image-classification` |
| 9 | Robotics / Agent | Robotik / Agent | `robotics` | `robotics`, `visual-document-retrieval`, function-calling işaretleri |
| 10 | News | Haber | `news` | daily papers + türetilmiş release duyuruları |

Sekme çubuğu: `All · Language · Image · Video · Coding · Audio · Multimodal · Embedding · Vision · Robotics · News` (All dahil 11 sekme).

Notlar:
- HF'de **`coding` diye pipeline_tag yok** → kural tabanlı sınıflandırma zorunlu.
- Bir model birden fazla kategoriye girebilir (`model_categories`); sekmede `primary_category` gösterilir.
- Kurallar `categories.match_rules` JSONB'de yaşar, koda gömülü değildir.
- Manuel düzeltmeler için `category_overrides`.

---

## 5. Veri kaynakları (yalnızca HF, ölçülmüş)

| Endpoint | Durum | Not |
|---|---|---|
| `GET /api/models?pipeline_tag=X&sort=createdAt&limit=N` | ✅ 200 | `sort`: `createdAt`, `lastModified`, `downloads`, `likes`, `trendingScore` |
| `GET /api/models?tag=gguf` | ✅ | `pipeline_tag` ile birleştirilebiliyor |
| `GET /api/models/{id}?full=true` | ✅ | `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated`, `model-index` |
| `GET /api/trending?type=model` | ✅ | `recentlyTrending[].repoData`, `authorData.avatarUrl` içerir |
| `GET /api/daily_papers` + `?date=YYYY-MM-DD` | ✅ | günde 50; `title`, `summary`, `thumbnail`, `organization`, `githubRepo`, `upvotes`, `publishedAt` |
| `Link: <...&cursor=base64>; rel="next"` | ✅ | opak string, parse edilmez |
| `Access-Control-Allow-Origin` | ✅ yansıtılıyor | yine de çağrı sunucudan |
| `RateLimit-Policy: fixed window; "api"; q=500; w=300` | ⚠️ | **500 istek / 300 sn / IP** |
| `https://huggingface.co/blog.rss` | ❌ **404** | blog RSS yok |
| `GET /api/users/{name}`, `GET /api/organizations/{name}` | ❌ **token'sız error** | avatarlar yalnızca trending yanıtından gelir |
| `X-Total-Count` | `limit=1`'de dönmüyor | sayılar kendi DB'mizden |

**Önemli asimetri (ölçüldü):** *list* endpoint'i `?full=true` ile `siblings` döndürüyor ama **`safetensors` döndürmüyor**. Sonuç:
- runner algılama `siblings` dosya adlarından → ekstra istek yok
- gerçek param sayısı (`safetensors.parameters`) → kapıyı geçen her model için bir detay isteği

Canlı örnek:
```
text-to-video, sort=createdAt
  OsmanKhalidSiddiqui/CogVideoX-2b              2026-10-13  diffusers
  robertbschuette/LTX-2.3-uncensored-v1.4-FP8   2026-10-13  gguf
  unsloth/LTX-2.5-FP8                           2026-10-13  diffusers
text-to-image, sort=createdAt
  Qwen/Qwen-Image-2.1-Turbo   likes 688 · downloads 9665 · safetensors BF16 7.115B param
```

---

## 6. Mimari

```
                    ┌──────────────────────────────┐
                    │  Ingest worker (GH Actions)  │
                    │  her 10 dk, cron-job.org     │
                    │  → workflow_dispatch         │
                    └───────────────┬──────────────┘
                                    │ yazar
                                    ▼
                          Neon Postgres (models, news, ...)
                                    │ okur
                    ┌───────────────▼──────────────┐
                    │  Next.js on Vercel           │
                    │  ISR 900s + API routes       │
                    │  IP başına rate limit mw      │
                    └───────────────┬──────────────┘
                                    ▼
                          React UI (tabs, feed, detail, news)
```

**İngest web uygulamasının dışında çalışır:** Vercel fonksiyon timeout'ları + HF bütçesi. Tek yazar vardır - public site asla HF'ye proxy olmaz.

**Run başına istek bütçesi (500/300s altında kalmalı):**

| İş | İstek |
|---|---|
| 10 kategori × 2 sayfa | 20 |
| trending + daily papers | 2 |
| detay çekmesi, yalnızca kapıyı geçenler (~30) | 30 |
| headroom / retry | 40 |
| **Toplam** | **~92** |

`429` gelirse `Retry-After` ile backoff yapılır ve kalan kategoriler o run'da atlanır.

---

## 7. Veri modeli (Drizzle, Neon)

Şema İngilizce ve `docs/en/PLAN.md`'de. Kolonlar:

- `sources` - kaynak envanteri (tier, enabled, last_status, last_run_at)
- `categories` - `label_en`, `label_tr`, `match_rules` JSONB, `sort_order`
- `models` - `external_id`, `slug`, `name`, `author`, `author_avatar`, `primary_category`, `pipeline_tag` (nullable), `library_name`, `license`, `license_name`, `created_at`, `updated_at`, `first_seen_at`, `downloads`, `likes`, `trending_score`, `gated`, **`quality_passed`**, **`gate_reason`**, `params_total`, `param_dtypes`, `storage_bytes`, `quantizations`, `runners`, `vram_est_gb`, `sample_images`, `spaces`, `url`; `UNIQUE(source_key, external_id)`
- `model_categories`, `model_tags`, `news` (`kind IN ('paper','release','announcement')`), `category_overrides`, `ingest_runs` (`items_gate_passed` dahil)
- İndeksler: `(primary_category, first_seen_at DESC)`, `(primary_category, quality_passed, first_seen_at DESC)`, `(primary_category, trending_score DESC)`, `news(published_at DESC)`, `news(kind, published_at DESC)`, `model_tags(tag)`

**Kritik:** `first_seen_at` ≠ `created_at`. Yeniden yüklemede `createdAt` eski kalır; "yeni" = ilk görülme.

---

## 8. Kalite kapısı (karar 9: iç kural değil, kullanıcı filtresi)

Kap şu şartlardan biriyle geçer:
- `likes ≥ 5`
- `downloads ≥ 50`
- yazar curated org listesinde
- `cardData.widget` örnek çıktısı var

Davranış:
- `quality_passed` + `gate_reason` saklanır → UI bir modelin feed'de **neden** olduğunu gösterebilir.
- UI toggle **"Show everything" / "Her şeyi göster"** - varsayılan kapalı. Açılınca kapıyı geçmeyen satırlar soluk rozetle gelir.
- "Show everything" yalnızca ≤ 30 gün penceresinde ve kategori seçiliyken çalışır; aksi halde sonuç küpleri patlar.
- Kapıyı geçmeyen modeller **ham olarak sakılmaz**; ancak `likes ≥ 1` veya `downloads ≥ 10` veya curated yazar varsa saklanır. Yoksa tamamen atlanır.

**Büyüme sınırları (public site):**
- ingest yalnızca son 90 günde oluşturulan modelleri tarar
- kategori başına run başına max 200 kayıt
- beklenen hacim: günde ~150 kapıyı geçen model → yılda ~55k satır (Neon için sorun değil)

---

## 9. Haber pipeline'ı (karar 10)

Üç tür, hepsi HF-only:

1. **`paper`** - `daily_papers` (günde 50), upsert edilir ki `upvotes`/tartışma değişimi yansısın.
2. **`release`** - model feed'inden türetilir: pencere içinde `first_seen_at` **ve** `quality_passed` **ve** (`trending_score ≥ 100` **veya** `likes ≥ 50` **veya** curated org).
3. **`announcement`** - `organization` alanı curated org listesinde olan daily papers, ya da iki run arasında `trendingScore` sıçraması yapan model.

Kurallar:
- Aynı model için paper ve türetilmiş release ayrı satırlardır ama aynı `model_id`'yi paylaşır → haber kartı model detayına bağlanır.
- Haber **upsert** olmalı, insert-only değil.
- Sıklık: her 10 dk, cron-job.org → `workflow_dispatch` (GitHub'un kendi `schedule` cron'u throttled).
- `/news` "updated X min ago" gösterir; ISR 300s.
- Site `feed.rss` de **üretir** (kategori + dil bazında).
- Harici bloglar (marktechpost, JetBrains) v1 dışı - karar 3'ü deler.

---

## 10. Public site gereksinimleri (karar 11)

- **SEO:** sayfa başına hreflang çifti (`/en/...` + `/tr/...`), canonical URL, locale bazlı `sitemap.xml`, crawler'lara açık `robots.txt`.
- **Structured data:** haber için JSON-LD `Article`, model sayfası için `CreativeWork` (name, author, url, datePublished = `created_at`, image = ilk sample).
- **OG görselleri:** `cardData.widget` çıktısı varsa o, yoksa üretilen kart.
- **Atıf:** her model kartı HF sayfasına link verir ve yazarı gösterir. Avatar yalnızca trending yanıtından (`authorData.avatarUrl`) alınabilir - `/api/users/{name}` ve `/api/organizations/{name}` token'sız error döndürüyor, bu yüzden monogram fallback kullanılacak.
- **Abuse koruması:** kendi API route'larımız IP başına sınırlı (Vercel middleware, ~60 req/dk), salt-okunur DB erişimi, HF proxy yok.
- **Lisans gösterimi:** model başına `license` + `license_name`; `license: other` için uyarı rozeti.
- **Analitik:** Plausible veya Vercel Analytics. KPI'lar: DAU, feed CTR, kategori dağılımı, RSS abone sayısı, kapıyı geçme oranı.
- **Hukuki:** public API dışında scraping yok; `gated`'e saygı; takedown/contact route'u.

---

## 11. i18n (TR + EN)

- Locale routing `/en/...`, `/tr/...`; varsayılan `en`, `Accept-Language` fallback.
- Sözlükler `src/i18n/en.json`, `src/i18n/tr.json`, düz key'ler.
- **Kod İngilizce kalır** (karar 7): çeviri metinler kaynak koda asla girmez.
- Kategori etiketleri DB'den gelir (`label_en`, `label_tr`).
- Tarih/sayı `Intl.DateTimeFormat(locale)`.

---

## 12. UI / UX

### Rotalar
```
/en, /tr                            → feed (sekme: All)
/en/c/[category], /tr/c/[category]  → kategori feed'i
/en/m/[id],   /tr/m/[id]            → model detay
/en/news,     /tr/news              → haber akışı (kind filtresiyle)
/en/compare?ids=a,b                 → karşılaştırma
/en/stats                           → Veri Masası (docs/tr/STATS-PLAN.md)
```

### Feed kartı
```
┌───────────────────────────────────────────────┐
│ [preview]  OpenWeight Radar · Image            │
│            Qwen/Qwen-Image-2.1-Turbo          │
│            diffusers · 7.1B params            │
│            🔵 Yeni (3 gün) · ♥ 688 · ⬇ 9.6k    │
│            Runner: ComfyUI · GGUF · MLX        │
│            VRAM ~12 GB · license: other        │
└───────────────────────────────────────────────┘
```

### Filtreler
- Pencere: 24s / **7g (varsayılan)** / 30g / 90g
- Sıralama: New · Trending · Downloads · Likes
- Runner: llama.cpp / Ollama / vLLM / ComfyUI / MLX
- Boyut: ≤3B, ≤8B, ≤13B, ≤30B, 30B+
- Quantization: GGUF / FP8 / AWQ / MLX
- Lisans: open / research / other
- Gate: yalnızca gated olmayan
- **Kalite kapısı: Passed only (varsayılan) / Show everything**
- Kaydedilmiş filtre kombinasyonları (localStorage)

### Model detay
Önizleme görselleri, quant dosya listesi + boyutları, kopyalanabilir çalıştırma komutu, VRAM tahmini, HF linki, lisans, modeli kullanan spaces, aynı kategoridekiler, kapı sebebi.

### Tema
`data-theme` + Tailwind v4 `@theme inline` token katmanı (`--color-*` çakışması yok), lucide-react.

---

## 13. API route'ları

```
GET  /api/categories
GET  /api/feed?category=video&window=7d&sort=trending&runner=gguf&max_params=13&license=open&gate=passed&q=ltx
GET  /api/models/:slug
GET  /api/news?window=7d&category=video&kind=paper|release|announcement
GET  /api/stats?window=30d&gate=passed
GET  /feed.rss?category=&lang=
POST /api/ingest/run        (secret korumalı, cron tetikler)
```

Her query için zod şeması, `limit` max 100, `Cache-Control: public, s-maxage=900`.

---

## 14. Repo yapısı

```
openweight-radar/            (repo adı; ürün adı dokümanlarda)
├── docs/
│   ├── README.md            (indeks → en/ ve tr/)
│   ├── en/PLAN.md
│   └── tr/PLAN.md
├── src/
│   ├── app/                 (App Router: sayfalar + api route'ları)
│   ├── i18n/                (en.json, tr.json)
│   ├── lib/
│   │   ├── db/              (drizzle şema + client)
│   │   ├── sources/         (registry.ts, adapters/hf.ts)
│   │   ├── classify/        (kurallar, kalite kapısı)
│   │   └── runner/          (runner algılama + VRAM tahmini)
│   └── components/
├── scripts/
│   ├── verify-sources.ts    (SOURCE HEALTH raporu, --dry)
│   └── ingest.ts
├── .github/workflows/ingest.yml
└── package.json
```

---

## 15. Kurallar

- **Kod İngilizce:** identifier'lar, yorumlar, JSON key'leri, test adları, commit mesajları.
- **Commit:** Conventional Commits, İngilizce subject + body.
  `feat(classify): add coding-category regex rules`
- **Dokümantasyon iki dilli:** her doküman `docs/en/x.md` + `docs/tr/x.md`; EN kaynak, TR eşdeğer.
- Kategori etiketleri iki dilli DB'de tutulur.

---

## 16. Fazlar

### F0 - İskelet + kaynak doğrulama (1 gün)
- Next.js + TS + Tailwind v4, `next-intl`, Drizzle + Neon.
- `scripts/verify-sources.ts` → çalışan 5 endpoint + bilinen 2 bozuk endpoint (blog.rss, users/organizations) için SOURCE HEALTH tablosu.
- **Kabul:** `npm run sources-check` çalışan endpoint'lerde yeşil; `--dry` network'süz fixture ile çalışır.

### F1 - İngest çekirdeği (2 gün)
- HF adaptörü (pagination, cursor, backoff, bütçe koruması, sınırlar), şema, dedup, kalite kapısı, sınıflandırıcı, runner algılama, VRAM.
- **Kabul:** tek run ≥150 kapıyı geçen model; kategori dağılımı yazdırılır; ikinci run `items_new = 0`; kullanılan istek < 100.

### F2 - Feed UI + sekmeler (2 gün)
- Tab bar, kartlar, kapı toggle'ı dahil filtreler, boş durumlar, skeleton, dark mode, sözlükler.
- **Kabul:** headless Chrome screenshot'ta 375/768/1280 px'te yatay taşma yok; 11 sekme iki dilde render; kapı toggle'ı sonuç kümesini değiştirir.

### F3 - Model detay (2 gün)
- `/m/[slug]`, quant dosyaları, kopyalanabilir komut, VRAM, önizlemeler, spaces, kapı sebebi.
- **Kabul:** 10 örnek modelde runner/quant/VRAM alanları doğru; widget görselleri render.

### F4 - Haber pipeline'ı (2 gün)
- Daily papers ingest + upsert, türetilmiş `release` duyuruları, kind filtreli haber sayfası, model bağı, RSS üretimi, cron bağlantısı.
- **Kabul:** paper 10 dakika içinde görünür; yeniden run `upvotes`'ı günceller ama satır çoğaltmaz; sıçramada türetilmiş release oluşur; `/feed.rss` doğrulanır.

### F5 - Deploy + public site donanımı (1 gün)
- Vercel, ISR, IP başına rate limit, sitemap/hreflang/JSON-LD, analitik, GitHub Actions ingest job'u, sağlık raporu commit'e.
- **Kabul:** production deploy, cron zamanında tetiklenir, `/stats` haftalık kategori sayılarını gösterir, Lighthouse SEO skoru > 95.

### F6 - v2 ekstralar
Karşılaştırma sayfası, haftalık grafikler, kaydedilmiş filtreler, admin override paneli, yerel Ollama entegrasyonu (`localhost:11434/api/tags`), e-posta özeti, harici haber kaynakları (karar 3'ü delen bir karar gerektirir).

---

## 17. Test planı

- **Birim:** sınıflandırıcı kuralları, kalite kapısı, VRAM formülü, dedup, RSS üretimi, hreflang/sitemap üretimi.
- **Entegrasyon:** `verify-sources.ts --dry` fixture'a karşı (network yok).
- **Regresyon kapısı:** `npm run classify-check` - 40 fixture model → beklenen kategori.
- **UI:** headless Chrome screenshot (viewport sweep + mobil genişlikler).

---

## 18. Riskler / tuzaklar (ölçülmüş)

1. **HF limiti 500 istek / 300 sn / IP** - tarayıcıdan direkt çağırırsan yayın günü bloklanır. Sunucu tarafı ingest + cache zorunlu.
2. **`pipeline_tag` null olabilir** - canlı probe'da `KeyError` olarak gözlendi.
3. **Gürültü** - kişisel LoRA sellerları `sort=createdAt`'ı domine eder; kapı olmadan feed kullanılamaz.
4. **HF blog RSS yok (404)** - haber daily papers + türetilmiş release'e dayanır.
5. **`/api/users/{name}` ve `/api/organizations/{name}` token'sız error** - avatarlar yalnızca trending yanıtından.
6. **`safetensors` list yanıtında yok** - kapıyı geçen model başına bir detay isteği gerekir.
7. **Pagination cursor** - base64 blob, opak string, parse edilmez.
8. **"Yeni" tanımı** - `createdAt` değil `first_seen_at`.
9. **Gated modeller** - feed'e girmez ama filtre anahtarı olmalı.
10. **Kategori kuralları bayatlar** - curated org listesi için `category_overrides` kaçış kapısıdır.
11. **Public site büyümesi** - ingest 90 güne ve kategori/run başına 200 kayda sınırlanmazsa "Show everything" Neon'u şişirir.
12. **Vercel cron limitleri** - GitHub `schedule` değil, cron-job.org + `workflow_dispatch`.
13. **Domain uygunluğu anlıktır** - bugün RDAP 404 olan domain yarın kaydedilebilir; `.news` TLD'sinde registrar kısıtları vardır.

---

## 19. Plan öz kontrolü (v2'de ne değişti)

- Eklendi: ürün adı + ölçülmüş RDAP uygunluğu.
- Eklendi: kalite kapısı kullanıcı filtresi olarak (`quality_passed` / `gate_reason` kolonları) + saklama sınırları.
- Eklendi: türetilmiş `release` duyuruları + `kind` filtresi + upsert zorunluluğu.
- Eklendi: public site bölümü (SEO, JSON-LD, hreflang, atıf, IP başına rate limit, analitik, hukuki).
- Düzeltme: `safetensors` list endpoint'inde `?full=true` ile bile **dönmüyor** - yalnızca `siblings` dönüyor. Runner algılama bedava, param sayısı istek maliyetli.
- Düzeltme: avatar endpoint'leri token'sız çalışmıyor.
- v1 kapsamından çıkarıldı: Ollama scrape, OpenRouter, GitHub releases (karar 3).
- Hâlâ geçerli: rate limit sayıları, sort değerleri, tag filtresi, cursor pagination, daily papers date paramı, `pipeline_tag` nullability, blog.rss 404.
