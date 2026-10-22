# Sözlük v2 - plan (2026-10-20)

> İngilizce kaynak: [docs/en/GLOSSARY-PLAN.md](../en/GLOSSARY-PLAN.md)
> Durum: **uygulandı 2026-10-20** - ölçülen sonuçlar ve sapmalar §0'da. §1 ve §3'teki her sayı bu doküman yazılmadan önce ölçüldü.
> [DESIGN-V3.md](DESIGN-V3.md) §7.1'in zaten şart koştuğu şeyi tamamlıyor: `/glossary` *çizgili tablo / Almanak* olacak. [DESIGN-V2.md](DESIGN-V2.md) C4 ise tanımsız jargonu kusur sayar.

---

## 0. Uygulama günlüğü - 2026-10-20

Sahibin "başla" onayıyla **tek oturumda uygulandı**. Aşağıdaki her sayı değişiklikten sonra ölçüldü: `npm run verify-glossary` (CDP üzerinden headless Chrome), `npm run verify-nav`, `scripts/check-overflow.ts`, `npm test` (160 test), `npm run lint`, `npm run typecheck`.

| Plan maddesi | Sonuç (ölçüldü) |
|---|---|
| **G0** arama, sıralama, okuma | `src/lib/glossary.ts`'ye `fold`, `searchGlossary`, `glossarySorted`, `readingMinutes`, `bodySegments`, `refSlugs`, `glossaryNeighbours`, `glossaryCategoryCounts`; `store`'a `getGlossaryEvidence()`. 24 sözlük testi + yeni `tests/i18n.test.ts` (4) |
| **G1** dizin yeniden boyama | kart ızgarası → iki sütunlu tek çizgili liste: **0 `a.card`**, 15 satır, liste 1440'ta **731 px** (**satır başına 49 px**, kart satırı 132 px'ti), 390'da 1 679 px; sayfa **1 299 / 2 420 px** (11 girişte 1 591 / 2 409'du) |
| **G2** arama | `/glossary?q=` + `?cat=`; `q=baglam` (harfsiz) 3 terim döndürüyor, `q=kuantizasyon` önce Kuantizasyon'u açıyor (terim eşleşmesi gövde eşleşmesinin üstünde); sıfır sonuçta temizleme aksiyonlu `EmptyState`. Masa büyüteci artık `/glossary`'de kalıyor - `scripts/check-nav-current.ts` beklentileri yeni kurala göre güncellendi |
| **G3** giriş sayfası | gövde içi çapraz başvuru **0 → 2** (`quantization`), `gguf`'ta 1; "bu snapshot'ta" kanıt bloğu (çalışan snapshot'ta 1 544 model üzerinde en sık kuantizasyonlar 105 · 97 · 94 · 72 · 58 · 56, payda her zaman basılır); bayt/parametre tablosu `BYTES_PER_PARAM`'dan; VRAM örnekleri `estimateVramGb` ile (8,6 / 21,2 / 49,9 GB); 8B ön dolgulu `VramCalculator`; 6 girişe "model dizininde" bağlantıları (her biri satır döndürdüğü doğrulandı); sıralamaya göre önceki/sonraki; `← Sözlük` 82×19 → **44 px** |
| **G4** kapsam | 11 → **15 giriş** (`library`, `downloads`, `storage-size`, `gated`) ve `getGlossaryEvidence()` artık indirme / depolama / gated da sayıyor |
| **G5** koşum takımı | `scripts/measure-glossary.ts` + `npm run verify-glossary` → **9 ölçüm, 0 sorun** (taşma, kart, satır, gövde içi bağlantı, 24 px altı hedef, terim başına sayfa) |
| Taşma / nav / hedefler | iki sözlük rotasında 320 / 390 / 1 440'ta 0 yatay taşma; rota başına tam olarak bir nav öğesi işaretli; 24 px altı **0** bağımsız hedef (cümle içi satır içi bağlantılar muaftır, WCAG 2.5.8) |

### 0.1 Plandan sapmalar (ve sebepleri)

