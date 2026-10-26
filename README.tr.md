# OpenWeight Radar

[English](README.md) | **Türkçe**

Yerelde çalıştırabileceğin **açık ağırlıklı AI modellerini** - LLM, görüntü, video, ses, kod, çoklu mod, embedding, görü ve robotik modelleri - ve zamanlanmış olarak güncellenen bir haber akışını takip eder.

![OpenWeight Radar ana masa: kategori sekmeli yedi günlük model akışı, baş haber, en çok indirilenler listesi ve kendin çalıştır paneli](assets/openweight-radar-home.webp)

Ürün adı **OpenWeight Radar**. Depo ve dağıtım projesi hâlâ `local-ai-news` adını taşıyor; herkese açık kaynak `https://local-ai-news.vercel.app` (özel alan adı kullanılmama kararı alındı).

Her şey **tek bir JSON anlık görüntüsünden** üretilir. Postgres/Neon veritabanı yoktur: ingest işi `data/feed.json` dosyasını Vercel Blob'a yayımlar, Next.js uygulaması dosyayı 15 dakikalık önbellekle okur ve depodaki kopyayı yedek olarak kullanır.

---

## Ne yapar?

- Hugging Face'te keşfedilen, yerelde çalıştırılabilir **açık ağırlıklı modelleri** izler.
- Kişisel LoRA gürültüsünü akıştan uzak tutan kalite kapısıyla birlikte **dokuz kategori sekmesi** sunar.
- **Haber masası**: model sürümleri, Hugging Face günlük makaleleri, runtime sürümleri (llama.cpp, Ollama, vLLM) ve r/LocalLLaMA.
- **Model sayfaları**: parametre sayısı, kuantizasyon, runner algılama, VRAM tahmini, kopyalanabilir çalıştırma komutu, model kartı özeti, lisans, örnek çıktı ve ilgili haberler.
- Dört modele kadar **karşılaştırma sayfası**, iki açık zaman eksenli **istatistik masası** ve iki dilli **sözlük**.
- **SEO altyapısı**: canonical URL'ler, hreflang, JSON-LD, sayfa başına OG görselleri, yalnızca yararlı sayfaları bildiren sitemap ve aramaya izin verip eğitim crawler'larını engelleyen robots politikası.
- `/en` ve `/tr` rotalarıyla **TR + EN** arayüz; varsayılan ve varlık bilgilerinde kaynak dil İngilizce.

---

## Hızlı başlangıç

**Gereksinimler:** Node.js **>= 22** ve npm. Veritabanı veya Docker gerekmez.

```bash
git clone https://github.com/bahattinercan/local-ai-news.git
cd local-ai-news
npm install

cp .env.example .env      # yerel gezinme için isteğe bağlı
npm run dev               # http://localhost:3000
```

Depodaki `data/feed.json` siteyi gezmek için yeterlidir. Taze veri çekmek veya anlık görüntü yayımlamak için kimlik bilgileri gerekir.

İlk kontroller:

```bash
npm run typecheck
npm test
npm run lint
```

Yerelde taze veriyle çalışmak için:

```bash
npm run sources-check     # canlı kaynak sağlık raporu
npm run ingest            # data/feed.json dosyasını yazar
npm run dev
```

`npm run ingest` Hugging Face istek bütçesini tüketir. Dry run ağ çağrılarını yapar ama anlık görüntüyü yazmaz:

```bash
npm run ingest -- --dry
```

---

## Ortam değişkenleri

`.env.example` dosyasını `.env` olarak kopyalayın. Next.js dosyayı otomatik yükler. `npm run publish` dosyayı kendisi okur; diğer betikler değişkenleri süreç ortamından okur - env dosyasıyla çalıştırın (`npx tsx --env-file=.env scripts/ingest.ts`) veya değerleri kabukta verin (`HF_TOKEN=... npm run ingest`).

| Değişken | Gerekli | Amaç |
|---|---|---|
| `BLOB_READ_WRITE_TOKEN` | Yayımlama / uzak okuma için | Vercel Blob token'ı. `npm run publish` anlık görüntüyü bununla yükler; uygulama özel Blob nesnesini bununla bulur/okur. |
| `SNAPSHOT_URL` | İsteğe bağlı | Açık anlık görüntü URL'si. Boşsa uygulama Blob nesnesini token üzerinden keşfeder. |
| `INGEST_SECRET` | `POST /api/ingest/run` için | `x-ingest-secret` başlığı veya `?secret=` ile karşılaştırılan ortak sır. |
| `NEXT_PUBLIC_SITE_URL` | Önerilir | Canonical bağlantılar, hreflang, sitemap, RSS ve OG meta verisinde kullanılan kanonik kaynak. Varsayılan: `https://local-ai-news.vercel.app`. |
| `HF_TOKEN` | İsteğe bağlı | Hugging Face limitini 500 istek / 300 sn'den kimlik doğrulamalı seviyeye yükseltir. |
| `NEXT_PUBLIC_REPO_URL` | İsteğe bağlı | Altbilgideki herkese açık kaynak deposu bağlantısı. Boşsa gizlenir. |
| `GOOGLE_SITE_VERIFICATION` | İsteğe bağlı | Search Console doğrulama token'ı. |
| `BING_SITE_VERIFICATION` | İsteğe bağlı | Bing Webmaster doğrulama token'ı. |

