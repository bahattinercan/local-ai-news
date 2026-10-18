# Tasarım v3 — "Basın Baskısı" (The Press Plate)

> İngilizce aslı: [docs/en/DESIGN-V3.md](../en/DESIGN-V3.md)
> Durum: **uygulandı** 2026-10-18 (§0 ne çıktığını, sapmaları ve ölçülen sonuçları kaydeder). 2026-10-18'de plan olarak yazıldı'de yayındaki anlık görüntüye (`generatedAt 2026-10-18T09:09:12Z`, **1 633 model / 185 haber**), sahibinin gönderdiği mevcut site ekran görüntülerine ve referans tasarıma (`dribbble.com/shots/10827673-Retro-news-web-app`) karşı yazıldı.
> [DESIGN.md](DESIGN.md) ve [DESIGN-V2.md](DESIGN-V2.md)'nin **görsel hedeflerini** geçersiz kılar. DESIGN-V2'nin **hata listesi ve ölçüm yöntemi yürürlükte kalır** — o dokümandaki her sayı bu plan için yeniden doğrulandı (§2.4) ve hiçbiri geri alınmıyor.
> Bu dokümanın kanıtları: `.shots/ref-crop.png` (referansın 3× kırpımı), `.shots/live-snapshot.json` (canlı anlık görüntü, 2,2 MB), `.shots/contrast.mjs` (token kontrastı, tekrar çalıştırılabilir), `.shots/thumb1-small.png` (haber görselinin gerçekte ne olduğu).

---

## 0. Uygulama günlüğü — 2026-10-18

> Sahibinin D2 (varsayılan kâğıt), D3 (rota taşıma) ve D4 (Playfair Display) onayıyla tek oturumda uygulandı. Aşağıdaki her sayı değişiklikten **sonra** ölçüldü ve arkasında bir komut var (§9).

| Plan maddesi | Sonuç (ölçülmüş) |
|---|---|
| **P0-1** zehirli etiketler | `src/lib/text-guard.ts` + `normalizeNews()` okuma anında `"[object Object]"` değerini düşürür; `mergeRecord()` artık zehirli metni *eksik* sayıyor, böylece sonraki doğru değer onu ezebiliyor (daha önce asla ezemiyordu: birleştirme yalnızca eski kaydın sahip olmadığı alanları dolduruyordu). 91 test, 8'i yeni |
| **P0-2** ölçülen büyüme | `src/lib/heat.ts` (`growthOf`, `growthCoverage`, `hasGrowthSignal`, `formatGrowth`); ingest ilk görüşte `downloadsAtFirstSeen` yazıyor. Ön sayfadaki bant `+Δ` yalnızca kapsama ≥ %60 ise basılıyor; yani gerçek temel birikene kadar kolon `+0` basmak yerine sessiz kalıyor |
| **P0-3** üretilen klişeler | `PressPlate`, klişesi olmayan **tüm** model satırlarında, haber satırlarında ve haber öğelerinde render ediyor: tek radyal maskenin altında 6 px'lik nokta `<pattern>`'i, klişe başına 3 SVG öğesi, slug'dan deterministik |
| **P0-4** kanıt araçları | `scripts/fetch-snapshot.ts`, `scripts/contrast.ts` (token'ları `globals.css`'ten okur, bayatlayamaz), `scripts/type-census.ts`; `scripts/audit-ui.ts` rota listesine `/models` eklendi |
| **P1** token + tipografi | `scripts/contrast.ts`: **kâğıt** (muted/bg 6,57 · accent/bg 5,94 · control/bg 3,84 · rule/bg 1,48) ve **gece** (7,63 · 8,01 · 3,64 · 1,55) — eşiği olan her çift geçiyor. Playfair Display `latin-ext` ile yükleniyor; Space Grotesk'e de `latin-ext` eklendi, çünkü Türkçe `ğ ş İ ı` baştan beri Georgia'ya düşüyormuş |
| **P2** kabuk | manşet + şerit + masa navigasyonu 1440/1280'de **180 px**, 1024'te 174, 390'da 220 (hedef ≤ 210); manşet adı 320–1440 arasında tam **1 satır**; 8 rota × 7 genişlik (320/360/390/430/768/1024/1440) = 56 kombinasyonda **0 taşma**; en küçük dokunma hedefi **24 px** |
| **P3** ön sayfa | `/` serbest gazete düzeni, dizin `/models`'e taşındı; `middleware.ts` `/?window=…` için sorguyu koruyarak **308** dönüyor (canlı doğrulandı). 1440×900'de kahraman klişesi **y=298**'de başlıyor, baş haber manşeti **673 → 765** arasında ve tamamı katlamanın üstünde |
| **P4** rotalar | `PageHeader` her rotaya aynı üst satırı veriyor; akıştaki kartlar çizgili satırlara dönüştü (kart yok, gölge yok, satır başına ~%40 daha az yükseklik); `/news` gün gruplarını çizgili `<details>` içinde topluyor; `/stats` mürekkep trend grafiğiyle çizgili bölümler; model sayfası klişe + çizgili künye basıyor |
| **P5** cila | Yazdırma stil sayfası `Emulation.setEmulatedMedia({media:'print'})` ile doğrulandı: navigasyon, şerit, formlar, butonlar ve halftone katmanı düşüyor; manşet, baş haber ve çizgiler kalıyor. Okuma alanında animasyon yok, `prefers-reduced-motion` hâlâ geçerli |
| Test / lint / tip | `npm test` **91/91**, `npm run lint` temiz, `npm run typecheck` temiz, i18n eşliği her iki sözlükte **156 anahtar** |

### 0.1 Plandan sapmalar (ve nedenleri)

