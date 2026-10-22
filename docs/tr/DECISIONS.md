# Karar kaydı (TR)

## Sabit kararlar (13 Ekim 2026)

1. Next.js App Router + TypeScript.
2. ~~Neon Postgres~~ - **14 Ekim 2026'de geri alındı**: veritabanı yok. Snapshot
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
- **Rate limit:** IP başına in-memory harita. Vercel'de bu fonksiyan instance'ı başınadır, global değildir - v1 için kabul edilebilir; kötüye kullanım çıkarsa Upstash/Redis'e taşınır.
- **VRAM tahmini:** ağırlıklar + KV cache yaklaşımı (`BYTES_PER_PARAM` × param sayısı + 4096 token'da milyar param başına 0.15 GB). UI'da `~` ile gösterilir.
- **Avatarlar:** `/api/users/{name}` ve `/api/organizations/{name}` token'sız error döndürüyor; avatarlar yalnızca trending yanıtından, monogram fallback ile.

## Filtre sorgusu işleme (2026-10-16)

Canlı ağaçta ölçüldü, sonra düzeltildi - aşağıdaki altı maddenin hepsi değişiklikten
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
- **Kategori şeridi layout'a değil sayfalara ait.** Layout ne route parametrelerini
ne de `searchParams` alıyor; bu yüzden eski `TabBar` aktif sekmeyi işaretleyemiyordu
(her kategori sayfası "Hepsi"'yi vurguluyordu) ve filtrelenmiş görünümü
sayamıyordu. Şerit artık her sayfada: feed sayfaları parse edilmiş filtrelerini
veriyor, rozet `getCategoryCounts(filters)` - okuyanın pencere, kapı, runner,
boyut, lisans ve arama filtreleri her kategoriye uygulanmış hali - linkler bu
filtreleri taşıyor (kategori değiştirmek görünümü sessizce sıfırlamıyor) ve aktif
sekme `aria-current="page"` alıyor. Filtre kurulmamışsa sayılar varsayılan 7
günlük, kapı açık görünüm; yani rozet her zaman açtığı sayfanın sayfalama
toplamına eşit (altı kategoride, filtreli ve filtresiz doğrulandı).
- **Mobildeki yatay taşma gerçekti ve düzeltildi.** Masaüstü metrikleriyle ölçüm:
360 px'de feed dokümanı 769 px genişliğindeydi, çünkü grid item'ın varsayılanı
`min-width: auto` ve 45 karakterlik kırılamaz repo id'si taşıyan tek bir kart tüm
track'i şişiriyordu. Grid item'da `min-w-0`, kart başlığında `break-words` yerine
`min-w-0 line-clamp-2` (`overflow-wrap: break-word` min-content'i düşürmüyor) ve
gate chip'inde `shrink-0` ile her route 360/390/430/768/1024/1440'da 0 taşmaya
indi - 360 px'de doküman 345 px. İlk ölçüm için bkz. docs/tr/DESIGN-V2.md §3 D1.
- **`scripts/check-overflow.ts` artık başarısız olabiliyor.** Küçük genişlikleri
`mobile: true` ile taklit ediyordu; bu yerleşim viewport'unu içerik genişliğine
şişiriyor ve `scrollWidth - innerWidth` tanım gereği 0 çıkıyordu (DESIGN.md
§6'daki yanlış GEÇTİ). Artık masaüstü metrikleri kullanıyor, emüle edilen
genliğin yerleşim genişliği olmasını bekliyor, kırpılan süsleri yok sayıyor ve
taşmada non-zero ile çıkıyor - 900 px'lik bir fixture ile kanıtlandı (+540 px,
exit 1).

## Model sayfası metni (18 Ekim 2026)

Model sayfası metinsiz bir teknik föydü: ingest yalnızca `cardData` saklıyordu ve
gösterilen üç anahtar (`baseModel`, `datasets`, `languages`) GGUF repolarının
çoğunda boş, bu yüzden `nerkyor/Qwen3.8-27B-…-NInfer` sayfası numaralar, VRAM
kutusu ve çalıştırma komutundan ibaretti - modelin *ne olduğunu* söyleyen tek cümle
yoktu.

- **Model kartı gövdesi bir kez okunuyor.** `HfClient.getModelCard()`
  `/{repo}/raw/main/README.md` adresini çeker; `lib/card-text.ts` Markdown'ı en
  fazla 600 karakterlik düz metne çevirir (frontmatter, rozet satırları, satır içi
  HTML, tablolar, kod blokları ve baştaki yazar/afiliasyon bloğu atılır). Satırda
  `cardSummary` olarak saklanır ve "Bu model hakkında" başlığı altında kartın
  tamamına bağlantıyla gösterilir - özet + atıf, kartın bütünü asla.
- **`undefined` ile `null` farklı şeyler.** `undefined` = hiç çekilmedi,
  `null` = çekildi ve boş; böylece boş bir README her koşuda değil, ömründe bir kez
  istek harcar. Backfill (`npm run cards-backfill` ve `runIngest` içindeki aynı
  geçiş) kapıyı geçen modelleri beğeni sırasına göre hedefler ve kendi istek
  tavanıyla çalışır ki detay geçişinin bütçesi bozulmasın.
- **Model sayfası artık ters bağlantıyı da gösteriyor.** `getModelNews()` "bu
  modelden nerede bahsedilmiş" diye sorar - ilişki eskiden tek yönlüydü (haber →
  model). Eşleştirme `lib/model-mentions.ts`'e taşındı: başlıkta tam repo adını
  aramak 108 karakterlik finetune id'lerinde hiç tutmuyordu (104 haberin 6'sında
  `modelSlug` vardı) ve düz kelime eşleştirmesi ölçülebilir şekilde yanlıştı ("prompt"
  yüzünden 20 haber tek modele yazılmıştı). Yalnızca sürüm biçimli token'lara
  (altı karakter, içinde rakam) güvenilir: bahsetme için `tokenDf <= 3`, saklanan
  `modelSlug` için `tokenDf === 1`. Yayındaki snapshot'ta ölçüm: 915 modelin 5'i
  bahis kazanıyor ve hepsi gerçek; eşleşme yoksa bölüm hiç basılmıyor (kapı G3).
  Mevcut korpusta sıkı ingest kuralı 98 bağlantısız satırda **0** yeni bağlantı
  üretti; bu istenen muhafazakâr sonuç.


## İstatistik sayfası: iki zaman ekseni, tek pencere sözlüğü (2026-10-20)

Kaydedildi çünkü ikisi de mevcut sayıların nasıl okunacağını değiştiriyor; tam plan
ve ölçülmüş uygulama kaydı [STATS-PLAN.md](STATS-PLAN.md) içinde.

- **İki adlı zaman ekseni.** `tracked` = `firstSeenAt` (Radar'ın satırı ilk gördüğü
  an) ve `created` = `createdAt` (Hugging Face depo tarihi). Sunulan anlık
  görüntüde ölçüldü: `firstSeenAt` **3** günü, `createdAt` **49** günü kapsıyor;
  yani "ilk görülme" üzerinden 7 / 30 / 90 / 180 gün hep 606 döndürüyordu ve
  sitenin dürüstçe çizebileceği tek günlük seri depo oluşturma serisiydi. Her
  `/stats` paneli hangi ekseni saydığını basar; envanter panelleri `firstSeenAt`'te
  kalır (sayıları akış sekmeleriyle eşit kalsın diye), zaman paneli `createdAt`'e
  taşınır.
- **Tek pencere sözlüğü.** `/stats` artık `?window=24h|7d|30d|90d` alır - akışın
  kendi `WINDOWS`'u - ve `?days=` takma ad olarak ayrıştırılır (30 → 30d, 180 →
  90d). Eski sayfa 7 / 30 / 90 / 180 gün sunuyordu ve hiçbiri farklı olamıyordu.
- **Karar 9'un belgelenmiş tek gevşetmesi.** "Her şeyi göster" 30 günle sınırlı
  kalır ve akış hâlâ kategori ister; *toplu* bir yüzey
  (`normalizeFeedQuery(input, { aggregate: true })`) bu sınır içinde tüm takip
  kümesini isteyebilir çünkü en fazla dokuz satır çizer. Kapı paneli her durumda
  kapıdan bağımsızdır, yani filtrenin sakladığı şey filtre açıkken de görünür.
- **`/api/stats` şekil değiştirdi** (`stats`/`series` → tek pano: `totals`,
  `categories`, `gateReasons`, `cadence`, `tracking`, `runners`, `wire`). Eski
  anahtarları tüketen kod yoktu; `docs/*/PLAN.md` aynı değişiklikte güncellendi.

## Henüz yapılmadı (F6 kalanı)

Admin override paneli, e-posta özeti, yerel Ollama entegrasyonu (`localhost:11434/api/tags`), harici haber kaynakları (karar 3'ü deler).