`.env` git tarafından yok sayılır; izlenen şablon `.env.example` dosyasıdır.

---

## Komutlar

### Uygulama

```bash
npm run dev          # Next.js geliştirme sunucusu
npm run build        # üretim derlemesi
npm run start        # üretim derlemesini sun
npm run typecheck    # tsc --noEmit
npm run lint         # eslint . --max-warnings 0
npm test             # tsx --test tests/*.test.ts (node:test)
```

### Veri hattı

```bash
npm run sources-check              # canlı kaynak sağlığı (kaynak başına 200 + öğe sayısı)
npm run sources-check -- --dry     # çevrimdışı fixture'lar
npm run ingest                    # HF + feed'leri çek, data/feed.json yaz
npm run ingest -- --dry            # çek ama yazma
npm run cards-backfill            # eksik model kartı özetlerini doldur
npm run classify-check            # 40 fixture model -> beklenen kategoriler
npm run publish                   # data/feed.json dosyasını Vercel Blob'a yükle
```

`npm run ingest` bütçe bayraklarını kabul eder:

```bash
npm run ingest -- \
  --max-per-category=200 \
  --pages=2 \
  --max-requests=400 \
  --max-detail-lookups=300 \
  --max-backfills=120 \
  --max-cards=80
```

`npm run cards-backfill` şunları kabul eder: `--limit=40`, `--dry`, `--all` (kapıdan geçmeyenleri de dahil et), `--refresh` (kayıtlı özetleri temizleyip yeniden oku).

### Doğrulama yardımcıları

`seo-audit`, `contrast` ve SEO birim testleri dışında bu betikler uzaktan hata ayıklama açık bir Chrome ister (`--remote-debugging-port=9222`).

```bash
npm run verify-ui          # çeşitli genişliklerde düzen/DOM taraması
npm run verify-nav         # rota başına tam olarak bir aria-current
npm run verify-theme       # tema dil değişiminden sağ çıkar
npm run verify-glossary    # sözlük düzeni/çapraz bağlantı/taşma kontrolleri
npm run seo-audit          # çevrimdışı SEO sözleşmesi denetimi
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 360
npx tsx scripts/contrast.ts
npx tsx scripts/type-census.ts http://localhost:3000/tr
npx tsx scripts/screenshot.ts http://localhost:3000
npx tsx scripts/fetch-snapshot.ts
```

`fetch-snapshot.ts`, üretimin gerçekte sunduğu anlık görüntüyü indirir (varsayılan `.shots/live-snapshot.json`); böylece ölçümler depodaki eski kopya yerine canlı veriyi anlatır.

---

## Mimari

```
Hugging Face API  ─┐
HF günlük makaleler├─►  GitHub Actions (10 dakikada bir)
GitHub/Reddit feed'leri┘   │
                           │  sources-check
                           │  ingest
                           │  classify-check
                           │  publish
                           ▼
                  Vercel Blob: feed.json
                           │
                           │  15 dakikalık önbellekle okuma
                           ▼
                  Vercel üzerinde Next.js
                  ├─ sunucu tarafında render edilen sayfalar
                  ├─ /api/* JSON rotaları
                  ├─ /feed.rss
                  ├─ /sitemap.xml, /robots.txt
                  └─ OG görsel rotaları

        depodaki data/feed.json = paketlenmiş yedek
```

### Veri akışı ayrıntıları