| Planlanan | Uygulanan | Sebep |
|---|---|---|
| dizin yüksekliği 1440'ta ≤ 900 px, 390'da ≤ 1 400 px | **1 299 px / 2 420 px** | Tavan 11 giriş için yazılmıştı ve her rotanın ödediği 330 px'lik kabuğu (masthead + şerit + nav + altbilgi) yok sayıyordu. Dürüst ölçü terim başına: 1440'ta **satır başına 49 px**, kart satırı 132 px'ti - yani giriş başına %63 daha az; 15 girişle sayfa, 11 girişlik eski sayfadan %18 kısa. 15 girişle 900'e inmek satır başına tek satır ve arama alanının kaldırılması demekti |
| `Term`, `FeedCard`'a bağlanacak (kütüphane, indirme, depolama) | **model sayfası** spec tablosuna bağlandı (depolama, popülerlik, runner, kütüphane); akış satırları değişmedi | Basıp bakıldı: satır başına üç ek `?` rozeti satırı beşe çıkardı ve satır taranamaz hâle geldi. Detay sayfası bu etiketleri bir kez basıyor; tanımın yeri orası |
| `term`'e göre sıralama | **baştaki noktalama atılmış katlanmış terim**e göre | Doğrulama sırasında bulundu: `"Yeni" = ilk görülme` dizinin başına, tırnak işaretinin altına düşüyordu. Test eklendi |
| kuantizasyon / runner / kütüphane / parametre / kapı kanıtı | + **indirme, depolama, gated** | G4'ün yeni girişleri kendi sayılarını gerektirdi |
| metin sayılarını korur | yeniden yazılmış bayt/parametre cümlesi ve "46 GGUF repo / %70" sayıları iki dilden de **çıkarıldı** | Tam olarak G-D7'nin reddettiği kayma: o sayıları artık tablo ve kanıt bloğu basıyor |

### 0.2 Uygulama sırasında bulundu, burada düzeltilmedi

- `data-theme` hidrasyon uyuşmazlığı (sunucu `dark`, kayıtlı tercih `light`) - önceden var ve site geneli: `/tr/news`'te de tekrarlıyor, yani bu işten kaynaklanmıyor.

## 1. Bugünkü durum - `/glossary` (ölçüldü)

Yöntem: `npx tsx .shots/glossary-audit.ts http://localhost:3000 1440,390` - çalışan dev sunucusuna karşı headless Chrome + CDP (`Emulation.setDeviceMetricsOverride`); ayrıca sahibin 1440'ta `/en/glossary` ekran görüntüsü.