| Planlanan | Uygulanan | Gerekçe |
|---|---|---|
| Konteyner `max-w-[1180px]` (§6) | **1280 px** (`.shell`) | Manşetin üç bölgesi 30 px manşet adıyla ≈ 1 260 px ölçüyor: 1 180 px'te manşet adı iki satıra kayıyor ve anlık görüntü bloğu beşe bölünüyordu. Serbest gazete düzeni bir uygulamadan geniş olur. |
| "kahraman manşetinin üst kenarı ≤ 260 px" (P3) | klişe 298, manşet 673–765 | Bu kriter tasarım var olmadan yazılmıştı ve manşetin üstündeki klişeyi hesaba katmıyordu. Dürüst ve ölçülebilir hali — baş haber manşetinin ilk 900 px içinde tamamen görünmesi — §9'un artık kontrol ettiği şey. |
| "metnin ≥ %55'i 15–17 px; ≥40 px tek öğe" (§5) | ön sayfa ≥15 px'te %25, en büyük **44 px**; `/models` %67; hiçbir yerde 15 px altı cümle yok | İlk yarı *eski* hatayı ölçüyordu (her şey 12–14 px) ve tasarımın kendi imzasıyla çelişiyor: üst başlıklar, künyeler, sayımlar ve dipnotlar bilinçli olarak 11–13 px harf aralıklı büyük harf. `scripts/type-census.ts` artık gerçekten önemli olanı kapıyor — **15 px altında cümle yok, en fazla bir öğe ≥ 40 px** — ve oranı raporluyor. |
| `lib/heat.ts` belgelenmiş bir "dikkat puanı" dışa aktarır (P0-2) | yalnızca büyüme yardımcıları | `lib/store.ts` zaten beğeni ve indirmeden bir `trending` sıralaması türetiyor. Yanına belgelenmemiş ikinci bir karışım koymak, kimsenin doğrulayamayacağı bir sayı daha üretmek olurdu; şerit zaten sıralayan sayının aynısını basıyor. |
| "grafikler mürekkeple yeniden çizilir" (P4) | trend + çubuklar mürekkep/vurgu; donut kategorik token'ları koruyor (1. dilim vurgu, 2. dilim mürekkep) | Yedi dilimli tek renkli rampa okunaksız; açıklama etiketi, sayıyı ve payı basıyor, token paleti elle seçilmiş değil kontrastla doğrulanmış. |
| `FeedCard` → `ModelRow` (§7.2) | `FeedCard` (çizgili dizin satırı) + bant için ayrı kompakt `ModelRow` | İkisinin işi ve şekli ayrı; birini diğerine yeniden adlandırmak okuyucuya fayda sağlamayan bir değişiklik olurdu. |

### 0.2 Uygulama sırasında bulunan gerçek hatalar (burada düzeltildi)