1. **GitHub Actions**, `.github/workflows/ingest.yml` dosyasını 10 dakikalık zamanlamayla (`*/10 * * * *`) ve `workflow_dispatch` ile çalıştırır.
2. `sources-check` etkin her kaynağın sağlığını raporlar. Öğe döndürmeyen kaynak sessizce atlanmaz, görünür olur.
3. `ingest`, yayımlanmış anlık görüntüyü (Blob) ve depo kopyasını yükler, birleştirir, en erken `firstSeenAt` değerini korur ve alanları öyle birleştirir ki yeni boş olmayan değerler kazanır, boş veya bozuk değerler gerçek bir değerin yerine geçmez.
4. Hugging Face istemcisi her kategoriyi listeler (varsayılan iki sayfa), kalite kapısını uygular ve detay isteklerini yalnızca kapıdan geçen modellere harcar.
5. Yeni modellere `firstSeenAt = now` ve büyüme başlangıcı olarak `downloadsAtFirstSeen` atanır. Mevcut modeller yeniden eklenmez.
6. Yeterli sinyali olan modeller için türetilmiş `release` haberi oluşturulur. Günlük makaleler upsert edilir; upvote'lar tazelenir ama satır çoğalmaz.
7. Atom/RSS kaynakları (runtime sürümleri, r/LocalLLaMA) kaynak anahtarıyla öneklenmiş `externalId` ile birleştirilir. Başarısız bir feed önceki öğelerini korur.
8. Backfill geçişleri eksik detay alanlarını ve model kartı özetlerini doldurur; kendi bütçe sınırları ve ayrılmış payları vardır.
9. `data/overrides.json` içindeki manuel kategori düzeltmeleri uygulanır, anlık görüntü sıralanır ve sınırlandırılır, `data/feed.json` yazılır.
10. `publish` dosyayı Vercel Blob'a yükler. Site önbellek penceresi içinde yeni veriyi alır; yeniden dağıtım tetiklenmez.

İş akışı `HF_TOKEN` (isteğe bağlı ama önerilir) ve `BLOB_READ_WRITE_TOKEN` depo sırlarını kullanır.

> GitHub'ın zamanlanmış çalışmaları gecikebilir. Tam 10 dakikalık ritim önemliyse dokümanlar cron-job.org üzerinden `workflow_dispatch` tetiklemeyi önerir. İş akışı iki yolu da destekler.

---

## Veri modeli

Anlık görüntü iki dizi içerir:

```ts
interface Snapshot {
  generatedAt: string;
  models: ClassifiedModel[];
  news: SnapshotNews[];
}
```

### `ClassifiedModel` (özet)

| Alan | Anlamı |
|---|---|
| `externalId` | Hugging Face repo kimliği, örn. `Qwen/Qwen-Image-2.1-Turbo` |
| `slug` | `/m/[slug]` tarafından kullanılan URL güvenli kimlik |
| `name`, `author`, `url` | Görünen ad, Hub yazarı/kuruluşu, Hub URL'si |
| `primaryCategory`, `categories` | Sekme kategorisi ve eşleşen tüm kategoriler |
| `pipelineTag`, `libraryName`, `license`, `licenseName` | Hub meta verisi |
| `createdAt`, `updatedAt` | Hugging Face repo tarihleri |
| `firstSeenAt` | Radar'ın satırı ilk gördüğü an - “yeni” bunu ifade eder |
| `downloads`, `likes`, `trendingScore` | Hub metrikleri; `trendingScore` pratikte null |
| `downloadsAtFirstSeen` | Pencere içi büyüme için başlangıç değeri; `null` = bilinmiyor |
| `gated` | Gated repolar akıştan çıkarılır |
| `qualityPassed`, `gateReason` | Kapı sonucu ve nedeni (`likes`, `downloads`, `org`, `samples`, `failed`) |
| `paramsTotal`, `paramDtypes`, `storageBytes` | Safetensors parametre sayısı/türleri ve repo boyutu |
| `quantizations`, `runners` | Etiketler, dosyalar ve safetensors'tan algılanır |
| `vramEstGb` | Tahmini ağırlık + KV önbellek boyutu |
| `sampleImages`, `spaces` | Kart widget çıktıları ve ilgili Space'ler |
| `files` | Boyutlarıyla ağırlık dosyaları, en fazla 40 |
| `cardSummary` | Düz metin model kartı özeti; `undefined` = hiç çekilmedi, `null` = çekildi ama boş |
| `cardMeta` | `cardData` içinden temel model, veri kümeleri ve diller |

### `SnapshotNews`

| Alan | Anlamı |
|---|---|
| `externalId` | Tekilleştirme anahtarı; feed öğeleri kaynak anahtarıyla öneklenir |
| `kind` | `paper`, `release`, `announcement`, `runtime`, `community` |
| `title`, `summary`, `thumbnail`, `url` | Görünen içerik ve kaynak bağlantısı |
| `publishedAt`, `organization`, `upvotes` | Kaynak bilgisi ve sıralama sinyali |
| `modelSlug`, `categoryKey` | İsteğe bağlı model sayfası bağlantısı |

Haber metni gösterimden önce normalize edilir: eksik imza eksik kalır, `"[object Object]"` gibi bozuk değerler arayüze ulaşmaz.

### Depolama sınırları