| # | Ölçüm | 1440 | 390 |
|---|---|---|---|
| 1 | Giriş / kategori | **11 / 4** | aynı |
| 2 | Dizin sayfası yüksekliği | **1 591 px** | **2 409 px** (11 kısa giriş için ≈2,7 ekran) |
| 3 | `.card` ile kurulan satırlar | **11** (hepsi **132 px**, grid tarafından esnetilmiş) | 132–154 px, esnetilmiş |
| 4 | Sayfa içi arama alanı | **0** (tek input masa büyüteci; o da `/models`'e gönderiyor) | aynı |
| 5 | Sayfadaki anchor id | **1** (`desk-search` - navigasyonun kendi kontrolü). Kategori veya terim anchor'ı yok | aynı |
| 6 | Basılan `N §` rozetleri | **11** | 11 |
| 7 | `PageHeader` `aside` (sayılar) | **kullanılmıyor** | - |
| 8 | Giriş sayfası: kelime / paragraf / **gövde içi bağlantı** | 195 / 5 / **0** | - |
| 9 | 1440 / 390 yatay taşma | **0** | **0** |
| 10 | 24 px altı dokunma hedefi | **0** | 0 (giriş sayfasındaki tek istisna: `← Sözlük`, 82×19 px) |

## 2. Bu planın kapattığı yedi kusur

1. **`N §` 11 kez basılan, açıklanmamış jargon.** Değeri `body.length` (paragraf sayısı). DESIGN-V2 C4 tam olarak "UI tanımsız jargon basıyor" diye kapatılmıştı; bu, jargonun açıklanması gereken tek sayfada aynı kusur.
2. **Terimi bulmanın yolu yok.** 11 giriş, arama yok, anchor yok, dizin yok. `DeskNav`, sözlük için `search: false` sabitliyor (`src/components/shell/DeskNav.tsx`, `sections` dizisi); yani büyüteç `/models`'e kaçıyor.
3. **Dizin, v3'ün kendi kararına aykırı.** DESIGN-V3 §7.1: `/compare`, `/glossary` → *"çizgili tablo; Almanak"*. Sayfa hâlâ `.card`'ı 2 sütunlu gridde basıyor ve grid her satırı en uzun karta esnetiyor: 1440'ta **11 satırın hepsi 132 px**, yani kısa girişlerde yarım satıra varan ölü boşluk (sahibin ekran görüntüsünde görünüyor).
4. **Kategori gruplaması bu boyutta işe yaramıyor.** 4 kategori, her birinde 2–3 giriş: dört başlık, 11 heterojen kart. Tarama başlıkla yapılıyor, terimle değil; kelimeyi bilen okuyucu için dizin yok.
5. **Giriş sayfası çıkmaz sokak.** Gövdede ölçülen bağlantı sayısı **0**: `Q4_K_M`, `llama.cpp`, `safetensors`, "kalite kapısı" düz metin. İlgili terimler yalnızca sayfa sonunda ve hiçbir şey model dizinine bağlanmıyor ("35 GGUF repoyu göster").
6. **Gerçekler, sitenin sahip olduğu veriden kopyalanmış düzyazı olarak duruyor.** Kuantizasyon girişi bayt/parametre tablosunu metin olarak yeniden basıyor, VRAM girişi 8,6 / 21,2 / 49,9 GB sayılarını yeniden yazıyor; oysa `src/lib/runner/vram.ts` içinde `BYTES_PER_PARAM`, `KV_GB_PER_BILLION_AT_4096` ve `estimateVramGb` zaten var. İki kopya, biri belgelenmemiş kayma.
7. **UI'nin bastığı alanların tanımı yok.** `FeedCard` ve model sayfası `libraryName`, `downloads`, `likes`, `storageBytes` ve gated durumunu basıyor; sözlükte hiçbirinin girişi yok ve `ui/Term.tsx` yalnızca 4 dosyada bağlı.

## 3. Veri gerçekliği kontrolü (paketli snapshot, `generatedAt 2026-10-14T15:43Z`, 915 model)

Sayılar istek anında önbellekli snapshot'tan hesaplanır, sözlük dosyasına asla yapıştırılmaz. Hangi kanıt satırının dürüstçe gösterilebileceğini kapsam belirler.

| Sinyal | Kapsam | Öne çıkan değerler | Kullanım |
|---|---|---|---|
| `quantizations` | **198 / 915 (%21,6)** | BF16 65, Q4_K_M 56, Q6_K 45, Q8_0 45, F32 43, Q5_K_M 36, INT8 35, FP8 34 | kuantizasyon girişi: gerçek dağılım |
| `runners` | **608 / 915 (%66,4)** | transformers 374, ComfyUI 157, llama.cpp 111, ONNX 64, MLX 16, Core ML 15, vLLM 10 | runner girişi: gerçek dağılım |
| `libraryName` | **684 / 915 (%74,8)** | transformers 255, diffusers 122, peft 48, ultralytics 41, gguf 35 | library girişi (yeni), GGUF girişi (`gguf` 35 repo) |
| `paramsTotal` | **75 / 915 (%8,2)** | - | parametre girişi: *düşük kapsam girişin tezi*, `75 / 915` olarak basılır |
| `qualityPassed` | **347 / 915 (%37,9)** | gated 3 | kalite kapısı girişi |
| `downloads` > 0 | **712 / 915 (%77,8)** | - | downloads girişi (yeni) |
| `likes` > 0 | **350 / 915 (%38,3)** | - | downloads/likes girişi (yeni) |
| `storageBytes` | **272 / 915 (%29,7)** | - | depolama boyutu girişi (yeni) |
| snapshot yaşı | - | - | her kanıt satırı snapshot yaşını basar (`DataNotice`) |

## 4. Kararlar

| # | Karar | Reddedilen alternatif ve sebebi |
|---|---|---|
| **G-D1** | **Tek alfabetik çizgili liste**, dört kart bölümü değil. Kategori bir filtre olur (`?cat=formats`), mevcut nav tarzı büyük harf şeridi + sayılarla | Kategori bölümlerini korumak: 11 giriş 4 başlığı hak etmiyor ve kelimeyi bilen bulamıyor. Kartlar: ölçülen ölü boşluk (§2.3) |
| **G-D2** | **`Intl.Collator(locale)` ile sıralama** | `Array.prototype.sort()` varsayılanı UTF-16 kod birimi sırasıdır; Türkçede `İ`/`I`/`ı` ve `Ç/Ğ/Ö/Ş/Ü` yanlış yere düşer. Türk okurunun alfabesi ASCII değil |
| **G-D3** | **`N §` yerine okuma süresi** (200 kelime/dk'dan `~1 dk`) + kategori etiketi | Paragraf sayısı okur için hiçbir şey ifade etmiyor; çıplak kelime sayısı maliyet değil spec'tir |
| **G-D4** | **Arama hem sayfada hem masa büyütecinde** (`DeskNav` `search: true`, `/glossary?q=`), terim + özet + gövde + takma adlarda, Türkçe farkındalıklı katlama ile | İstemci tarafı JS arama: sayfa sunucu bileşeni ve sözlük JS'siz de çalışmalı; ayrıca navigasyonda tam bunun için bir `search` kancası var |
| **G-D5** | **Açık gövde içi referanslar** (gövde metinlerinde `{quantization}` token'ı, ilk geçişte bağlantıya çözülür) | Bilinen kelimeleri otomatik bağlamak: 11 giriş × 2 dil üzerinde regex "quality gate" içindeki "quality"yi bağlar, Türkçe çekimleri (`kuantizasyonun`) kaçırır; yanlış bağlantı bağlantısızlıktan kötüdür. Açık token test edilebilir |
| **G-D6** | **Kanıt düzyazıdan değil snapshot'tan gelir.** Giriş başına bildirimsel `stat` alanı (`"quantizations" \| "runners" \| "library" \| "params" \| "gate"`), tek store fonksiyonuna bağlanır | "46 GGUF repo" gibi sayıyı gömmek (bugünkü metindeki sayı 1 633 modellik snapshot'tan): her ingest sayfayı sessizce yanlışlar |
| **G-D7** | **Türetilmiş tablolar sabitlerden basılır** - kuantizasyon bayt tablosu `BYTES_PER_PARAM`'dan, VRAM örnekleri `estimateVramGb`'den | Yeniden yazılmış tabloyu korumak: tek sayı için iki doğruluk kaynağı; üstelik `lib/runner/vram.ts` testlerin zaten koruduğu kaynak |
| **G-D8** | **Dört yeni giriş** (library, downloads & likes, depolama boyutu, gated repo) ve `Term`'in UI'de bu etiketleri basan iki yere bağlanması | Basılan her alana tanım eklemek: satır zaten yoğun; dört giriş gerçekten belirsiz etiketleri kapatıyor |

## 5. Fazlar ve kabul kriterleri

### G0 - model + koruyucular (görsel değişiklik yok, tek başına çıkar)

| İş | Kabul |
|---|---|
| `GlossaryEntry`'ye opsiyonel `aliases: { en: string[]; tr: string[] }` ve `stat?: GlossaryStat`; gövde metinleri `{slug}` referansı taşıyabilir | typecheck temiz; mevcut 11 giriş değişmeden derlenir |
| `lib/glossary.ts`'ye `fold(text, locale)` (küçük harf + Türkçe `İ/ı/ç/ğ/ö/ş/ü` katlama), `searchGlossary(q, locale)` → `{ entry, in: "term" \| "summary" \| "body" \| "alias" }[]`, `glossarySorted(locale)` (collator), `readingMinutes(entry, locale)`, `refSlugs(entry)` | `tests/glossary.test.ts` genişler: `kuantizasyon` → quantization; `baglam` (harfsiz) → context-window; `gguf` → gguf; boş sorgu → hepsi; her `{ref}` bir girişe çözülür; Türkçe sıralamada `İ`/`I` doğru yerde; okuma süresi her girişte iki dilde ≥ 1 |
| `store`'a `getGlossaryEvidence()` - önbellekli snapshot üzerinde tek geçiş: `{ total, quantizations, runners, library, params, gate, gated, snapshotAt }` | sabit snapshot'ta deterministik (test); yeni fetch yok, yeni alan yok |

### G1 - dizin yeniden boyama (Almanak)

| İş | Kabul |
|---|---|
| 11 satırlık çizgili liste: terim display yüzünde, tek satır özet, meta satırı (`kategori · ~1 dk`); `.card` yok, `N §` yok | dizin yüksekliği 1440'ta **≤ 900 px** (1 591'den), 390'da **≤ 1 400 px** (2 409'dan); aynı script ile ölçülür |
| `PageHeader aside`: `11 terim · 4 kategori` | iki dilde basılır |
| Kategori şeridi (`Tümü 11 · Kavramlar 3 · Dosya formatları 3 · Donanım 3 · Mimari 2`) anchor olarak → `?cat=` | 1440 ve 390'da 24 px altı hedef **0** |
| 320/360/390/430/768/1024/1440'ta 0 yatay taşma | `scripts/check-overflow.ts` yeşil |
| `/glossary` üzerinde tam olarak bir nav öğesi işaretli | `npm run verify-nav` yeşil |