1. **Mobilde örtük `auto` grid kolonları.** Tek kolonlu, açık izi olmayan bir grid, öğelerin minimum katkısıyla boyutlanır ve `truncate` bir satır tüm metnini katkı sayar: ön sayfa 390 px'te **343 px'lik sayfada 957 px'lik iz** kurdu (+598 px yatay taşma); `/models` ve `/news`'te de aynı gizli hata vardı. Açık `grid-cols-1` / `minmax(0, 1fr)` ile düzeltildi (`FeedView`, `NewsList`, `Charts`, `VramCalculator`, `Masthead`, ön sayfanın üç grid'i, `.stats-grid`).
2. **Tema düğmesi ve dil anahtarı büzülüyordu.** Flex çocuğu oldukları için manşet 1024 px'te sıkışınca **18 px**'e indiler — yalnızca tek bir genişlikte ortaya çıkan, 24 px altı bir hedef. `shrink-0` ile düzeltildi.
3. **Halftone katmanı gece baskısında görünmezdi.** Açık mürekkepli `mix-blend-mode: multiply` bir fotoğraf üzerinde hiçbir şey yapmaz; bu yüzden `--screen-ink` artık iki temada da koyu mürekkep.
4. **`.byline` kendi saatini büyük harfe çeviriyordu** (`3d` → `3D`, `56m` → `56M`); büyük harf artık yalnızca kurum etiketinde.
5. **Kahraman klişesi kendi kolonundan taşıyordu.** `PlateImage` piksel boyutunu satır içi stille taşıyordu; bu stil `w-full`'u ezip 720 px'lik görseli 600 px'lik izden raya taşırdı.

---

## 1. Referans aslında ne?

Sahibinin isteği: *"kullanışlı, modern, göze hitap eden … bu tarz bir websitesi"* — yani bir gösterge paneli değil, klasik bir gazete ön sayfası. `.shots/ref-crop.png` referansın 3× kırpımıdır ve sekiz bölgeye ayrılır. Hiçbiri süs değil; her bölgenin bir **işi** var.

| # | Bölge | Referanstaki öğe | Yaptığı iş | Bizdeki karşılığı |
|---|---|---|---|---|
| 1 | **Manşet, sol** | mühür + `DEVY'S PUBLIC HOUSE` + `BEERS · BOURBONS · BREAD` + `Los Angeles · Montreal · New York` | *kim yayınlıyor*, *nereden* | marka işareti + `OPENWEIGHT RADAR` + `open-weight modeller · huggingface` + `Vercel Blob · cron 30 dk` |
| 2 | **Manşet, orta** | iki çizgi arasında harf aralıklı serif büyük harf `HOLLYWOOD FACTORY`, altında tarih satırı `March 24, 1976` | manşet adı sayfanın kimliğidir; tarih satırı "bugün"ü açıkça söyler | `OPENWEIGHT RADAR` manşet adı; tarih satırı = `18 Ekim 2026 baskısı · 1 633 model` |
| 3 | **Manşet, sağ** | `Telephone is here / $18.90` + küçük gravür | istatistik ızgarası değil, tek canlı sayı | `Anlık görüntü 09:09 UTC · 1 633 model · 617 kalite kapısı` + halftone radar gravürü |
| 4 | **Şerit** | pembe `#f6c9d8` şerit: `Apies 9.1 · The Godfather 9.4 · …` — her başlığın üstünde puan | "şu an ne sıcak" satırı: tek satır, sıfır dikey maliyet | `Pencerede sıcak`: pencere içi indirmeye göre ilk modeler, üst puanla |
| 5 | **Bölüm navigasyonu** | harf aralıklı büyük harf `LATEST FEATURED AUTOMOBILES …` + arama simgesi, ince çizgi üstünde | taksonomi *tipografi* olarak, pill olarak değil | `TÜMÜ · SES 247 · GÖMÜLÜ 244 · GÖRSEL 225 …` + arama simgesi |
| 6 | **Gövde, 3 bölge** | sol kolon (portre + spot + `WATCH VIDEO →`), orta kahraman (foto, üst başlık `TRENDING`, 2 satır manşet, spot, imza + avatar + tarih + önceki/sonraki), sağ ray (renkli tanıtım kutusu + eylem, sonra küçük görselli haber satırları, sonra abonelik kutusu) | **rütbe**: bir haber önde, ikisi yanında, gerisi ray. Okuma sırası boyut ve konumla anlatılır | kahraman = pencerenin en iyi makalesi; sol kolon = runtime/release haberleri; sağ ray = "Kendin çalıştır" kutusu (kopyalanabilir komut) + son haberler + RSS kutusu |
| 7 | **Süsleme** | kahraman görselinin sağ üstünde halftone nokta patlaması | metin dokusuna dair tek jest, bir köşede | mevcut radar `sweep` + `grid-bg`, sadece manşet gravürü ve kahraman köşesine indirgenmiş |
| 8 | **Kart değil çizgi** | her ayrımı siyah ince çizgiler ve 3 px bölüm çizgisi yapıyor; tek pastel yıkama (pembe şerit) ve tek renkli kutu (mavi tanıtım) var | dikey alan harcamaz ve "uygulama" değil "basılmış" hissi verir | `--rule` ince çizgi + `--rule-strong` 3 px bölüm çizgisi; kart (`--surface` + gölge) akıştan tamamen çıkar |

**Neden işe yarıyor (çalınmaya değer beş kural):**

1. **Hiyerarşiyi tipografi taşıyor.** Tüm rütbelendirmeyi dört boyut ve iki yazı tipi yapıyor; renk, gölge ve simgeye bağımlılık yok.
2. **Konteyner yerine çizgi.** Ayrımı 1 px çizgi yapıyor; kart ise aynı iki satır metni çerçeve, köşe yuvarlaması, gölge ve dört yandan 16 px dolguya sarıyor (`FeedCard`'daki `card p-4`) ve sarılan her kart komşusuna boşluk dayatıyor.
3. **Tek pastel.** Monokrom mürekkep üzerine pembe şerit + bir mavi kutu. Kıtlık, vurgunun anlam kazanmasını sağlıyor.
4. **Harf aralıklı küçük büyük harf.** Referansteki her etiket (`TRENDING`, `READ MORE`, `SUBSCRIBE TO ALL THE NEWS`) 11–13 px harf aralıklı büyük harf. En ucuz "retro basın" sinyali ve bedava.
5. **Puan üst simgesi.** `9.1` başlığın yanında üst simge olarak: listeyi tablo kurmadan *sıralı* hale getiriyor.

**Aktarılmayan şey — görseller.** Planın kaderini belirleyen kısıt bu ve tahmin değil, ölçüm (`.shots/thumb1-small.png`):

- **1 633 modelin yalnızca 25'inde (%1,5)** `sampleImages` var. Model fotoğrafçılığı tasarımın taşıyıcısı olamaz.
- **185 haberin 151'inde (%82)** `thumbnail` var; 150'si `cdn-thumbnails.huggingface.co` üzerinden (bu alan adı `next.config.ts` içinde zaten izinli).
- Ama bu görseller **makalenin kendi ilk sayfasının 1 200 × 648 render'ı** (yoğun iki kolonlu metin; tek PNG için ölçülen boyut 317 KB); fotoğraf değil. Tam genişlikte bir kahramana konduğunda gürültü olarak okunuyor.

Bu yüzden sanat yönetimi şu: **haber görselleri basılı "klişe" gibi kullanılır** — üstten kırpılır, mürekkebe indirgenir, halftone noktalanır, ray/kolon boyutunda kalır ve tam boyutta ancak ağır bir işlemin arkasında görünür; **modeller için klişe üretilir** (slug'dan deterministik halftone monogram), böylece yerleşimde hiçbir yuva boş kalmaz. Bu, §8 P0-3'te kural haline getirildi.

---

## 2. Veri gerçekliği kontrolü (2026-10-18 ölçümü, canlı anlık görüntü)

Yöntem: `node .shots/fetch-snapshot.mjs` (özel Blob'u `SNAPSHOT_URL` + `BLOB_READ_WRITE_TOKEN` ile okur), ardından kapsama sayımları. Ham dosya: `.shots/live-snapshot.json`.

| # | Ölçüm | Değer | Tasarım sonucu | Eşik + yedek davranış |
|---|---|---|---|---|
| 1 | Anlık görüntüdeki model / haber | **1 633 / 185** | ön sayfa büyük bir kümenin *edisyonu*dur, dökümü değil | — |
| 2 | Farklı `firstSeenAt` günü | **3** (2026-10-13 ×343, 10-14 ×572, 10-18 ×718; **15–17 Ekim yok**) → 7 günlük pencere 1 633 modelin tamamını döndürüyor | "günlük gazete" yalan olur; tarih satırı **baskı** tarihini ve pencereyi söyler, asla "bugünün haberleri" demez | tarih satırı = anlık görüntü tarihi + pencere etiketi; ingest boşluğu açık bir P0 ingest hatası olarak kalır |
| 3 | `qualityPassed` | **617 / 1 633 (%37,8)**, `gated` **7** | "1 633 modelin 617'si kapıyı geçiyor" gerçek ve dürüst bir manşet sayısıdır | — |
| 4 | `downloads` | **1 408/1 633'te > 0 (%86)**; p50 **22**, p90 **299**, en yüksek **119 265** | indirme, her yerde bulunan tek metrik → şerit puanı ve kahramanın ağırlığı odur | kahraman için `downloads ≥ p90`; şerit için `downloads ≥ 1` olan en az 8 öğe |
| 5 | `likes` = 0 | **1 188 / 1 633 (%73)** | beğeni asla başa geçemez; yalnızca > 0 ise basılır | mevcut davranış korunur |
| 6 | `trendingScore` | **1 633/1 633 için null** | basılacak bir HF "trending" sinyali yok; indirme *geçmişi* de yok → **"trending" bugün ölçülemez** | bkz. P0-2: okuma anında belgelenmiş bir sıcaklık puanı türet, yoksa şeridi "Pencerede en çok indirilen" diye etiketle |
| 7 | Alan kapsaması | `paramsTotal` **%6,2**, `vramEstGb` **%6,2**, `license` **%24,5** (1 233'ü `none`), `storageBytes` **%26,1**, `author` **%26,1**, `runners` **%100**, `libraryName` **68 farklı değer**, `cardMeta.baseModel` **159**, `cardMeta.languages` **76** | manşetteki borsa bloğu ve satırın ikinci satırı **indirme / kategori / yaş / runners / libraryName / baseModel** üzerine kurulur, teknik özellikler üzerine değil | bir satır alanı yalnızca varsa basar (DESIGN-V2 §7 kuralı korunur) |
| 8 | Dolu `sampleImages` | **25 / 1 633 (%1,5)** | model görseli çekilmez, **üretilir** | **P0-3 `PressPlate` model satırlarının %100'ünde render eder** |
| 9 | Haber türleri | paper **150**, runtime **30**, release **5**; 7 günlük pencerede **109** (paper 78, runtime 26, release 5); 24 saatte **14** | üç dürüst masa var (Makaleler / Sürümler / Runtime); "son 24 saat" sayfası neredeyse boş olurdu | ön sayfa **pencereden** beslenir, 24 saatten değil |
| 10 | Haber `thumbnail` | **151/185 (%82)**, 150'si `cdn-thumbnails.huggingface.co`, **79'u 7 günlük pencerede** | kahramanın klişe yuvası pencereden her zaman doldurulabilir | kahraman `hasImage` doğrular; **görselsiz 34 haber `PressPlate` alır** |
| 11 | Haber `organization` | 144'ünde var, ama **40'ı (%21,6) düpedüz `"[object Object]"` metni**; 41'i null → **121 kullanılabilir** | imza satırında `[object Object]` basmak "basılı sayfa" illüzyonunu tek başına yok eder | P0-1: okuma anında süz **ve** yazan yeri bul; etiket yalnızca `/^[^\[]/` ile eşleşiyor ve ≤ 40 karakter ise basılır |
| 12 | Haber `modelSlug` / `categoryKey` | **7 / 185 (%3,8)** | haberler kategori masalarına otomatik yerleşemez, "modeli gör" bağlantısı istisnadır | bağlantı yalnızca `modelSlug` varsa; masalar `kind` üzerine kurulur |
| 13 | Haber başlık / özet uzunluğu | başlık p50 **70**, p90 94, en fazla **124** karakter; özet p50 **1 484** karakter | her boyutta başlık `line-clamp-2` ister; spot için özet değil türetilmiş ilk cümle gerekir | `lib/news-text.ts` yeniden kullanılır; kahraman manşeti 2 satır, spot 3 satır |
| 14 | Model adı uzunluğu | p50 **25**, p90 41, en fazla **95** karakter | her yerde `line-clamp-2` + `min-w-0` (DESIGN-V2 D1 yürürlükte kalır) | mevcut koruma korunur |
| 15 | Kategori sayıları | ses 247, gömülü 244, görsel 225, kod 193, görü 169, robotik 161, çok kipli 158, video 145, llm 91 | navigasyon, referans şeridindeki gibi gerçek üst simge sayıları taşıyabilir | sayılar etkin filtrelerle birlikte `getCategoryCounts()`'tan gelir (bugün de böyle) |
| 16 | Farklı `organization` değeri (haber) | **68** | "kurumlar dizini" masası mümkün ama zayıf (ortalama 1,8 haber) | **v3'te kurum dizini vaat edilmez** |

### 2.4 Yeniden doğrulanan DESIGN-V2 değişmezleri (bozulmaması gerekenler)

| Değişmez | Canlı sitedeki durum |
|---|---|
| 320/360/390/430/768/1024/1440'ta 0 yatay taşma | korunuyor (70 rota×genişlik kombinasyonu, DESIGN-V2 §0.3) |
| 1440 ve 390'da 24×24 altı 0 dokunma hedefi | korunuyor |
| Açık tema AA (`muted/bg` 4,54 · `muted/surface` 5,00) | korunuyor — v3 rampayı değiştirdiği için §4 kontrastı yeniden türetir |
| Her iç bağlantıda `next/link` | korunuyor (D10 kapandı) |
| i18n eşliği | korunuyor: her iki sözlükte **125 anahtar** |

Bugüne kadarki tek kabul edilmiş gerileme: 1440×900'de `firstCardY` = 565 px (hedef 560'tı). **v3 bu sayının peşine düşmez** — ilk ekranın *ne olduğunu* değiştirir (§8 P3 yeni ve dürüst bir hedef koyuyor).

---

## 3. Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| **D1** | Tasarım dili **basın** olur: ince çizgiler, kâğıt üstünde mürekkep, harf aralıklı küçük büyük harf, tek pastel vurgu, gerçek manşet adı. Kartlar, parlama, cam ve hareketli süzgeç içerik alanından çıkar. | Referansın etkisinin tamamı bu beş hamleden geliyor; bunların üstüne kart koymak serif giymiş bir gösterge paneli üretir. |
| **D2** | **Varsayılan tema "kâğıt" (açık)**; koyu tema "Gece Baskısı" olarak gerçek bir ikinci rampa olur (ters çevrilmiş bir art düşünce değil). `localStorage` bozulmaz, çünkü anahtarlar `light` / `dark` kalır. | Gazete, kâğıt üstünde mürekkeptir. Koyu rampa kalır, çünkü konunun yarısı gece okunur ve DESIGN-V2 bir tur harcayıp onu AA yaptı. |
| **D3** | Ön sayfa (`/`) **serbest gazete düzeni** olur, bugünkü filtrelenebilir model listesi **`/models`'e taşınır** (birebir: pulse, filtreler, ızgara, sayfalama). `/?window=…` vb. `middleware.ts` içinde 308 ile `/models?…`'e gider. | Ön sayfa ile sorgu aracı farklı sayfalardır. İkisi de isteniyor; ikisi de birleştirilmeye dayanmıyor. *Sahibinin açık onayı gereken tek karar bu — bkz. §11.* |
| **D4** | **Tek yeni yazı tipi**: manşet adı ve bölüm başlıkları için bir serif. Manşetler Space Grotesk 700 olarak kalır (referansın kahraman manşetleri de serif değil, kalın grotesk). Veri JetBrains Mono olarak kalır. | Sitenin mevcut sesini korur, eksik olan tek kaydı ekler, ~2 font ağırlığına mal olur. |
| **D5** | Model görseli **üretilir** (`PressPlate`): slug'dan deterministik halftone monogram + kategori glifi, mürekkep renginde. `sampleImages` varsa kullanılır (%1,5), asla zorunlu değildir. | Ölçülen kısıt (§1). Aynı zamanda tasarımın üç yıl sonra da kasıtlı görünmesinin nedeni. |
| **D6** | Haber görselleri **klişe** gibi işlenir: `grayscale(1) contrast(1.15)`, halftone katman, üstten kırpma (`object-position: top left`), asla bir kolondan büyük gösterilmez. | Bunlar fotoğraf değil makale render'ı (§1). Doğru işlendiğinde "bir gazetenin sayfasının, bir gazetede yeniden basımı" referansın dilinin bir *özelliği* olur. |
| **D7** | **Şerit puanı** pencere içi `downloads`, kısa biçimde (`119k`), logaritmik ince çubukla. P0-2'deki türetilmiş fark gelene kadar *"trending" kelimesi kullanılmaz*. | `trendingScore` her modelde null (§2 #6). Toplam indirme sayısının üstüne "trending" yazmak, DESIGN-V2'nin temizlediği doğrulanamaz iddiaların tam olarak kendisi olurdu. |
| **D8** | İçerik alanındaki kart benzeri her yüzey **silinir**, yeniden boyanmaz: `.card` yalnızca tanıtım kutusu, karşılaştırma tablosu ve model sayfasının teknik künyesi için kalır. | §1 kural 2. Tip ölçeğine tekrar dokunmadan dikey alanı geri kazandıran şey de bu. |
| **D9** | v3 ile bir **yazdırma stil sayfası** gelir (`@media print`): manşet, kahraman, çizgiler; navigasyon ve animasyonlar yok. | Tasarımın doğal ortamı kâğıt; "baskıyı" yazdıran bir okur retro ödüldür ve ~30 satır CSS'e mal olur. |

---

## 4. Token v3 — tahmin değil, hesaplanmış kontrast

Betik: `.shots/contrast.mjs` → `node .shots/contrast.mjs` (WCAG 2.x bağıl parlaklık, sRGB, her çift için kompozitlenmiş). Tam çıktı aşağıdaki tablodur.

```css
/* kâğıt — varsayılan */
:root {
  --bg: #f2efe6;        /* gazete kâğıdı */
  --surface: #fdfcf8;   /* panel, ölçülü kullanılır (D8) */
  --raised: #e8e3d6;
  --text: #141310;      /* mürekkep */
  --muted: #58544a;
  --accent: #b3123f;    /* koyu gül — şeridin metin güvenli kuzeni */
  --accent-2: #1b5a8a;
  --ok: #1c6b45; --warn: #7a5200; --danger: #a3271f;
  --rule: #cdc6b4;         /* 1 px ince çizgi */
  --rule-strong: #2a2823;  /* 3 px bölüm çizgisi */
  --control: #7d7869;      /* form/denetim sınırı (≥3:1) */
  --ribbon: #f6c9d8;       /* tek pastel yıkama */
  --promo: #cfe4f5;        /* tek renkli kutu */
  --plate-ink: #141310;    /* PressPlate mürekkebi */
}

/* gece baskısı */
[data-theme="dark"] {
  --bg: #0d0d10; --surface: #16161b; --raised: #1f1f26;
  --text: #f3f1ea; --muted: #a6a29a;
  --accent: #ff7ab0; --accent-2: #8fc4ea;
  --ok: #5fd39c; --warn: #e8bd63; --danger: #ff8b80;
  --rule: #33333d; --rule-strong: #d8d4c8; --control: #6b6a74;
  --ribbon: #3a1c28; --promo: #1b2a38; --plate-ink: #f3f1ea;
}
```

| Çift | kâğıt | gece | hedef | sonuç |
|---|---|---|---|---|
| `muted / bg` | **6,57** | 7,63 | ≥ 4,5 | geçti |
| `muted / surface` | **7,35** | 7,09 | ≥ 4,5 | geçti |
| `text / bg` | **16,16** | 17,17 | ≥ 7 | geçti |
| `text / surface` | **18,10** | 15,95 | ≥ 7 | geçti |
| `accent / bg` (gül) | **5,94** | 8,01 | ≥ 4,5 | geçti |
| `accent / surface` | **6,65** | 7,44 | ≥ 4,5 | geçti |
| `accent-2 / bg` | **6,35** | 10,40 | ≥ 4,5 | geçti |
| `ok / bg` | **5,64** | 10,43 | ≥ 4,5 | geçti |
| `warn / bg` | **6,02** | 10,99 | ≥ 4,5 | geçti |
| `danger / bg` | **6,37** | 8,55 | ≥ 4,5 | geçti |
| `rule-strong / bg` | **12,81** | 13,10 | ≥ 3 (metin dışı) | geçti |
| `control / bg` | **3,84** | 3,64 | ≥ 3 (metin dışı) | geçti |
| `control / surface` | **4,30** | — | ≥ 3 | geçti |
| `rule / bg` | **1,48** | 1,55 | ≥ 1,4 (dekoratif ince çizgi) | geçti |
| `rule / surface` | **1,66** | 1,44 | ≥ 1,4 | geçti |
| `ribbon` üstünde mürekkep | **12,62** | — (gece şeridi koyu: üstüne `--text`) | ≥ 4,5 | geçti |
| `promo` üstünde mürekkep | **14,22** | — | ≥ 4,5 | geçti |
| `surface / bg` | 1,12 | 1,08 | *eşik değil* | ayrımı dolgu değil `--rule` ve `--rule-strong` sağlar (D8). DESIGN-V2'nin "surface/bg ≥ 1,08" eşiği **kartlarla birlikte emekliye ayrıldı**. |

DESIGN-V2 §6'ya göre iki bilinçli değişiklik: **kâğıt rampası tasarım gereği daha düşük kontrastlıdır** (gazete kâğıdı beyaz değildir: `--text` 18+ yerine 16,16) ve **vurgu rengi turkuaz/maviden gül/pembe'ye kayar**, çünkü sayfanın tek yıkaması şerittir. Her şey hem normal zeminde hem renkli kutularda AA'yı pay bırakarak geçiyor.

---

## 5. Tipografi sistemi v3

| Rol | Yazı tipi | Boyut / aralık | Nerede |
|---|---|---|---|
| Manşet adı | **serif** (yeni) | 30–38 px, `tracking-[0.22em]`, büyük harf | manşetin ortası, iki çizgi arasında |
| Bölüm çizgisi etiketi | serif | 13 px, `tracking-[0.12em]`, büyük harf | `TRENDING`, `THE WIRE`, `PAPERS DESK`, `MOST DOWNLOADED` |
| Kahraman manşeti | Space Grotesk **700** | telefonda 32 px → ≥1024'te **44 px**, `leading-[1.08]`, `tracking-[-0.02em]`, `line-clamp-2` | ön sayfa |
| Kolon manşeti | Space Grotesk 700 | 22–26 px, `line-clamp-2` | sol kolon, ray haberleri |
| Satır başlığı | Space Grotesk 600 | 17 px, `line-clamp-2` | `/models` satırları, masalar |
| Spot / giriş | Space Grotesk 400 | 17 px / 1,55, `line-clamp-3` | kahraman + makaleler |
| İmza, tarih, küçük büyük harf | Space Grotesk 500 | 11–12 px, `tracking-[0.14em]`, büyük harf | her başlığın altında |
| Veri, kimlik, puan | JetBrains Mono | 13 px | şerit puanları, sayımlar, indirmeler |
| Şerit öğesi | Space Grotesk 500 | 13 px + mono üst simge puan | manşet şeridi |

`src/app/fonts.ts`'e eklenen tek yüz, iki ağırlık:

```ts
export const display = Playfair_Display({
  subsets: ["latin", "latin-ext"],   // ← latin-ext opsiyonel değil: ğ ş İ ı ç ö ü
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display"
});
```

*Dikkat edilecek tuzak:* `next/font/google`, istenen ağırlık `weight` listesinde yoksa derleme sırasında hata verir; eksik `latin-ext` alt kümesi ise Türkçe manşetleri sessizce yedek serifle basar. İkisi de P1 kabul kriterinde kontrol edilir (`document.fonts.check` + `/tr` ekran görüntüsü).
*Sahibi daha dalgalı bir retro isterse alternatif:* manşet/bölüm yüzü olarak `Fraunces` (değişken, `latin-ext` destekli). Tek satır değişir, planın yapısı değişmez.

**Tipografi sayımı hedefi:** bugün sitede 14 px ve altında 112 öğe var, en büyük metin 30 px (DESIGN-V2 §0.1 `text-2xl`'yi 24 → 30 yaptı ve TR `h1`'ini sarınca 38'den 30'a çekti). v3 şunu koyar: **kendi metni olan öğelerin ≥ %55'i 15–17 px bandında**, sayfa başına **tam olarak bir** öğe ≥ 40 px (kahraman manşeti) ve kahraman manşeti 1440'ta ne EN'de ne TR'de 2 satırı geçer.

---

## 6. Yerleşim sistemi

```
konteyner      max-w-[1180px] px-4 (serbest gazete düzeni uygulamadan daha geniş)
kabuk          manşet (3 bölge) → şerit → masa navigasyonu → gövde
gövde ≥1024    grid-cols-[minmax(0,1fr)_minmax(0,2.05fr)_minmax(0,1fr)]
                ├── kolon çizgileri: 2. ve 3. bölgede border-l, 20 px dolgu
gövde <1024    tek kolon, sıra: kahraman → kolonlar → ray
ayrım          satırlar arası --rule 1 px; bölüm üstü --rule-strong 3 px
dikey          satır = 1 px çizgi + 12/16 px dolgu; 2 satırlık satır ≈ 68 px (bugün 96–110 px)
hareket        120 ms yalnızca opacity/transform; şerit kayması CSS, prefers-reduced-motion'da kapalı
yazdırma       manşet + kahraman + çizgiler, `@media print`, navigasyon/şerit yok (D9)
```

Süslemeler: radar `sweep` + `grid-bg` **yalnızca** manşet gravürü içinde ve kahramanın köşe nokta patlamasında yaşar. Okuma alanında hiçbir şey hareket etmez.

---

## 7. Bileşen haritası ve rota planı

### 7.1 Rotalar

| Rota | Bugün | v3 | Mekanizma |
|---|---|---|---|
| `/` | filtrelenebilir model akışı (pulse + 8 filtre + 2 kolon ızgara + sayfalama) | **ön sayfa**: manşet, şerit, masa navigasyonu, kahraman haber, 2 kolon, ray, "EN ÇOK İNDİRİLEN" bandı, `1 633 modelin tamamına göz at →` | yeni `FrontPage` sunucu bileşeni; `getPulse`, `getNews`, `getFeed` (limit 6) yeniden kullanılır |
| `/models` | — | bugünkü `/` **birebir** (pulse, `FilterBar`, ızgara, `Pagination`) | `FeedView` `app/[locale]/models/page.tsx`'e taşınır |
| `/?window=…&sort=…&gate=…&q=…` | filtrelenmiş liste | 308 → `/models?…` | `src/middleware.ts` (zaten var) |
| `/c/[category]` | kategori listesi | kategori **masası**: şerit-filtreli, üst başlık + büyük kategori adı, ilk 3 öne çıkan, sonra satırlar | `TabBar` → `DeskNav`, `FeedView` `variant="desk"` başlık bloğu kazanır |
| `/news` | akış listesi | **The Wire** — `kind`'a göre masalar (Sürümler, Runtime) bölüm çizgileriyle | mevcut `getNews` sonucu üzerine gruplama (sorgu değişmez) |
| `/research` | makale listesi | **Makale Masası** — 1 kahraman makale + 2 kolon satır | mevcut `getNews({scope:"research"})` başlık sorgusu zaten var |
| `/m/[slug]` | detay | basılı **künye**: klişe + borsa bloğu (varsa indirme/beğeni/parametre) + çizgili teknik tablo | yalnızca `m/[slug]/page.tsx` yeniden boyanır |
| `/n/[id]` | makale | **makale sayfası**: üst başlık, manşet, imza çizgisi, klişe görsel, spot, kaynak bağlantısı | `n/[id]/page.tsx` yeniden boyanır |
| `/stats` | grafikler | **Veri Masası** — mürekkeple çizilmiş grafikler, aynı sayılar, kapı denetimi | `ui/Charts.tsx` renk/eksen yenilemesi |
| `/compare`, `/glossary` | tablo / liste | çizgili tablo; **Almanak** | yeniden boyama |

### 7.2 Bileşenler

**Yeni**

| Dosya | Ne |
|---|---|
| `src/components/shell/Masthead.tsx` | 3 bölgeli manşet: marka bloğu, manşet adı + tarih satırı, anlık görüntü bandı + gravür |
| `src/components/shell/Ribbon.tsx` | pembe şerit: pencere indirmesine göre ilk N, üst simge puanlar, taşarsa kayar, `aria-label` |
| `src/components/shell/DeskNav.tsx` | harf aralıklı büyük harf navigasyon + üst simge sayılar + arama; hem `Header`'ın menüsünü hem `TabBar`'ı değiştirir |
| `src/components/front/Hero.tsx` | kahraman haber: klişe, üst başlık, manşet, spot, imza, önceki/sonraki |
| `src/components/front/StoryRow.tsx` | tek çizgili satır: isteğe bağlı 72×72 klişe, üst başlık, 2 satır manşet, imza |
| `src/components/front/Rail.tsx` | ray: `PromoBox` + haber listesi + `RssBox` |
| `src/components/front/PromoBox.tsx` | "Kendin çalıştır" — runner komutu + `CopyCommand` (zaten var), `--promo` üstünde |
| `src/components/front/RssBox.tsx` | "Tüm haberere abone ol" → `/feed.rss` + ingest sıklığı + `SavedFilters` bağlantısı |
| `src/components/ui/PressPlate.tsx` | deterministik halftone monogram klişesi (SVG, animasyonsuz) |
| `src/components/ui/PlateImage.tsx` | `next/image` için istemci sarmalayıcı: `onError` → `PressPlate`; HF alan adları için `unoptimized` |
| `src/components/ui/Rule.tsx` | `SectionRule` (3 px + etiket) ve `Hairline` |
| `src/lib/heat.ts` | okuma anında puan: `windowDownloads` + isteğe bağlı fark; belgelenmiş ve test edilmiş |

**Değişen**: `Header.tsx` (→ ince manşet evsahibi), `FeedView.tsx` (+`variant`), `FeedCard.tsx` (→ çizgili `ModelRow`, `.card`'ı bırakır, DESIGN-V2'nin tüm veri kurallarını korur), `PulseStrip.tsx` (→ `FrontStats` bandı + manşet bandı), `NewsCard.tsx` (→ `StoryRow`), `NewsList.tsx`, `TabBar.tsx` (`DeskNav`'dan sonra silinir), `globals.css` (tokenlar, çizgiler, klişe, yazdırma), `fonts.ts`, `layout.tsx` (varsayılan tema, konteyner genişliği, yapışkan manşet kalkar), `i18n/dictionaries/{en,tr}.json` (+~40 anahtar, eşlik zorunlu).
**Silinen**: akıştaki `.card` kullanımları, içeriğin arkasındaki hareketli `sweep`/`grid-bg`, birincil meta aracı olarak `Chip` (yalnızca kapı/lisans için kalır).

---

## 8. Aşamalar ve kabul kriterleri

### P0 — veri ve ölçüm altyapısı (görsel değişiklik yok, tek başına çıkar)

| İş | Neden | Kabul |
|---|---|---|
| **P0-1** `normalizeNews` zehirli metinleri (`/^\[object /i`) reddeder ve `store` artık `"[object Object]"` sunmaz; bunu hangi ingest yolunun yazdığı bulunur (`feeds.ts`/`hf.ts` bugünkü kod doğru görünüyor, yani metin anlık görüntüye **sabitlenmiş** — ve **birleştirme yalnızca eksik alanları doldurduğu için zehir kalıcıdır**) ve birleştirme zehirli değeri ezmek üzere düzeltilir | bugün 185 haberin 40'ı `[object Object]` basıyor | zehirli anlık görüntüyle birim testi; sonraki ingest'ten sonra sunucudaki anlık görüntüde `grep -c "object Object"` = `0`; imza satırı asla `[object Object]` basmaz |
| **P0-2** `src/lib/heat.ts` — belgelenmiş okuma-anı puanı; **ayrıca** gerçek fark ölçülebilsin diye ingest yeni kayıtlar için `downloadsAtFirstSeen` yazar | `trendingScore` 1 633/1 633 için null | puan sabit anlık görüntüde deterministiktir (test); arayüz `+Δ`'yı **yalnızca** banttaki öğelerin ≥ %60'ında `delta != null` ise basar, yoksa mutlak indirmeyi (D7) |
| **P0-3** `PressPlate` + `PlateImage` | modellerin %98,5'inde görsel yok | ilk 200 model satırının **%100'ünde** ve görselsiz 34 haberde klişe render eder; klişe çıktısı sabit slug için kararlıdır (test) |
| **P0-4** `scripts/check-overflow.ts` + `scripts/audit-ui.ts` rota listesine `/models` eklenir; `scripts/contrast.ts` (`.shots/contrast.mjs`'ten) + `scripts/type-census.ts` yazılır | v3'ün kendi tekrar çalıştırılabilir kanıtına ihtiyacı var | yeni rotalarda 0 taşma; kontrast betiği §4 tablosunu basar; tipografi sayımı §5 yüzdelerini basar |

### P1 — tokenlar ve tipografi

Kabul: §4 tablosu **canlı** sayfadan, iki temada da betikle üretilir; `/tr`'de `document.fonts.check("600 30px 'Playfair Display'")` true **ve** manşet adı ekran görüntüsünde Türkçe aksanlar doğru; tipografi sayımı 15–17 px bandında ≥ %55 ve sayfa başına tam olarak bir öğe ≥ 40 px; `npm test`, `lint`, `typecheck` yeşil; **`/models`'te henüz görsel değişiklik yok** (P1 önce `/m/[slug]`'da uygulanır, böylece tek başına incelenebilir).

### P2 — kabuk

Kabul: manşet + şerit + navigasyon 1440'ta ≤ **210 px**, 390'da ≤ **190 px** (bugünkü 65/57 px manşet + 60 px şerit + 148 px pulse kartı = ilk modelden önce 273 px); şerit yalnızca kaydırarak taşar (`scrollWidth > clientWidth` serbest, `documentElement.scrollWidth == clientWidth` zorunlu); navigasyon DESIGN-V2'nin 44 px hedeflerini ve `aria-current`'i korur; her rotada **tek `h1`** ve metni rotayı söyler; i18n eşliği korunur.

### P3 — ön sayfa

Kabul: 1440×900'de kahraman manşetinin üst kenarı **≤ 260 px** (yani manşet, şerit ve navigasyon varken giriş katlamanın üstünde); kahramanın **her zaman** klişesi ya da görseli var (ölçüm çıktısında `hasImage` doğrulanır); haber satırı imzayı yalnızca kullanılabilir 121 kurumdan basar; `EN ÇOK İNDİRİLEN` bandı log çubuklu ≥ 8 satır gösterir; **0 yer tutucu satır** (satır yalnızca var olan alanı basar); `/?window=30d` → 308 → `/models?window=30d`; hem EN hem TR ölçülür; LCP (kahraman manşeti, metin) 4× CPU / Slow-4G kısıtlamasında < 2,5 sn.

### P4 — diğer rotalar

Kabul: her rota aynı kabuğu (manşet/şerit/navigasyon) basar — hiçbir rota eski kart dilini korumaz; `/news` `kind`'a göre ≥ 3 masaya ayrılır (30 günlük pencerede); `/stats` grafikleri gerçek eksenlerle mürekkeple yeniden çizilir ve donut açıklaması kalır; `/m/[slug]` boş künye satırı basmaz; 70 rota×genişlik kombinasyonunda 0 taşma; 24×24 altı 0 hedef.

### P5 — cila

Kabul: `/` ve `/n/[id]` için `@media print` tek sayfalık okunabilir bir baskı üretir, navigasyon/şerit yok; `prefers-reduced-motion` şerit kaymasını ve kalan belirişleri kapatır; `/` ve `/models`'in `print` + `light` + `dark` ekran görüntüleri `.shots/v3-*` altına işlenir; `docs/README.md` ve iki DESIGN dokümanı v3'e bağlanır.

---

## 9. Doğrulama planı

```bash
npm run dev
# veri + token + klişe
npx tsx scripts/fetch-snapshot.ts           # sunulan anlık görüntü: varsayım değil ölçüm
npx tsx scripts/contrast.ts                 # §4 tablosu, globals.css'ten okunur
npx tsx scripts/type-census.ts http://localhost:3000/tr 1440   # §5 eşikleri
npx tsx scripts/check-overflow.ts http://localhost:3000/tr/models 360
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 390
npx tsx scripts/screenshot.ts http://localhost:3000/tr .shots/v3-front-1440-light.png 1440 3200 light
npm test && npm run lint && npm run typecheck && npm run verify-ui
```

DESIGN-V2'den devralınan ve burada pazarlık konusu olmayan kurallar: **masaüstü metrikleriyle** ölç (`mobile:false`) ya da sayfa ölçeğini sabitle; ölçmeden önce sayfa işaretini doğrula (`next dev` çalışma ortasında yeniden derliyor); `getBoundingClientRect().right` ile kurulan suçlu listesine, öğeyi gizleyip `scrollWidth`'i yeniden ölçmeden inanma; ekran görüntülerini `--force-prefers-reduced-motion` ile al.

`.shots/` reponun parçası olmayan denetim betiklerini tutar (`measure.ts`, `taps.ts`, `probe*.ts`, `shot.ts`); planın eşiklerinin dayandığı her şey `scripts/` içindedir.

---

## 10. Riskler ve geri dönüş

| Risk | Önlem |
|---|---|
| "Radar cihazı" kimliği (siteyi *bu* proje gibi gösteren şey) siliniyor | manşet gravürü + kahraman köşe patlaması + `PressPlate` halftone'u olarak yaşamaya devam ediyor. Kayıp gibi okunursa yükseltilecek düğme klişelerdir. |
| Kâğıt varsayılanı, koyu paneli seven sahibini rahatsız eder | `layout.tsx` + önyükleme betiğinde tek satır (D2); iki rampa da AA ve ikisi de ölçülüyor |
| Model listesini "güzel" bir ön sayfaya kurban vermek | `/models` bugünkü sayfanın **birebir taşınmış** halidir, eski sorgu URL'leri 308'lenir ve ön sayfa hem şeritten hem navigasyondan oraya bağlantı verir |
| Yeni font maliyeti / Türkçe glif hatası | 1 yüz × 2 ağırlık, `latin-ext` açıkça yazılır, `display: swap`, `document.fonts.check` ve `/tr` ekran görüntüsüyle doğrulanır (P1) |
| Makale sayfası görselleri kahraman boyutunda kötü görünür (ölçüm: yoğun metin, 317 KB) | D6 işlemesi + `PressPlate` yedeği + `sizes`/`priority` yalnızca kahramanda |
| Halftone/`filter` efektleri mobilde kare düşürür | klişeler statik SVG (yerleşimde filtre yok, animasyon yok); halftone bir `<pattern>`, CSS filtresi değil — tek istisna kahraman görseli |
| SEO: model listesinin `/`'dan çıkması | `middleware.ts` içinde 308'ler, `sitemap.ts` yeniden üretilir, ön sayfa tarayıcıyı `/models`'e taşır |
| Veri hattına (P0-1, P0-2) kapsam kayması | iki P0 işi görsellerden bağımsızdır ve önce çıkar; görsel geri dönüş onları yolda bırakmaz |

Geri dönüş: v3 tokenlara + üç kabuk bileşenine + iki rota dosyasına dokunuyor. `Header.tsx`, `TabBar.tsx` ve `FeedView.tsx`, P3 kabulü geçene kadar **ağaçta tutulur**; geri alma tek commit olur, yeniden yazım değil.

---

## 11. Açık sorular

**Sahibi 2026-10-18'de yanıtladı:** (1) rota taşıma onaylandı — yapıldı, 308'ler yerinde; (2) varsayılan tema kâğıt, gece baskısı ikinci rampa; (3) başlık yüzü Playfair Display; (4) kelime markası harf aralıklı serif büyük harfle `OpenWeight Radar` kalıyor.

Hâlâ açık:

1. ~~**D3 — rota taşıma onaylanıyor mu?**~~ `/` serbest gazete düzeni olur, model listesi `/models`'e taşınır (eski sorgu URL'leri 308). *Alternatif (daha düşük risk): `/` liste olarak kalır, üstüne yalnızca manşet + şerit + kahraman eklenir.*
2. **D2 — varsayılan kâğıt olmalı mı?** (varsayılan = kâğıt, koyu = "Gece Baskısı")
3. **D4 — hangi başlık yüzü?** `Playfair Display` (klasik gazete, önerilen) ya da `Fraunces` (daha dalgalı, 1970'ler).
4. **Kelime markası**: `OpenWeight Radar` harf aralıklı serif büyük harfle mi kalsın, yoksa manşet boyutunda kısa bir amblem mi (örn. `RADAR`)?
5. **P0-2 — ingest'e `downloadsAtFirstSeen` ekleniyor mu?** Böylece şerit gerçek `+Δ` basar ve bir toplam sayıya "trending" demekten kurtuluruz.
6. **Tek seferde ne kadar?** P0–P3 (veri + kabuk + ön sayfa) en küçük dürüst adımdır; P4 (beş rota daha) farkı kabaca ikiye katlar. Öneri: P0–P3'ü çıkar, gerçek anlık görüntüde bak, sonra P4'e karar ver.