Yazıcı anlık görüntüyü **2.000 model** ve **1.000 haber satırı** ile sınırlar; en eski kayıtlar düşer. Bu, tek JSON dosyasını önbelleklenebilir ve okunması ucuz tutar.

---

## Ingest hattı

### Kaynaklar

**Hugging Face** model kaynağıdır:

- `GET /api/models` - `pipeline_tag`, arama terimi ve oluşturma tarihine göre listeleme; cursor sayfalaması opak kabul edilir.
- `GET /api/models/{id}?full=true` - `cardData`, `safetensors`, `siblings`, `spaces`, `usedStorage`, `gated`.
- `GET /api/trending?type=model` - `authorData.avatarUrl` içeren tek yanıt.
- `GET /api/daily_papers` - günde yaklaşık 50 makale.

**Haber feed'leri** (karar 3, 2026-10-15'te revize edildi):

- Reddit `r/LocalLLaMA` Atom feed'i → `community`
- llama.cpp, Ollama ve vLLM GitHub sürüm Atom feed'leri → `runtime`

Kullanılamadığı ölçülmüş kaynaklar `enabled: false` ile registry'de tutulur; kimse körlemesine yeniden eklemesin diye. Hugging Face'in blog RSS'i yoktur ve kullanıcı/kuruluş uç noktaları token olmadan hata verir.

### İstek bütçesi

Hugging Face kimlik doğrulamasız **500 istek / 300 sn / IP** verir. Ingest varsayılan olarak **400 istek** bütçesi kullanır; en fazla 300 detay sorgusu, 120 detay backfill'i ve 80 model kartı okuması yapar. Bütçeyi tüketen koşu çökmez, elindekiyle biter; sonraki koşu devam eder.

### Tekilleştirme ve geçmiş

- Model kimliği `externalId`; haber kimliği `externalId`.
- Tekrar koşular model veya haber satırı çoğaltmaz.
- Birleştirme en erken `firstSeenAt` değerini korur; model listeleme penceresinden çıksa bile geçmiş gerilemez.
- Yayımlanmış anlık görüntü ile depo kopyası birleştirilir, biri diğerinin yerine geçmez; yeni boş olmayan değerler kazanır, boş veya bozuk değerler eksik sayılır.

---

## Sınıflandırma, kalite kapısı, runner ve VRAM

### Kategoriler

Dokuz model kategorisi ve haber yüzeyi:

`llm`, `image`, `video`, `coding`, `audio`, `multimodal`, `embedding`, `vision`, `robotics`.

Kurallar `src/lib/classify/rules.ts` içindedir (pipeline etiketleri, ad regex'i, etiket regex'i) ve `data/overrides.json` ile repo bazında düzeltilebilir.

Birden çok kural eşleştiğinde öncelik:

```
coding > video > image > audio > multimodal > embedding > vision > robotics > llm
```

Hugging Face'te `coding` pipeline etiketi yoktur; bu yüzden kod sınıflandırması bilinçli olarak regex tabanlıdır.

Regresyon kapısı `npm run classify-check`: 40 fixture repo beklenen kategoriye düşmelidir.

### Kalite kapısı

Bir model şunlardan **en az biri** doğruysa geçer:

- `likes >= 5`
- `downloads >= 50`
- yazar küratörlü kuruluş listesinde
- model kartında örnek çıktı var (widget veya örnek dosyalar)

Gated repolar akışa hiç girmez. Kapıdan geçmeyen satırlar yalnızca `likes >= 1`, `downloads >= 10` veya küratörlü yazar varsa saklanır.

Kapı **kullanıcıya görünen bir filtredir**, görünmez bir kural değil: akış varsayılan olarak “Yalnızca geçenler” gösterir ve “Her şeyi göster” seçeneği sunar. Bu görünüm 30 gün veya daha kısa pencereyle ve kategori seçiliyken sınırlıdır; sonuç kümesi patlayamaz.

### Runner ve kuantizasyon

Runner algılama Hub kütüphane adını, etiketleri ve ağırlık dosya adlarını birleştirir:

`llama.cpp`, `Ollama`, `MLX`, `vLLM`, `ComfyUI`, `transformers`, `ExLlama`, `koboldcpp`, `llamafile`, `Core ML`, `OpenVINO`, `ONNX`.

Kuantizasyonlar etiketlerden, dosya adlarından ve safetensors dtype'larından gelir (`Q4_K_M`, `FP8`, `AWQ`, `GPTQ`, `MLX-4BIT`, …).

### VRAM tahmini

Arayüz yaklaşık ayak izini gösterir:

```
ağırlıklar = parametre × bytes_per_param(kuantizasyon)
KV önbellek = 4096 token'da milyar parametre başına 0,15 GB
VRAM ≈ ağırlıklar + KV önbellek
```