### G2 - arama

| İş | Kabul |
|---|---|
| `DeskNav` `sections` içinde sözlük `search: true` olur | `/glossary`'den yapılan arama `/glossary?q=`'ya gider, `/models`'e değil |
| `/glossary?q=` listeyi filtreler; sonuç satırı `"gguf" ile 11 terimin 3'ü` der; sıfır sonuçta ipucu + filtreyi temizle aksiyonu olan `EmptyState` | elle: `?q=gguf`, `?q=kuantizasyon`, `?q=baglam`, `?q=zzz`; iki dilde eşit |
| `q` kategori filtresiyle, kategori de `q` ile yaşar | `?q=&cat=` kombinasyonları test edilir |

### G3 - giriş sayfası spec sheet olur

| İş | Kabul |
|---|---|
| Gövde içi `{ref}` bağlantıları | bağlantı bildiren her girişte **gövde içi bağlantı > 0** (bugün hepsinde 0); basılan HTML'de ham `{...}` token'ı **0** (DOM kontrolü + birim testi) |
| Kuantizasyon girişinde `BYTES_PER_PARAM`'dan basılan tablo | tablo satırları sabitin anahtar/değerleriyle birebir (test); metinde literal bayt tablosu kalmaz |
| VRAM örnekleri `estimateVramGb` ile hesaplanır, elle yazılmaz | metindeki üç örnek sayı üretilir; `KV_GB_PER_BILLION_AT_4096` değişince sayfa değişir (test) |
| VRAM girişine `VramCalculator` gömülür | hesaplayıcı basılır ve tahmin üretir; yeni kod yok, bileşen yeniden kullanılır |
| Giriş başına "Bu snapshot'ta" kanıt bloğu: pay/payda + snapshot yaşı | kuantizasyon → `198 / 915`, runner → `608 / 915`, parametre → `75 / 915`, kalite kapısı → `347 / 915`, library → `684 / 915`; sayılar `getGlossaryEvidence()` ile eşleşir (test) |
| İleri gezinme: "Dizinde gör" (`/models?runner=llama.cpp` vb.), sıralamaya göre önceki/sonraki terim, JSON-LD'de breadcrumb | her girişin `/models`'e ≥ 1 bağlantısı; JSON-LD'de breadcrumb; `inLanguage` |
| `← Sözlük` geri bağlantısı 44 px hedefe dönüşür | giriş sayfasında 1440 ve 390'da 24 px altı hedef **0** (bugün 82×19 px) |

