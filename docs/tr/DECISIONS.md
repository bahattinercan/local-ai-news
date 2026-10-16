# Karar kaydı (TR)

## Sabit kararlar (13 Ekim 2026)

1. Next.js App Router + TypeScript.
2. ~~Neon Postgres~~ — **14 Ekim 2026'de geri alındı**: veritabanı yok. Snapshot
   Vercel Blob'da duruyor; bkz. `docs/tr/DATA-STORAGE.md`.
3. Kaynak yalnızca Hugging Face.
4. TR + EN, varsayılan `en`.
5. Varsayılan tazelik penceresi: 7 gün.
6. Haberler her 10 dakikada güncellenir (cron-job.org → `workflow_dispatch`).
7. Kod, yorumlar, JSON key'leri, test adları ve commit'ler İngilizce.
8. Dokümantasyon iki dilli: `docs/en/*` kaynak, `docs/tr/*` eşdeğer.
9. Kalite kapısı kullanıcı filtresi olarak (`quality_passed`, `gate_reason`, "Show everything").
10. Haberlerde türetilmiş `release` duyuruları da var.
11. Public site: SEO, JSON-LD, hreflang, IP başına rate limit, atıf, büyüme sınırları.

## Plandan sapmalar ve gerekçeleri

- **i18n:** `next-intl` yerine minimal bir sözlük yükleyicisi kullanıldı (`src/i18n/index.ts` + `src/i18n/dictionaries/{en,tr}.json}`). Planla aynı dosya düzeni ve düz key'ler; middleware bağımlılığı yok.
- **İngest konumu:** ingest GitHub Actions'ta çalışıp Neon'a doğrudan yazar; Vercel uygulaması sadece okur. Gerekçe: fonksiyon timeout'ları + 500/300s HF bütçesi.
- **Depolama:** Postgres yok. Ingest job'u `data/feed.json`'ı Vercel Blob'a
  yayımlıyor (`npm run publish`), uygulama 15 dakikalık cache ile okuyor
  (`SNAPSHOT_URL` ya da `BLOB_READ_WRITE_TOKEN`'dan keşfediliyor) ve repo'daki
  snapshot'a fallback yapıyor, böylece site hiçbir zaman boş kalmıyor. Geri
  dönüş koşulu: ilişkisel sorgu ya da kullanıcı bazlı durum gerekirse DB geri gelir.
- **Rate limit:** IP başına in-memory harita. Vercel'de bu fonksiyan instance'ı başınadır, global değildir — v1 için kabul edilebilir; kötüye kullanım çıkarsa Upstash/Redis'e taşınır.
- **VRAM tahmini:** ağırlıklar + KV cache yaklaşımı (`BYTES_PER_PARAM` × param sayısı + 4096 token'da milyar param başına 0.15 GB). UI'da `~` ile gösterilir.
- **Avatarlar:** `/api/users/{name}` ve `/api/organizations/{name}` token'sız error döndürüyor; avatarlar yalnızca trending yanıtından, monogram fallback ile.

## Filtre sorgusu işleme (2026-10-16)

Canlı ağaçta ölçüldü, sonra düzeltildi — aşağıdaki altı maddenin hepsi değişiklikten
önce `localhost:3000` üzerinde yeniden üretildi:

- **Boş parametre "ayarlanmamış" demektir.** GET formu *her* isimli kontrolü
gönderir; bu yüzden dokunulmamış bir select ya da boş arama kutusuyla *Uygula*'ya
basmak `?window=7d&runner=&maxParams=&license=&q=` üretiyordu; Zod'un `.min(1)` /
`.enum()` kuralları bu değerleri reddediyor ve `/`, `/c/[category]`, `/news`,
`/research` **500** dönüyordu. Artık `cleanSearch()` doğrulamadan önce boş ve
sadece boşluk içeren değerleri atıyor, her enum/sayı alanı hata fırlatmak yerine
varsayılanına düşüyor (`.catch()`), böylece elle düzenlenmiş `?window=abc&page=0`
sayfayı kırmak yerine varsayılan görünüme iniyor. API route'ları aynı parser'ları
kullandığı için `/api/feed?q=` de artık 500 dönmüyor.
- **`page` okunuyor.** `parseFeedQuery`, `page`'i şemaya hiç vermiyordu; bu yüzden
`/c/[category]?page=2` sayfa 1'i render ediyor ve numaralı sayfalama çıkmaz sokak
oluyordu (`parseNewsQuery`'deki aynı hata daha önce düzeltilmişti).
- **Sekme sayıları açtıkları feed'i anlatır.** `getCategoryCounts()` listedekiyle
aynı `filterModels()`'ı çalıştırır (varsayılan 7 günlük pencere, kalite kapısı
uygulanmış, gated repolar gizli); böylece sekme ile sayfa toplamı uyuşur. `getStats`
her izlenen modeli sayıyordu ve 33 kartlı sayfa için sekme "Multimodal 153"
yazıyordu.
- **Pulse sayfaya daraltılır.** `getPulse(days, category)` izlenen/geçen/sıcak
sayılarını kategoriye göre filtreler; kategori sayfası artık "önde çıkan kategori:
Embedding / RAG" ile açılmaz. O stat yalnızca bilgi taşıdığı yerde render edilir.
- **Aktif filtre özeti yalnızca kullanıcının kurduğu filtreleri listeler.**
Varsayılanlar (pencere / sıralama / kapı) her sayfada aktif filtre gibi
duyuruluyordu ve özet ham enum değerlerini yazıyordu ("Kalite kapısı: passed"),
kontrolün gösterdiği kelimeleri değil ("Sadece geçenler"). Değerler artık kontrolün
kendi option listesinden geliyor ve *Temizle* yalnızca temizlenecek bir şey varsa
görünüyor.
- **Bilinen sınır:** sekme sayısı *aktif* sorguyu takip edemez, çünkü sekme çubuğu
locale layout'unda render ediliyor ve layout `searchParams` almıyor. Pencereyi ya
da kapıyı daraltmak listeyi daraltır (sayfalama toplamı takip eder); sekme
varsayılan 7 günlük, kapı açık görünümü raporlamaya devam eder.

## Henüz yapılmadı (F6 kalanı)

Admin override paneli, e-posta özeti, yerel Ollama entegrasyonu (`localhost:11434/api/tags`), harici haber kaynakları (karar 3'ü deler).