Bu açıkça bir tahmindir ve `~` ile gösterilir. 7B model BF16'da yaklaşık 15 GB, Q4'te yaklaşık 5 GB yer kaplar.

---

## Rotalar ve API

Tüm sayfa rotaları dil öneki taşır (`/en/...`, `/tr/...`). Middleware bilinmeyen ilk segmenti dile yönlendirir ve eski filtre URL'lerini `/models` sayfasına 308'ler.

### Sayfalar

| Rota | Amaç |
|---|---|
| `/{locale}` | Gazete ön sayfası: baskı rakamları, en çok indirilen bandı, manşet, raylar |
| `/{locale}/models` | Filtrelenebilir model dizini: pencere, sıralama, runner, parametre, lisans, arama, sayfalama |
| `/{locale}/c/{category}` | Aynı filtrelerle kategori akışı; sekme rozetleri açtıkları akışı anlatır |
| `/{locale}/m/{slug}` | Model detayı: özellikler, kuantizasyonlar, dosyalar, VRAM, çalıştırma komutu, kart özeti, ilgili haberler |
| `/{locale}/news` | Sürümler, runtime güncellemeleri ve topluluk gönderileri (makaleler hariç) |
| `/{locale}/research` | Hugging Face günlük makaleleri |
| `/{locale}/n/{id}` | Kaynak atfı ve bağlantılı modelle haber detayı |
| `/{locale}/stats` | Veri Masası: toplamlar, kategoriler, kapı dağılımı, kadans, izleme, runner'lar, haber teli |
| `/{locale}/compare?ids=…` | Dört modele kadar karşılaştırma sayfası |
| `/{locale}/glossary` | Aramalı iki dilli sözlük dizini |
| `/{locale}/glossary/{slug}` | Kanıt, örnekler ve çapraz bağlantılarla sözlük maddesi |

### Üretilen / makine rotaları

| Rota | Amaç |
|---|---|
| `/feed.rss?lang=en&category=image` | `/news` sayfasının RSS aynası (makaleler hariç) |
| `/sitemap.xml` | Yalnızca indekslenebilir sayfalar, dillere ayrılmış, alternatifler ve gerçek `lastModified` ile |
| `/robots.txt` | Arama crawler'larına izin; eğitim crawler'larına ret; `/api/` kapalı |
| `/{locale}/opengraph-image` ve varlık OG rotaları | 1200×630 sosyal görseller |

### JSON API

| Rota | Not |
|---|---|
| `GET /api/categories` | Kategori anahtarları ve iki dilli etiketler; `s-maxage=900` |
| `GET /api/feed?category=video&window=7d&sort=trending&runner=gguf&maxParams=13&license=open&gate=passed&q=ltx&page=1` | `{ query, total, pages, count, models }` döner; sayfa sınırlandırılır; `s-maxage=900` |
| `GET /api/models/{slug}` | Tek model veya `404`; `s-maxage=900` |
| `GET /api/news?window=7d&scope=news&category=video&kind=release` | `scope`: `news`, `research` veya `all`; `s-maxage=300` |
| `GET /api/stats?window=30d&gate=passed` | Tek Veri Masası panosu: `totals`, `categories`, `gateReasons`, `cadence`, `tracking`, `runners`, `wire` |
| `POST /api/ingest/run` | Sırla korunur ve yalnızca yerel/geliştirme içindir; üretim ingest'i Actions'ta çalışır |

API rotaları middleware tarafından IP başına dakikada 60 istekle sınırlanır. Sınırlayıcı bellekte tutulur; Vercel'de fonksiyon örneği başına çalışır, global değildir.

Sorgu ayrıştırma bilinçli olarak hoşgörülüdür: boş değer “ayarlanmadı” demektir, her enum/sayı alanı varsayılana düşer ve elle düzenlenmiş `?window=abc&page=0` 500 yerine geçerli bir görünüme döner.

---

## Uluslararasılaştırma

- Diller: `en` (varsayılan) ve `tr`.
- Sözlükler: `src/i18n/dictionaries/en.json` ve `tr.json`, düz anahtarlar.
- Arayüz metinleri yalnızca bu sözlüklerde yaşar, kaynak kodda asla.
- Middleware `Accept-Language` algılar, `/` isteğini `/{locale}` adresine yönlendirir ve `Vary: Accept-Language` gönderir.
- Kategori etiketleri ve sözlük maddeleri iki dillidir; varlık bilgileri (repo kimlikleri, sayılar) çevrilmez.
- Tarih ve sayılar dile duyarlı biçimlendirilir.

Doküman kuralı da aynadır: **EN kaynaktır, TR eştir**. Her doküman `docs/en/` ve `docs/tr/` altında bulunur.