### G4 - kapsam

| İş | Kabul |
|---|---|
| Yeni girişler: `library`, `downloads`, `storage-size`, `gated` - iki dilde, ≥ 2 paragraf, ≥ 1 ilgili slug, gereken yerde `stat` | `tests/glossary.test.ts` bütünlük paketi yeşil; 15 giriş, 4 kategori |
| `Term`, `FeedCard`'ın library etiketine, indirme ve depolama rakamına bağlanır (24 px hedef, C4 kuralı) | akış satırı başına terim bağlantısı ≥ 3; 24 px altı yeni hedef yok |
| i18n anahtarları: arama ipucu, sonuç satırı, boş durum, okuma süresi, kategori filtresi, kanıt başlığı, önceki/sonraki | eşitlik testi yeşil (bugün iki sözlükte 156 anahtar) |

### G5 - doğrulama

| İş | Kabul |
|---|---|
| `.shots/glossary-audit.ts` → `scripts/measure-glossary.ts`, `package.json`'a eklenir | §1 tablosunu basar; regresyonda düşer (yükseklik, gövde içi bağlantı, 24 px altı hedef) |
| 390 ve 1440, iki tema, dizin + `quantization` + `vram` ekran görüntüleri | `.shots/` altında saklanır |
| `npm test`, `npm run lint`, `npm run typecheck`, `npm run verify-nav`, `npm run verify-ui` | hepsi yeşil |