---

## SEO ve crawler politikası

- Her sayfa canonical URL ve `en` / `tr` / `x-default` alternatifleri üretir.
- Filtreli veya sayfalı liste sayfaları `noindex, follow`; crawler URL'yi yine de çekip direktifi okuyabilir.
- Model sayfaları en az altı özellik bildiriyorsa ya da kapıyı geçip dört özellik veya 200 karakter kart metni sunuyorsa indekslenebilir. Neredeyse boş sayfalar erişilebilir kalır ama `noindex` olur.
- Haber sayfaları indekslenebilir; makalelerin yeterli özeti olmalıdır.
- Makaleler, modeller, sözlük maddeleri ve liste sayfaları için JSON-LD üretilir.
- OG görselleri sayfa segmenti başına 1200×630 olarak üretilir.
- Sitemap her satırı değil, indekslenebilir model/haber sayfalarını bildirir ve gerçek değişiklik tarihlerini taşır.
- `robots.txt` yalnızca arama politikası uygular: joker arama motorlarına izin; `TRAINING_CRAWLERS` içindeki eğitim/çekme crawler'larına ret; atıf ve bağlantı veren yanıt motorlarına izin.
- `/api/` crawler'lara kapalıdır; tarama bütçesi sayfalarda kalır.

---

## Önbellekleme

| Katman | TTL |
|---|---|
| Süreç içi anlık görüntü önbelleği | 15 dakika (`900_000` ms) |
| `/api/feed`, `/api/categories`, `/api/models/*`, `/api/stats` | `s-maxage=900` |
| `/api/news`, `/feed.rss` | `s-maxage=300` |
| Sitemap yeniden doğrulama | 900 saniye |
| Sayfa render'ı | aynı önbelleklenmiş anlık görüntüyü okur |

Veri güncellemesi yeniden dağıtım tetiklemez. Blob nesnesi değişir, uygulama önbellek penceresinden sonra yeni veriyi alır.

---

## Dağıtım

### Vercel

1. Depoyu Vercel'e aktarın.
2. `NEXT_PUBLIC_SITE_URL` değerini dağıtım kaynağına ayarlayın.
3. Anlık görüntü okumaları için `BLOB_READ_WRITE_TOKEN` (ve isteğe bağlı `SNAPSHOT_URL`) ayarlayın.
4. Gerekirse `INGEST_SECRET`, doğrulama token'ları ve `NEXT_PUBLIC_REPO_URL` ekleyin.
5. Dağıtın. Derleme veritabanı gerektirmez.

Derleme sırasında veri çekmek zorunlu değildir: depodaki `data/feed.json` yedektir.

### GitHub Actions

Depo sırları:

- `BLOB_READ_WRITE_TOKEN` - `npm run publish` için zorunlu.
- `HF_TOKEN` - isteğe bağlı, Hugging Face limitini yükseltir.

`ingest` iş akışı `sources-check` → `ingest` → `classify-check` → `publish` çalıştırır. `seo` iş akışı `main` üzerinde ve rota, SEO kodu, anlık görüntü veya `package.json` değiştiren PR'larda typecheck, lint, birim testleri ve çevrimdışı SEO denetimini çalıştırır.

### Ingest neden API rotası değil?