## 6. Dosya haritası

**Değişen:** `src/lib/glossary.ts` (tipler, fold/arama/sıralama/okuma/ref), `src/lib/store.ts` (`getGlossaryEvidence`), `src/app/[locale]/glossary/page.tsx` (çizgili liste, filtre, arama, sayılar), `src/app/[locale]/glossary/[slug]/page.tsx` (ref, kanıt, tablolar, hesaplayıcı, önceki/sonraki), `src/components/shell/DeskNav.tsx` (`search: true`), `src/components/FeedCard.tsx` (+`Term`), `src/i18n/dictionaries/{en,tr}.json`, `tests/glossary.test.ts`, `package.json`.
**Yeni:** `src/components/glossary/GlossaryRow.tsx`, `src/components/glossary/Evidence.tsx`, `scripts/measure-glossary.ts`.
**Dokunulmayan:** ingest, snapshot şeması, API route'ları, `middleware.ts`, diğer rotaların layout'ları.

## 7. Riskler

1. **Gurur okşayan kanıt.** `paramsTotal` snapshot'ın %8,2'si; `75 / 915` yazmak dürüst biçim ve aynı zamanda girişin tezi. Paydayı asla gizleme.
2. **Arama beklentisi.** 15 girişlik sözlük bulanık eşleşme istemiyor; önek/alt-dizgi katlaması yeterli ve test edilebilir. İstemci tarafı arama indeksi eklemeyin.
3. **Türkçe katlama** ilk kırılacak yer (`İ`/`I`, `ı`, `ğ`): G0'daki test listesi tam bu yüzden var ve `toLocaleLowerCase("tr")` ile `toLowerCase()` aynı şey değil.
4. **Ters yönde yükseklik regresyonu.** Çizgili liste 320 px'te okunur kalmalı; G1'deki yükseklik tavan, içerik silerek altına inilecek bir hedef değil.
5. **Ref sözdizimi sızması.** Gövde metnindeki tek bir kaçak `{` literal basılır; G3 iki dilde ham token olmadığını doğrular.

## 8. Kapsam dışı

- CMS yok, markdown renderer yok, giriş yazma arayüzü yok.
- Yeni snapshot alanı ve ingest değişikliği yok; bütün kanıt okuma anında türetilir.
- Terim başına illüstrasyon/plate yok (tasarımın süs bütçesi masthead'de).
- "İlgili terim" grafiği görselleştirmesi yok; 15 girişte önceki/sonraki + `related` bağlantıları yeterli.