Vercel fonksiyonlarının zaman aşımı vardır ve dosya sistemi salt okunurdur. `POST /api/ingest/run` yerel geliştirme için vardır ve anlık görüntüyü yazamadığında `501` döner. Üretim ingest'i Actions'ta (veya yazılabilir başka bir worker'da) çalışıp Blob'a yayımlamalıdır.

---

## Test ve CI

- **Birim testleri:** `tests/*.test.ts`, `tsx --test` (node:test) ile çalışır. 25 dosya; sınıflandırma, kapı, sorgu ayrıştırma, snapshot/store davranışı, RSS, SEO, istatistik, karşılaştırma, sözlük, i18n, middleware, OG metni, model anmaları, VRAM, kart metni ve feed ayrıştırmayı kapsar.
- **Fixture'lar:** `tests/fixtures/` feed ve sınıflandırma fixture'larını tutar. `npm run sources-check -- --dry` çevrimdışı fixture kullanır.
- **Regresyon kapısı:** `npm run classify-check`, 40 fixture modelin beklenen kategoriye düşmesini şart koşar.
- **CI:** `.github/workflows/seo.yml`, `main` ve ilgili PR'larda `typecheck`, `lint`, `test` ve `seo-audit` çalıştırır.
- **Veri CI'ı:** `.github/workflows/ingest.yml`, kaynak sağlığı, ingest, sınıflandırma kapısı ve publish adımlarını çalıştırır.
- **UI kontrolleri:** tarayıcı tabanlı betikler (`verify-ui`, `verify-nav`, `verify-theme`, `verify-glossary`, `check-overflow`, `contrast`, `type-census`, `screenshot`) çalışan sunucu ve Chrome DevTools portu isteyen geliştirici araçlarıdır; CI iş akışının parçası değildir.

PR açmadan önce:

```bash
npm run typecheck
npm run lint
npm test
npm run seo-audit
```

Sınıflandırma kurallarını değiştirdiyseniz `npm run classify-check` de çalıştırın.

---

## Depo düzeni

```
local-ai-news/
├── .github/workflows/
│   ├── ingest.yml              # 10 dakikalık veri işi
│   └── seo.yml                 # typecheck, lint, testler, SEO denetimi
├── data/
│   └── feed.json               # depoya işlenmiş yedek anlık görüntü
├── docs/
│   ├── README.md               # dokümantasyon dizini
│   ├── en/                     # kaynak dokümanlar
│   └── tr/                     # aynalanmış Türkçe dokümanlar
├── scripts/                    # ingest, publish, denetimler, ölçümler
├── src/
│   ├── app/
│   │   ├── [locale]/           # ön sayfa, modeller, kategoriler, model, haber,
│   │   │                       # araştırma, istatistik, karşılaştırma, sözlük, OG
│   │   ├── api/                # categories, feed, models, news, stats, ingest
│   │   ├── feed.rss/           # RSS rotası
│   │   ├── robots.ts
│   │   └── sitemap.ts
│   ├── components/             # kabuk, akış, ön sayfa, karşılaştırma, sözlük, UI
│   ├── i18n/                   # dil yükleyici + en/tr sözlükleri
│   ├── lib/
│   │   ├── classify/           # kategori kuralları + kalite kapısı
│   │   ├── runner/             # runner algılama, kuantizasyon, VRAM, komutlar
│   │   ├── sources/            # HF istemcisi, feed ayrıştırıcı, kaynak registry
│   │   ├── store.ts            # snapshot yükleyici + tüm okuma sorguları
│   │   ├── ingest.ts           # ingest hattı ve birleştirme mantığı
│   │   ├── query.ts            # Zod sorgu ayrıştırma ve normalleştirme
│   │   ├── seo.ts              # metadata, indeks politikası, crawler listeleri
│   │   ├── stats.ts            # Veri Masası panosu üreticisi
│   │   ├── compare.ts          # karşılaştırma satırları ve delta mantığı
│   │   ├── glossary.ts         # iki dilli sözlük içeriği
│   │   └── ...
│   └── middleware.ts           # dil yönlendirmeleri, API rate limit, platform yolları
├── tests/                      # node:test paketleri + fixture'lar
├── .env.example
├── next.config.ts
├── package.json
└── README.md / README.tr.md
```

---

## Kurallar

- **Kod, yorumlar, commit mesajları, JSON anahtarları ve test adları İngilizcedir.**
- **Commit'ler Conventional Commits** izler, örn. `feat(classify): add coding-category regex rules`.
- **Arayüz metinleri sözlüklerde yaşar**, JSX veya rota kodunda değil.
- **Dokümanlar iki dillidir:** `docs/en/*` kaynak, `docs/tr/*` aynadır. Yeni doküman eklerken ikisini de ekleyin.
- **Veritabanı yok:** anlık görüntü sözleşmedir. İlişkisel sorgular veya kullanıcı bazlı durum gerekirse bu, rastlantısal bir değişiklik değil belgelenmiş bir karar geri dönüşüdür.
- **İddia etmeden önce ölçün:** dokümanlar ölçülen sayıları ve bir kuralın nedenini kaydeder. UI veya veri davranışını değiştirirken bu alışkanlığı sürdürün.

---

## Bilinen kısıtlar ve tuzaklar

- **Hugging Face rate limiti:** kimlik doğrulamasız 500 istek / 300 sn / IP. Tarayıcı tarafında SPA ilk günde bloklanır; ingest ve önbellekleme bu yüzden sunucu tarafındadır.
- **`pipeline_tag` null olabilir.** Kurallar buna dayanıklı olmalıdır.
- **Liste uç noktası `safetensors` döndürmez**, `?full=true` ile bile. Runner algılama `siblings` ile bedava yapılır; parametre sayısı model başına bir detay isteği ister.
- **Cursor sayfalaması opaktır.** `cursor` dizesini taşıyın; base64 blobunu ayrıştırmayın.
- **`firstSeenAt`, `createdAt` değildir.** Yeniden yüklemeler eski Hub oluşturma tarihini korur; “yeni” Radar'ın ilk gözlemidir.
- **`trendingScore` mevcut snapshot'ta her modelde null**, bu yüzden trending sıralaması beğeni ve indirmelerden türetilir. Arayüz türetilmiş değeri Hub gerçeği gibi sunmaz.
- **Avatar uç noktaları token olmadan hata verir**; avatarlar yalnızca trending yanıtından gelir, monogram yedeği vardır.
- **Reddit tarayıcı User-Agent ister** ve ani istekleri sınırlar. Başarısız feed önceki öğelerini korur.
- **Eski snapshot'larda bozuk haber etiketleri var** (`organization: "[object Object]"`). Okuma yolu bunları normalize eder, birleştirme sonraki ingest'te üzerine yazar.
- **`cardSummary` bilinçli olarak `undefined`/`null` ayrımı kullanır:** `undefined` “hiç çekilmedi”, `null` “çekildi ve boş”; böylece boş README her koşuda yeniden okunmaz.
- **Bellekteki API rate limiter örnek başınadır**, global değil. Kötüye kullanım görülürse paylaşımlı bir depoya taşınmalıdır.
- **Karşılaştırma dört modelle sınırlıdır.** Fazla kimlikler sessizce atılmaz, arayüzde adlandırılır.
- **Depodaki snapshot üretimin gerisinde kalabilir.** Canlı veriyi ölçerken `scripts/fetch-snapshot.ts` kullanın.
- **Vercel platform yolları** (`/_next`, `/_vercel`) dil yönlendirmesini atlar; aksi halde analytics toplayıcısı ve statik varlıklar 404 olur.
- **Veri güncellemesi siteyi yeniden derlemez.** Sayfa eski görünüyorsa snapshot önbellek penceresini ve Blob publish adımını kontrol edin.

---

## Dokümantasyon

Tam planlar, ölçümler ve karar günlüğü `docs/` altındadır. İngilizce kaynak, Türkçe aynadır.

| Doküman | İngilizce | Türkçe |
|---|---|---|
| Dokümantasyon dizini | [docs/README.md](docs/README.md) | - |
| Ürün planı | [PLAN.md](docs/en/PLAN.md) | [PLAN.md](docs/tr/PLAN.md) |
| Karar günlüğü | [DECISIONS.md](docs/en/DECISIONS.md) | [DECISIONS.md](docs/tr/DECISIONS.md) |
| Veri depolama (Postgres yok) | [DATA-STORAGE.md](docs/en/DATA-STORAGE.md) | [DATA-STORAGE.md](docs/tr/DATA-STORAGE.md) |
| Kaynak envanteri | [SOURCES.md](docs/en/SOURCES.md) | [SOURCES.md](docs/tr/SOURCES.md) |
| Kategori kuralları | [CATEGORIES.md](docs/en/CATEGORIES.md) | [CATEGORIES.md](docs/tr/CATEGORIES.md) |
| Haber hattı | [NEWS-PLAN.md](docs/en/NEWS-PLAN.md) | [NEWS-PLAN.md](docs/tr/NEWS-PLAN.md) |
| Karşılaştırma sayfası | [COMPARE-PLAN.md](docs/en/COMPARE-PLAN.md) | [COMPARE-PLAN.md](docs/tr/COMPARE-PLAN.md) |
| İstatistik masası | [STATS-PLAN.md](docs/en/STATS-PLAN.md) | [STATS-PLAN.md](docs/tr/STATS-PLAN.md) |
| Sözlük | [GLOSSARY-PLAN.md](docs/en/GLOSSARY-PLAN.md) | [GLOSSARY-PLAN.md](docs/tr/GLOSSARY-PLAN.md) |
| SEO | [SEO-PLAN.md](docs/en/SEO-PLAN.md) | [SEO-PLAN.md](docs/tr/SEO-PLAN.md) |
| Tasarım sistemi | [DESIGN.md](docs/en/DESIGN.md) | [DESIGN.md](docs/tr/DESIGN.md) |
| Tasarım v2 denetimi | [DESIGN-V2.md](docs/en/DESIGN-V2.md) | [DESIGN-V2.md](docs/tr/DESIGN-V2.md) |
| Tasarım v3 (gazete) | [DESIGN-V3.md](docs/en/DESIGN-V3.md) | [DESIGN-V3.md](docs/tr/DESIGN-V3.md) |

---

## Henüz uygulanmayanlar

- Yönetici override paneli (`data/overrides.json` kaçış yolu var, UI yok).
- E-posta özeti.
- Yerel Ollama entegrasyonu (`localhost:11434/api/tags`).
- Mevcut runtime/topluluk feed'lerinin ötesinde yeni dış haber kaynakları - bu, rastlantısal ekleme değil açık bir karar gerektirir.

---

## Lisans

MIT. Bkz. [LICENSE](LICENSE).
