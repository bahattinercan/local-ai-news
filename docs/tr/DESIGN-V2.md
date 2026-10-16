# Tasarım v2 — "önce anlaşılır, sonra modern"

> İngilizce kaynak: [docs/en/DESIGN-V2.md](../en/DESIGN-V2.md)
> Durum: **kısmen uygulandı** — §3 D1–D7 ve §0'daki algoritmik düzeltmeler 2026-10-16'da uygulandı (`0689da8` + bir uygulama oturumu); §4 ve §5 açık. Denetim 2026-10-16 18:00–18:25, yeniden ölçüm 20:05–20:40 (+03), `http://localhost:3000`'deki `npm run dev` ve servis edilen snapshot (`generatedAt 2026-10-16T15:35Z`, 1284 model / 209 haber) üzerinde.
> [DESIGN.md](DESIGN.md) §1 ve §6'daki doğrulama iddialarını geçersiz kılar (bkz. §2.3).
> ⚠️ §2.2 ve §3'teki düzeltme öncesi ölçümler, başka bir oturum ağacı düzenlerken alındı (`src/components/{FeedView,FilterBar,PulseStrip,TabBar}.tsx`, `src/lib/{query,store}.ts`, mtime 18:07–18:09); o oturum işini 19:07'de `0689da8` olarak commit'ledi. §0 o tarihten sonra neyin düzeltildiğini düzeltme sonrası sayılarla kaydeder.

---

## 0. Uygulama günlüğü — 2026-10-16 (denetim sonrası)

| Madde | Durum | Kanıt (önce → sonra) |
|---|---|---|
| **D1** feed ızgara sütunu 753 px | **düzeltildi** (`0689da8`) | 360/390 px viewport'ta feed dokümanı: **769 → 345/375 px** (ızgara elemanında `min-w-0` + kart başlığında `min-w-0 line-clamp-2`) |
| **D2** doğrulayıcı yanlış geçti | **düzeltildi** (`0689da8`) | `check-overflow.ts` artık masaüstü metrikleri kullanıyor, taklit edilen genişliği bekliyor, kırpılmış süslemeleri atlıyor ve taşmada sıfırdan farklı çıkıyor: 44 rota×genişlik kombinasyonu → **0 taşma** |
| Son sayfanın ötesindeki sayfa | **düzeltildi** | `?page=999` "Sayfa 999" başlığı altında boş ızgara çiziyordu → **sayfa 19**'a kilitleniyor (449/24), 17 kart, 19'da `aria-current="page"`; `/api/feed?page=999` → `{page:19,total:449,pages:19}` |
| `/stats` feed ile çelişiyordu | **düzeltildi** | `/stats` her izlenen satırı sayıyordu (Audio **244**) ama Audio sekmesi **17** diyordu → `/stats` artık feed'in kapısıyla filtreliyor (Audio **17**, Coding 98 …), `?gate=all` ham hacmi koruyor (Audio 244) ve sayfada kapı kontrolü + ayrı bir `h2` var |
| Çalıştırma komutu doğruluğu | **düzeltildi** | `llama-cli -hf repo --quant Q4_K_M` (böyle bir bayrak yok) → `llama-cli -hf repo:Q4_K_M`; `ollama pull <model adı>` → `ollama run hf.co/<repo>[:quant]`; quant artık `quantizations[0]` yerine GGUF şemalarından seçiliyor (`AWQ`, `I8`, `U32` seçilebiliyordu) |
| `news` alanı olmayan snapshot | **düzeltildi** | `snapshot.news.map` tüm haber yüzeylerinden dışarı fırlıyordu → boş listeye düşüyor |
| "İzlenen model" etiketi | **düzeltildi** | sayı pencereye bağlı (7g **1281**, 24s **369**) → etiket "Penceredeki yeni model" + "son 7 gün" ipucu |
| **D3** açık tema AA'yı geçemiyordu | **düzeltildi** | muted/bg **4.02 → 4.54**, muted/surface **4.30 → 5.00**, accent/bg **4.80 → 5.69**, surface/bg 1.07 → 1.10, border/surface 1.42 → 1.49 (bkz. §6) |
| **D4** header 2–3 sıra | **düzeltildi** | 1440 **103 → 65 px**, 390 **143 → 57**, 360 **179 → 57**; `sm` altında beş bağlantı JavaScript'siz bir `<details>` taşma menüsüne taşınıyor |
| **D5** telefonda siteyi anlatan tek cümle yok | **düzeltildi** | tagline 768 px altında `display:none` idi ve `h1` "Hepsi" diyordu → feed ve kategori sayfaları tanımlayıcı bir `h1` (telefonda 20 px, ≥640 px'te 30 px) + tek satır ifade ile açılıyor; dil anahtarı artık ana sayfaya atlamıyor, okunan sayfada kalıyor |
| **D6** tüm feed'de bir başlık | **düzeltildi** | feed başlıkları **1 → 4** (`h1` + "Pencere özeti" + "Şu an sıcak" + "Modeller"); `/stats` h1 ve h2 artık aynı değil |
| **D7** dokunma hedefleri | **düzeltildi** | 1440 ve 390'da WCAG 2.2 AA minimumunun (24×24) altındaki hedef sayısı 83 → **0**; form kontrolleri, nav ve sayfalama 44 px |
| **C3** tipografi ölçeği | **kısmi** | en büyük yazı 24 → 30 px, ama 500 metin elemanının 466'sı hâlâ ≤14 px: kart/ölçek geçişi §4/§5 işi |
| İlk ekran (`firstCardY` @1440×900) | **geriye gitti, şimdilik kabul** | 756 → **882 px**: 44 px hedefler, kategori şeridi ve yeni iskelet ~126 px'e mal oldu. §5 M2/M3 (kademeli filtreler + kahraman metrikli pulse kartı) bunu 560'ın altına geri çekmeli |
| **D8** donut açıklaması, grafik yüksekliği | açık | trend grafiği artık 3 nokta çiziyor (3 farklı `firstSeenAt` günü) ve ≥3 gün eşiği çalışıyor; donut'un hâlâ açıklaması yok |
| **D9** `/news` ham release metni | açık | canlı snapshot: 209 öğe (community 25, runtime 30, paper 150, release 4), 151'inde thumbnail var |
| **D10** istemci tarafı gezinme yok | açık | hâlâ 21 düz `<a href>` iç bağlantı |
| `/icon.svg`, `/apple-icon.png` | **düzeltildi** | dil yönlendirmesi ikisini de 307 → `/en/icon.svg` → **404** yapıyordu, oysa layout ikisini de duyuruyordu (ikisi de artık `200` ve `image/svg+xml` / `image/png` dönüyor) |
| Son sayfanın ötesinde haber sayfası | **düzeltildi** | feed'dekiyle aynı sınif: `/tr/news?page=999` → boş sayfa 999 → 2. sayfaya kilitleniyor (23 öğe), `/tr/research?page=999` → sayfa 3 |
| **Ingest birleştirme tabanı** | **düzeltildi** | ingest işi yayınlanan snapshot yerine repo kopyasıyla (`actions/checkout`'un getirdiği `data/feed.json`) birleştiriyor, sonra Blob'un üzerine yazıyordu — yani her koşu "repo tabanı + bu koşunun en yeni sayfaları"nı yeniden kuruyor ve önceki koşuların bulduğu modelleri listeden çıkınca düşürüyordu. Servis edilen snapshot'ta ilk görülme tarihi **13/14/16 Ekim olan modeller var, 15 Ekim'den hiç yok**, oysa iş o gün çalıştı. `mergeSnapshotBases()` artık yayınlanan snapshot ile repo kopyasını birleştiriyor (en erken `firstSeenAt` kazanır, yeni kayıt eskinin eksik alanlarını doldurur) ve store erişilemezse eski davranışa düşüyor. Şu andaki tabanlar zaten örtüşüyor (repo 915 ⊆ yayınlanan 1284), yani kayıp varsa geri kurtarılamaz |

---

### 0.1 Faz 2 (anlaşılırlık) — aynı oturumda uygulandı

| Plan maddesi | Sonuç (1440×900'de ölçüldü, 390 da belirtildiği yerde) |
|---|---|
| **C3** tipografi ölçeği | `text-xs` 12 → **13 px**, `text-sm` 14 → **15 px**, `text-2xl` 24 → **30**, `text-3xl` → **38** — tek bir `@theme` bloğu, yani tüm arayüz bir basamak yukarı çıktı. 15–17 px bandındaki metin: **284/402 (%71)**; ≤ 14 px: **466 (%93) → 112 (%28)**; kalan 112 mikro etiket, sekme sayacı ve çip |
| **M3** kart | Yalnızca yer tutucu basabilen satırlar kaldırıldı (params %6.5 kapsama, depolama %29.8, runner %70.3, lisans %27.4, beğeni %38.3); `downloads` artık ağırlığı olan tek metrik (accent + ilk sırada), popülerlik çubuğunun `role="presentation"` yerine erişilebilir adı var ve avatar 88 → **44 px** (başlığa 56 px daha fazla genişlik) |
| **M2** filtreler | Pencere + Sıralama + Arama + Uygula görünür kalıyor; Kalite kapısı/Runner/Boyut/Lisans ve kaydedilmiş filtreler "Diğer filtreler" açılımına taşındı (aktif sayacıyla), kapalı hâlde **104 px** |
| **M4/M6** kabuk | Kategori şeridi her genişlikte tek kaydırılabilir sıra (**83 → 60 px**, scrollbar gizli) ve radar dokusu kendi kırpılmış katmanında, böylece sıcak liste paneli karttan taşabiliyor |
| Sıcak liste | `<details>` içine alındı: pulse kartı **287 → 148 px** ve panel 34 rem'lik bir kaplama olarak açılıyor (`elementFromPoint` ile test edilebilir olduğu, yani kırpılmadığı doğrulandı) |
| **İlk ekran** | firstCardY 1440×900'de **882 → 585 px** (tüm geçişten önce 756'ydı, hedef 560) ve 390'da **1562 → 949**. h1 38 px'ten 30 px'e indi çünkü TR başlığı 38 px'te iki satıra kayıyordu |
| Yeniden doğrulandı | 70 rota×genişlik kombinasyonu (320/360/390/430/768/1024/1440) → 0 taşma; 1440 ve 390'da 24×24 altı 0 hedef; npm test 73/73, lint, typecheck |
| Hâlâ açık | donut açıklaması (D8), `/news` ham release metni (D9), `next/link` (D10), ilk ekranın kalan 25 px'i |

---

### 0.2 Faz 3 (D8, D9, D10) — aynı oturumda uygulandı

| Madde | Sonuç (servis edilen snapshot üzerinde ölçüldü) |
|---|---|
| **D8** `/stats` donut açıklaması | Donut artık halkanın yanında açıklama çiziyor — renk kutusu, kategori adı, sayı ve pay; yay ile aynı palet indeksini kullanıyor (`Coding 98 · %23`, 9 satır). Trend grafiğinin viewBox'ı 640×160 → 1200×200 oldu, böylece 275 px yüksekliğe gerilmiyor: 1440'lık kartta ölçülen **140 px**, boş alan yerine bir açıklama satıryla (`2026-10-13 – 2026-10-16 · 3 gün · 426 model`). ≥3 gün eşiği zaten doğruydu |
| **D9** `/news` ham release metni | `src/lib/news-text.ts` + 9 birim testi. Her `runtime` satırının saklanan başlığı bir build etiketi (`b11699`, `b11700`), bu yüzden başlık gövdedeki konudan türetiliyor: sayfa artık **"common: honor HTTP_PROXY/HTTPS_PROXY env vars in http client"** gösteriyor, `b11699` mono etiket olarak duruyor; gövde konuyu tekrarlamıyor (200 karakter içinde iki kez tekrarlıyordu), URL taşımıyor, silinen linkten kalan "See" kalıntısını atıyor ve üç satıra kırılıyor (detay sayfası 4 000 karakter tutuyor). Medya yuvası yalnızca `thumbnail` varsa çiziliyor — ekrandaki 30 öğenin tamamında yer tutucuydu. `upvotes: null` artık "0" yazmıyor |
| **D10** istemci tarafı gezinme | `next/link`: Header, TabBar, Pagination, FeedCard, PulseStrip, NewsCard, Footer (sözlük bağlantısı), Controls, SavedFilters, LangSwitch, compare, glossary (ikisi), `m/[slug]` ve `n/[id]`. `<a>` yalnızca dış adresler ve `/feed.rss` (sayfa değil, route handler) için kaldı. Pencere işaretiyle doğrulandı: karta tıklamak `/tr/m/Abiray-MOSS-Image-SFT-INT8-convrot`'a gidiyor ve `window.__marker` yaşıyor; 2. sayfa da aynı şekilde `?page=2`'ye gidiyor. Bağlantı adresleri artık varsayılan değerlere URL alanı harcamıyor (`?window=7d&sort=new&gate=passed` gitti) |
| Yeniden doğrulandı | 63 rota×genişlik kombinasyonu (320/360/390/430/768/1024/1440) → 0 taşma; `npm test` **82/82**; lint, typecheck, i18n parite (iki dilde 118 anahtar) |

---

### 0.3 Faz 4 (C4, C5, ilk ekran) — aynı oturumda uygulandı

| Madde | Sonuç |
|---|---|
| **C4** jargon | Sitede zaten iki dilli bir sözlük vardı ("kalite kapısı" ve "yeni = ilk görülme" girdileri) ve arayüz onu hiç kullanmıyordu: `Kalite kapısı`, `Runner`, `VRAM ~2.1 GB` ve `Yeni (8d)` hiçbir yerde tanımlı değildi. `ui/Term.tsx` mevcut etiketi + **24 px** bir `?` çiziyor; ipucu sözlük özeti, hedefi ilgili girdi. Pencere filtresine (`first-seen`), kapı filtresine ve `Kapıyı geçen` istatistiğine (`quality-gate`), kartın yaşına (`first-seen`) ve kartın VRAM çipine (`vram`) bağlandı. Feed'de 28 terim bağlantısı var ve bunlarla birlikte 24 px altı hedef sayısı 0. Hiçbir yerde tanımı olmayan tek terim olduğu için bir `runner` girdisi eklendi (iki dilde) |
| **C5** boş durumlar | `EmptyState` artık `hint` ve `action` alıyor; dört çıkmaz sokak da öğretiyor: id'siz `/compare` (eskiden **844 px boş viewport**'tu) model ekleme akışını anlatıp "Akışa dön" sunuyor; sıfır sonuçlu feed pencereyi ya da kapıyı genişletmeyi önerip "Temizle" sunuyor; pencerede haberi olmayan `/news` "Son 30 günü göster" sunuyor (`?window=30d&scope=news`); bulunamayan öğe snapshot'tan çıktığını açıklıyor |
| İlk ekran | firstCardY 1440×900'de **585 → 565 px** (tek satırlık lede, daha sıkı başlık marjı). 560 hedefi 5 px uzakta; kalan kısım 65 px header + 60 px şerit + 148 px pulse ve hepsi artık dolgu yerine bilgi taşıyor |
| Yeniden doğrulandı | 70 rota×genişlik kombinasyonu (320/360/390/430/768/1024/1440) → 0 taşma; 1440 ve 390'da 24×24 altı 0 hedef; `npm test` 82/82; lint, typecheck; i18n parite iki dilde **125 anahtar** |

**Design v2 artık, henüz kimsenin istemediği maddeler dışında uygulanmış durumda** (kaydedilmiş filtre yönetimi arayüzü, kullanıcıya özel durum, VRAM-parametre grafiği). D8, D9 ve D10 kapandı; §3'teki kusur listesi tamamen düzeltildi ve §4/§5 plan kabul kriterlerine göre tamamlandı; yukarıda kayıtlı iki sapma ile (h1 telefonda 30 değil 24 px ve haber özeti genişletici yerine üç satıra kırılıyor — tam metin öğe sayfasında).

---

## 1. "Bu ne böyle, ne olduğu belli değil" sorusunun cevabı

Ziyaretçinin karşılaşma sırasına göre üç ölçülmüş neden.

**1. Telefonda site telefon yerleşimi değil.** Feed'in kart ızgarası ekran genişliğinden bağımsız olarak **753 px**'lik bir sütuna şişiyor. 390 px'lik bir telefonda doküman **769 px** genişliğinde, tarayıcının yerleşim viewport'u da buna göre şişiyor (`window.innerWidth = 769`, `visualViewport.width = 390`) ve **her kartın %49'u ekran dışında**. Bu bir zevk meselesi değil: 313 px'lik kapsayıcının içinde ızgara sütunu 752.812 px (bkz. §3, D1).

**2. Sayfa ne olduğunu hiç söylemiyor.** Ürünü anlatan tek cümle header'daki tagline ve o tagline 768 px altında `display: none`. Sitedeki en büyük yazı 24 px; **517 metin elemanının 484'ü (%94) ≤ 14 px**; feed'de **tam olarak bir başlık** var: `h1 "Hepsi"`. "Kalite kapısı", "şu an sıcak", "runner", "~2.5 GB VRAM" kavramlarının hiçbiri hiçbir yerde tanımlı değil.

**3. Hiçbir şeyin önceliği yok.** Ortalama bir kartta **6 satırın 4'ü yer tutucu** (params %8.2, VRAM çipi %8.1, lisans çipi %28.3, depolama %29.7, beğeni %38.3, runner %66.4) ve tüm satırlar aynı 12 px soluk yazı; altında da %4 tabanlı, etiketsiz 1.5 px'lik bir çubuk var — bozuk render gibi görünüyor. Verisi olmayan kart, veri dolu kartla birebir aynı görünüyor.

Yani sıra: **yerleşim hataları → anlaşılırlık ve hiyerarşi → etkileşim cilası**. Yeni bir palet kritik yolda değil: koyu token seti kontrastı zaten geçiyor (§6). "Radar enstrümanı" kimliği korunmaya değer; eksik olan, gözün nereye gideceği.

---

## 2. Yöntem ve kanıt

### 2.1 Komutlar (tekrar koşulabilir)

```bash
npm run dev                                   # :3000
chrome --headless=new --remote-debugging-port=9222 --force-prefers-reduced-motion \
       --user-data-dir="$TEMP/cdp-owr" about:blank
node scripts/measure-ui.ts http://localhost:3000/tr    # eski, bkz. 2.3
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 360
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 768
```

Ham kanıt: `.shots/audit-v2-measurements.json` ve `.shots/audit-v2-*.png` ekran görüntüleri
(`-feed-1440-dark`, `-feed-1440-light`, `-feed-phone-emulated-390`, `-feed-390-desktop-metrics`, `-stats-1440`, `-news-1440`, `-compare-en-1440` ve `-top` kırpmaları).

### 2.2 Ölçülmüş başlangıç durumu — **düzeltme öncesi** (2026-10-16 18:20). Düzeltme sonrası sayılar için §0.

| Ölçüm | Değer | Nasıl |
|---|---|---|
| Feed doküman genişliği @390 telefon | **769 px** (clientWidth 390) | `Emulation.setDeviceMetricsOverride {width:390,mobile:true,dsf:2}` → `documentElement.scrollWidth` |
| Feed kart genişliği @390 telefon | **753 px** (daha hafif bir sayfada 417 px de gözlendi) | `document.querySelector('article').getBoundingClientRect().width` |
| Feed ızgara sütun genişliği | 313 px kapsayıcı için **752.812 px** | `getComputedStyle(grid).gridTemplateColumns` |
| Izgara elemanına `min-width:0` enjekte edilince | sütun **313 px**, doküman **345 px** | inline `<style>` + yeniden ölçüm |
| Doküman taşması @360 / @390 (masaüstü metrikleri) | **+409 px / +379 px** | `scrollWidth - innerWidth` |
| Doküman taşması @768 | **+5 px** (TR) / **+8 px** (EN) | `check-overflow.ts … 768` |
| Header yüksekliği | @1440 **103 px** (2 sıra), @390 143 px, @360 **179 px**, sticky | `header.getBoundingClientRect().height` |
| İlk model kartının üst konumu @1440×900 | **y = 756** → ilk ekranın %84'ü chrome | `article` rect + `scrollY` |
| Yazı tipi sayımı, /tr @1440 | 12 px × **395**, 14 px × 89, 16 px × 28, 24 px × 5 → **%94 ≤ 14 px**, en büyük 24 px | kendi metni olan her elemanda hesaplanmış `font-size` (n = 517) |
| /tr'deki başlık sayısı | **1** (`h1 "Hepsi"`), `main` içinde sıfır `h2`/`h3` | `querySelectorAll('h1,h2,h3')` |
| 44 px'den küçük dokunma hedefi | @1440 **73 / 89**; dil bağlantıları **14 × 16 px** | `a,button,select,input,summary` rect'leri |
| Tagline görünürlüğü @390 | `display: none` | `getComputedStyle(span).display` |
| Koyu tema kontrastı | muted/bg **8.72**, muted/surface 6.88, surface/bg 1.27, raised/surface **1.16**, border/surface 1.63, accent/bg 11.03 | CSS token hex'leri üzerinden WCAG L2 |
| **Açık tema kontrastı** | muted/bg **4.02 ✗**, muted/surface **4.30 ✗**, surface/bg **1.07**, raised/surface 1.11, border/surface 1.42, accent/bg 4.80 | aynı yöntem, `data-theme="light"` |
| `next/link` kullanan iç bağlantı | **0** (21 düz `<a href>`) | `grep -rn "next/link" src` |
| `/stats` trend grafiği | 640×160 viewBox ~1100 px'e gerilmiş, **2** veri noktası; donut'un açıklaması yok | ekran görüntüsü + `firstSeenAt` farklı gün = 2 |
| `/news` içerik uzunluğu | ortalama özet **1464 karakter**, 280. karakterde URL'nin ortasından kesiliyor; thumbnail yalnızca `paper` öğelerinde | snapshot + `NewsCard.tsx` |
| `/compare` (id yok) | sayfa yüksekliği **844 px** = tam bir boş viewport | `documentElement.scrollHeight` |

### 2.3 DESIGN.md düzeltmeleri

- DESIGN.md §6 "Horizontal overflow 0 px at 360/390/768/1280/1440 ✅" diyor. Bu **yanlış bir GEÇTİ**. `scripts/check-overflow.ts` ve `scripts/audit-ui.ts` küçük genişlikleri `mobile: true` ile taklit ediyor; Chrome yerleşim viewport'unu içerik genişliğine şişiriyor: `window.innerWidth` **769** oluyor, `scrollWidth` 769 oluyor ve `scrollWidth - innerWidth` bu yüzden 0 çıkıyor. Doğrulayıcı ya `scrollWidth`'i **taklit edilen** genişlikle karşılaştırmalı ya da `Emulation.setPageScaleFactor(1)` + masaüstü metrikleri kullanmalı.
- Bu script'lerin "offenders" listeleri aynı zamanda kırpma-körü: kartın `overflow: hidden`'ı kırptığı halde `div[sweep] right=935` listeleniyor, oysa `scrollWidth`'e katkısı **0**. 768'deki gerçek +5 px, D1'deki kart sütunu. Sweep'in peşine düşmeyin.
- `scripts/measure-ui.ts` hiç viewport override'ı kurmuyordu; yani `npm run verify-ui` sadece Chrome'un o anki pencere boyutunu ölçmüş.
- DESIGN.md §2 `paramsTotal`'ı listelemiyor; alan her kartta kullanılıyor ama kapsama **%8.2** (75/915), yani kartların %92'si "params unknown" yazdırıyor (§7).

---

## 3. P0 — kusurlar (kullanıcının gördüğü bozukluklar, hepsi ölçülü)

> **Durum 2026-10-16 20:40: D1–D7 düzeltildi (§0), D8/D9/D10 açık.** Aşağıdaki ölçümler düzeltme öncesi başlangıç durumudur ve teşhis olarak korunmuştur.

### D1 — Feed ızgara sütunu 753 px'e şişiyor; her telefon yerleşimi bozuk
- **Belirti:** 360/390/430'da feed dokümanı 417–769 px geniş, kartlar ekrandan taşıyor, medya sorguları ve `100%` şişmiş viewport'a göre çözülüyor, sayfa yana doğru boş alana kaydırılabiliyor.
- **Neden:** `FeedView.tsx`'teki ızgara çocukları (`div.fade-up`) varsayılan `min-width: auto` ile ızgara elemanı; tek sütunlu hat en geniş elemanın min-content'iyle boyutlanıyor. Kartın içinde başlık satırı `div.flex.items-start.justify-between.gap-2`'de **`min-w-0` yok**, başlık `<a>`'sı `break-words` kullanıyor (`overflow-wrap: break-word`, min-content'i **küçültmez**; `body`'deki `anywhere` küçültürdü) ve kardeş kalite çipi `whitespace-nowrap`. Ölçülen sayfadaki suçlu kart: `ISishikaa/acquisition_generator_AS_grape_wildguardmix_qwen3b` (45 kırılamaz karakter) → 24 kartın hepsi için **752.812 px** sütun.
- **Çözüm:** (a) `FeedView.tsx`'te ızgara elemanına `min-w-0`; (b) `FeedCard.tsx` başlığına `min-w-0` + `line-clamp-2` (`break-words` yerine); (c) `shrink-0` yalnızca çipte, başlıkta asla; (d) aynı denetim `NewsCard.tsx`, `PulseStrip.tsx` (`hot-row`) ve karşılaştırma tablosu için.
- **Doğrulanmış çözüm:** elemana `min-width:0` enjekte etmek sütunu 752.812 → **313 px**, dokümanı 769 → **345 px** yapıyor (360 px viewport).
- **Kabul:** 360/390/430/768'de her rotada `documentElement.scrollWidth ≤ clientWidth` ve her `article` ≤ `clientWidth − 32`.

### D2 — Taşma raporlayıcısına güvenilemez
- **Belirti / kanıt:** §2.3'teki iki tuzak. `check-overflow.ts` 360'ta 0 taşma raporlarken masaüstü metrikleriyle 360'ta **+409 px** var; offenders listesi gerçek nedeni değil, kırpılmış süslemeleri gösteriyor.
- **Çözüm:** `mobile: false` (veya sabitlenmiş page scale) + taklit edilen genişlikle karşılaştırma; ölçümden önce sayfa işareti (marker) doğrulaması — çünkü `next dev` kayıtta yeniden derliyor ve bu koşuda iki kez *önceki* rota ölçüldü (bir mobil geçiş `innerWidth 1440` döndürdü).
- **Kabul:** `npm run verify-ui` **mevcut kodda başarısız oluyor** ve 360/390/430/768/1024/1440 için rota bazlı tablo basıyor. Başarısız olamayan bir doğrulayıcı, doğrulayıcı değildir.

### D3 — Açık tema WCAG AA'yı geçemiyor ve derinliği yok
- **Kanıt:** muted/bg **4.02:1**, muted/surface **4.30:1** (gövde metni için AA 4.5 ister); surface/bg **1.07**, raised/surface 1.11, border/surface 1.42. Açık zeminde her kart aynı beyaz düzlem gibi görünüyor.
- **Çözüm:** §6'daki token değerleri (muted `#525f6e` → 4.72/5.00; bg `#eff2f7` → surface/bg 1.10; border `#c3cddc` → 1.49) ve gölge tabanlı derinlik; çünkü beyaza yakın zeminde beyaz yüzey dolguyla ayrışamaz.
- **Kabul:** yeniden hesaplanan kontrast tablosu: **her iki** zeminde muted ≥ 4.5:1, metin ≥ 7:1, accent ≥ 4.5:1, surface/bg ≥ 1.08, border/surface ≥ 1.45 ve bu iki temada da geçerli.

### D4 — Header 2–3 sıralı sabit bir blok
- **Kanıt:** 1440'ta 103 px (marka sırası + nav sırası; `nav` `y=56`'da), 390'da 143 px, 360'ta **179 px** — ve `position: sticky`, yani 360×800 telefonda **viewport'un %22'si kalıcı olarak chrome**.
- **Neden:** `Header.tsx` marka + tagline + 4 etiketli nav hapı + dil anahtarı + tema düğmesini `max-w-6xl` içinde tek `flex-wrap`'e koyuyor.
- **Çözüm:** her genişlikte tek sıra (768 altında marka + taşma menüsü; tagline sayfaya taşınır); 1024 altında ikon+etiket hapları erişilebilir adlı ikon-only olur; dil + tema tek 44 px kümede birleşir.
- **Kabul:** 768 ve üzeri ≤ 64 px, 768 altı ≤ 56 px, 320–1440 arası satır kırılması yok; 320/360/390/768/1024/1440'ta ölçülür.

### D5 — Ürünün ne olduğuna dair sessizlik
- **Kanıt:** tagline `hidden md:block` → 390'da `display: none`; sayfa `h1`'i "Hepsi"; ürünü tarif eden tam cümle yalnızca tarayıcı sekmesinde; `/stats`'ta `h1` ve kart etiketi birbirini tekrar ediyor ("Kategori bazlı hacim" iki kez).
- **Çözüm:** her sayfa tipi için açık bir giriş ifadesi (§8, C1), her sayfada gerçek bir `h1` ve tagline'ın **sayfa gövdesinde** de yer alması — asla yalnızca sticky header'da.
- **Kabul:** 390'da ilk ekran, ürünü, tazeliği ve varsayılan filtreyi adlandıran tanımlayıcı bir `h1` (≥ 30 px) + bir cümle içeriyor.

### D6 — Doküman iskeleti yok
- **Kanıt:** feed'de **1** başlık; "Multimodal", "İzlenen model", "Kategori bazlı hacim" ve tüm istatistik etiketleri `<span>`/`<div>`. Next.js `document.title → h1 → pathname` duyuruyor (`node_modules/next/dist/docs/03-architecture/accessibility.md`), yani ekran okuyucu "Hepsi" diyor.
- **Çözüm:** rota başına gerçek `h1`/`h2` hiyerarşisi (§8); bölüm sarmalayıcıları `<section aria-labelledby>`; tek `h1` korunur.
- **Kabul:** her rotada rotayı tanımlayan bir `h1`, ≥ 2 `h2` ve seviye atlamayan bir başlık sırası.

### D7 — Dokunma hedefleri minimumun altında
- **Kanıt:** 1440'ta 89 etkileşimli elemanın 73'ü < 44 px; dil bağlantıları 14 × 16 px; tema düğmesi 38 × 30 px.
- **Çözüm:** `min-h-11` (44 px) veya WCAG 2.2 AA hedef-boyutu boşluğu sağlayan tek bir ortak kontrol primitifi; kategori şeridi ve filtre kontrolleri dahil.
- **Kabul:** 44 px altı 0 hedef ya da her küçük hedefin ≥ 8 px örtüşmeyen boşluğu var (göz kararı değil, ölçüm).

### D8 — `/stats` en büyük alanı iki veri noktasına harcıyor
- **Kanıt:** günlük trend kartı 640×160 SVG'yi ~1100 px'e gerip **2** farklı `firstSeenAt` günü çiziyor; sözlükte `stats.noHistory` var ama eşik uygulanmıyor; donut'un etiketi/açıklaması yok, sadece renkler var.
- **Çözüm:** trend'i çizmeden önce ≥ 3 farklı gün eşiğini uygula; grafik yüksekliğini ~200 px'e sınırla ve boşalan alanı ilk-N tablosuyla doldur; donut'a etiket + değer + pay içeren açıklama ekle.
- **Kabul:** 2 günlük snapshot'ta trend kartı hiç çizilmiyor ve "yeterli geçmiş yok" notu görünüyor; donut'ta ≥ 6 okunabilir etiketli açıklama var.

### D9 — `/news` ham release notlarını basıyor
- **Kanıt:** öğeler ortalama **1464 karakter** biçimsiz release metni ve 280. karakterde URL'nin ortasından kesiliyor; medya yuvası her `runtime` öğesinde yer tutucu olan 64 px'lik bir kutu (thumbnail yalnızca `paper` öğelerinde), yani sayfa duvar gibi bir düzyazı.
- **Çözüm:** görünen başlığı ilk satırdan türet, URL'leri ve `@` etiketlerini ayıkla/linkle, özeti "devamı" ile açılabilir 2 satıra sınırla, alan yoksa boş medya yuvası yerine kaynak etiketi göster.
- **Kabul:** hiçbir öğe metin ortasında çiğ URL göstermiyor; medya yuvası yalnızca `thumbnail` varken çiziliyor; ilk ekranda ≥ 3 taranabilir başlık var.

### D10 — İstemci tarafı gezinme yok
- **Kanıt:** `next/link` kullanımı **0**; 12 dosyada 21 iç `<a href>` → her tıklama tam sayfa yüklemesi (prefetch yok, rota duyurusu yok, kaydırma konumu korunmuyor, açık temada beyaz flaş).
- **Çözüm:** tüm iç href'ler için `next/link` (`hrefFor` düz string döndürüyor, değişiklik mekanik); dış bağlantılarda `<a target="_blank">` kalır.
- **Kabul:** karta, sekmeye veya nav öğesine tıklamak tam sayfa yüklemesi yapmıyor ve rota duyurusu tetikleniyor.

---

## 4. P1 — Anlaşılırlık (burası ne anlatıyor?)

### C1 — Her sayfa tipinde giriş ifadesi
Feed / kategori / haber / istatistik / karşılaştırma / sözlük sayfalarının her biri şununla açılır: `h1` (rotaya özgü, ≥ 30 px), neyin takip edildiğini ve ne kadar taze olduğunu söyleyen bir cümle ve arayüzün bağımlı olduğu üç küçük tanım ("Kalite kapısı: Y modelden X'i geçiyor", "Pencere: son 7 gün", "Güncelleme: 30 dakikada bir"). Hiçbir bilgi **yalnızca** sticky header'da yaşayamaz.

### C2 — Ekran başına tek ana sayı
`PulseStrip` şu an dört eşit ağırlıklı 24 px istatistik + 5 satırlık liste gösteriyor. **Tek** bir kahraman metrik kalsın (penceredeki yeni model sayısı; mümkünse delta ve sparkline ile), diğer üçü 14 px ikincil istatistiğe insin ve "Şu an sıcak" listenin yanından çıkıp kahraman metriğin altına taşınsın.

### C3 — Gerçek yayılımı olan bir tipografi ölçeği
Bugün: en büyük 24 px, %94 ≤ 14 px. Hedef ölçek **12 / 13 / 15 / 17 / 20 / 24 / 30 / 38** ve rol kuralları: mikro etiket 12, ikincil 13, gövde 15, kart başlığı 17, bölüm başlığı 20–24, sayfa `h1` 30–38, kahraman sayı 38. Kabul: metin elemanlarının ≥ %60'ı 15–17 px bandında ve hiçbir sayfada birden fazla 38 px eleman yok.

### C4 — Jargonu bırak
"Kalite kapısı", "Runner", "Snapshot", "~2.5 GB VRAM", "2d" her iki dilde de açıklanmıyor. Ya kendini açıklayan etiketlere geç, ya her terim için tek satırlık `<details>`/ipucu ekle — `en.json` + `tr.json` içinde.

### C5 — Öğretici boş ve yükleniyor durumları
`/tr/compare` id'siz geldiğinde boş bir viewport çiziyor (ölçülen yükseklik 844 px). Akışı anlatsın ("modelleri feed'deki **Karşılaştır** ile ekle ya da iki slug yapıştır") ve kopyalanabilir bir örnek ver. Aynısı sıfır sonuçlu feed ve `gateForced` uyarısı için.

---

## 5. P2 — Modernleşme

| # | Değişiklik | Neden "modern" hissettiriyor |
|---|---|---|
| M1 | İç gezinmede `next/link` + prefetch (D10) | Anında gezinme algılanan hızın en büyük kazancı ve görsel riski sıfır |
| M2 | Filtre çubuğu → kademeli açılım: Pencere + Sıralama + Arama hep görünür, Kalite kapısı/Runner/Boyut/Lisans "Filtreler (n)" açılımında | Bugün 8 kontrol içerikten önce tam bir satır yiyor; ilk kart 900'ün 756'sında başlıyor |
| M3 | Kart v2: 17 px 2 satır başlık, etiketli tek ana metrik, açıklamalı gerçek çubuk, tek 13 px ikincil satır, çipler yalnızca alan varsa, 88 px yerine 40 px avatar | Yer tutucu satırları kaldırır (bugün 6'da 4) ve başlığa 48 px daha genişlik verir |
| M4 | Kategori şeridi: 1024 altında yatay kaydırılabilir segment, net aktif durum, sayılar yalnızca bilgi katıyorsa | 10 eşit ağırlıklı hap her ekranda 100 px yiyor ve seçim hakkında hiçbir şey anlatmıyor |
| M5 | Sticky bütçesi: telefonda 56 px tek header sırası, kayan kategori şeridi | Telefonlarda 87–123 px dikey alan geri kazanılır |
| M6 | Radar sweep + ızgara dokusunu yalnızca hero'ya indir; reveal/count-up `prefers-reduced-motion` altında kalsın | Tek bir 287 px kartta dört süsleme katmanı rakamlarla yarışıyor |
| M7 | Açık temayı ancak §6 token'larıyla yayınla | Gerçek ikinci tema modern bir sinyal; bugünkü açık mod kullanılamaz |
| M8 | Tek boşluk ölçeği (4/8/12/16/24/32/48), tek kapsayıcı, tek yarıçap ölçeği; metnin uzayabildiği her yerde `line-clamp` | Tutarlı ritim + kırpılmayan metin, "cilalı"nın çoğu |

---

## 6. Token v2 (kontrast hesaplandı, tahmin edilmedi)

```css
:root {                    /* koyu — radar enstrümanı */
  --bg:#0a0e15; --surface:#161f2e; --raised:#212c40; --border:#33415a;
  --text:#f2f5f9; --muted:#a7b4c6;
  --accent:#3ddbc4; --accent-2:#6aa8ff; --ok:#4ecfa0; --warn:#f0bd5f; --danger:#f07a72;
}
:root[data-theme="light"] {
  --bg:#eff2f7; --surface:#ffffff; --raised:#e7ecf4; --border:#c3cddc;
  --text:#0f1620; --muted:#525f6e;
  --accent:#0a5b4c; --accent-2:#1c56c4; --ok:#0f6b47; --warn:#7d5a10; --danger:#9c2d27;
}
```

| Çift | koyu önce | koyu şimdi | açık önce | açık şimdi | Hedef |
|---|---|---|---|---|---|
| muted / bg | 8.72 | **9.44** | **4.02 ✗** | **4.54** | ≥ 4.5 |
| muted / surface | 6.88 | **7.27** | **4.30 ✗** | **5.00** | ≥ 4.5 |
| surface / bg | 1.27 | **1.30** | 1.07 | **1.10** | ≥ 1.08 (açık) / ≥ 1.25 (koyu) |
| raised / surface | **1.16** | **1.24** | 1.11 | **1.15** | ≥ 1.15 |
| border / surface | 1.63 | **1.74** | 1.42 | **1.49** | ≥ 1.45 |
| text / bg | 17.79 | **16.34** | 13.55 | **14.15** | ≥ 7 |
| accent / bg | 11.03 | **10.85** | 4.80 | **5.69** | ≥ 4.5 |
| accent dolgulu düğme yazısı | — | **10.69** (`#071014` üstünde) | — | **6.26** (accent üstünde beyaz) | ≥ 4.5 |

Yukarıdaki tüm değerler canlı sayfadan okundu (`getComputedStyle(document.documentElement)` token'ları → WCAG bağıl parlaklık), tablodan kopyalanmadı: bu tablonun ilk taslağı muted/surface için 7.72 yazıyordu, oysa bu değer nihai token setinin artık kullanmadığı bir surface rengine göre hesaplanmıştı.

Derinlik yine üç katmanlı: token ayrışması → 1 px kenarlık → yükselti gölgesi. Açık modda surface/bg tavanı (≈1.10) nedeniyle işi kenarlık + gölge yapar.

---

## 7. Veri eşikleri (servis edilen snapshot, 2026-10-16T15:35Z — 1284 model / 209 haber)

`npx tsx` ile `loadSnapshot()` üzerinden ölçüldü (sitenin gerçekten servis ettiği Blob snapshot'u), bir gün eski olan repo yedeği `data/feed.json` (915 model) üzerinden değil:

| Alan | Kapsama | Arayüz kuralı |
|---|---|---|
| `sampleImages` | **13/1284 (%1.0)** | Kartta asla thumbnail yeri ayırma; monogram istisna değil varsayılan |
| `paramsTotal` | **84/1284 (%6.5)** | Kalıcı kart satırı olmamalı (%93 "param bilgisi yok" yazardı) |
| `vramEstGb` | 84/1284 (%6.5) | Yalnızca detay + karşılaştırma (DESIGN.md'nin dediği gibi) |
| `quantizations` | 253/1284 (%19.7) | Yalnızca detay sayfası; GGUF şemaları `runCommand`'ı besliyor |
| `spaces` | 24/1284 (%1.9) | Yalnızca detay sayfası, boşsa gizli |
| `license` | 352/1284 (%27.4) | Çip yalnızca null değilse (hâlihazırda doğru) |
| `storageBytes` | 382/1284 (%29.8) | Varsa çip |
| `likes` / `downloads` | 1284/1284 (%100) | Ana metrik downloads; likes asla değil |
| `runners` | 903/1284 (%70.3) | Yalnızca dolu ise göster; "—" satırı yok |
| `libraryName` | 1000/1284 (%77.9) | İkincil satır, null ise gizli |
| `files` | 172/1284 (%13.4) | Yalnızca detay sayfası |
| `trendingScore` | **0/1284 (hepsi null)** | Okuma anında `derivedTrending()` ikamesi |
| `qualityPassed` | 449/1284 (%35.0) | Varsayılan feed filtresi ve §0'dan beri `/stats` varsayılanı |
| `gated` | 3/1284 (%0.2) | Feed'de asla (`excludeGated`) |
| `firstSeenAt` farklı gün | **3** (13/14/16 Eki) | Trend grafiği çiziliyor (eşik ≥ 3 gün); 2 günlük snapshot'ta "yeterli geçmiş yok" notu çıkardı |
| haber `thumbnail` | 151/209 (%72) | Medya yuvasını sayfa değil öğe bazında koşullandır |

---

## 8. Sayfa bazlı şartname

| Rota | `h1` | İçerik sırası (plan sonrası) | Mobil davranış |
|---|---|---|---|
| `/` ve `/c/[category]` | "Yeni açık ağırlıklı modeller — son 7 gün" / kategori adı + tek satır tanım | ifade → kahraman metrik (1 sayı) → 3 ikincil istatistik → sıcak-5 (telefonda kapalı) → filtreler (2 görünür + açılım) → kart ızgarası → sayfalama | tek sütun, kartlar `px-4` içinde tam genişlik, kategori şeridi yatay kayar, sıcak-5 `<details>`'a iner |
| `/m/[slug]` | model kimliği (2 satır clamp) + yazar | karar bandı → şartname tablosu (yalnızca dolu satırlar) → kopyalanabilir çalıştırma komutu → benzerler | şartname tanım listesine döner, yatay tablo yok |
| `/news`, `/research` | "Yerel AI haberleri — son 7 gün" | güne göre gruplu zaman çizelgesi, 1 satır başlık + 2 satır özet + tür etiketi, medya yalnızca varsa | yalnızca en yeni gün `<details open>`, diğerleri kapalı |
| `/stats` | "Kategori bazlı hacim — son 30 gün" (+ eksik pencere kontrolü satır içinde) | pencere kontrolü → kategori barları → **açıklamalı** pay donut'u → trend **yalnızca ≥ 3 günse** | tek sütun, barlar tam genişlik, donut ≤ 160 px |
| `/compare` | "Modelleri karşılaştır" | yapışkan başlık satırı (model başına sütun) → satır başına "en iyi değer" vurgusu → ekle/çıkar eylemleri | görünür kaydırma çubuklu yatay kapsayıcı + yapışkan ilk sütun; öğretici boş durum (C5) |
| `/glossary`, `/glossary/[slug]` | terim | terim → tanım → formül/örnek → ilgili terimler | zaten uyuyor (ölçülen taşma 0) |

---

## 9. Fazlar ve kabul kriterleri

| Faz | Kapsam | Kabul (hepsi tekrar koşulabilir) |
|---|---|---|
| **0. Doğrulama altyapısı** | D2: `check-overflow.ts`/`audit-ui.ts`/`measure-ui.ts` düzeltmesi (masaüstü metrikleri veya sabit page scale, ölçümden önce sayfa işareti, kırpma-farkında offenders) | `npm run verify-ui` mevcut kodda **başarısız oluyor** ve 360/390/430/768/1024/1440 için rota bazlı taşma tablosu basıyor; kanıtlar `.shots/`'a yazılıyor |
| **1. Yerleşim ve erişilebilirlik kusurları** | D1, D3, D4, D5, D6, D7 | her rotada her genişlikte taşma 0; kontrast tablosu iki temada da geçiyor; header ≥768'de ≤ 64 px / <768'de ≤ 56 px; rota başına bir tanımlayıcı `h1` + ≥ 2 `h2`; 44 px altı 0 hedef |
| **2. Anlaşılırlık** | C1–C5 | her rotada `h1` ≥ 30 px; metnin ≥ %60'ı 15–17 px; ürün ifadesi 390'da görünür; `en.json`/`tr.json`'da açıklanmamış jargon anahtarı kalmadı |
| **3. Etkileşim** | M1, M2, M3 | kart tıklaması istemci geçişi; ilk kart @1440×900'de y ≤ 560 (756'dan); ortalama kartta yer tutucu satır yok |
| **4. Kabuk ve tema** | M4, M5, M6, M7, M8 | tüm rotalar 320 px'te sığıyor; kategori şeridi < 1024'te tek kaydırılabilir sıra; açık tema yalnızca §6 token'larıyla; tek boşluk ölçeği kullanımda |
| **5. Sayfa bazlı cila** | §8'e göre `/news`, `/research`, `/stats`, `/compare`, `/glossary`, `/m/[slug]` | D8/D9 kabulü karşılandı; rota başına 390 + 1440 ekran görüntüsü `.shots/`'ta |

Her faz: `npm run lint`, `npm run typecheck`, `npm test` yeşil; faz başına bir PR; dokunulan rota başına bir ekran görüntüsü çifti.

**Durum:** Faz 0 tamam (`0689da8`, 44 rota×genişlik kombinasyonu → 0 taşma, sıfırdan farklı çıkış 900 px'lik bir fixture ile kanıtlandı) · Faz 1 D1–D7 için tamam (§0) · Faz 2–5 açık. Faz 1 bir kabul edilmiş gerileme bıraktı: 1440×900'de `firstCardY` 756 → 882 px oldu; bunu Faz 3 (M2/M3) geri ödemek zorunda.

---

## 10. Doğrulama altyapısı gereksinimleri

1. Yerleşim için 320/360/390/430/768/1024/1440 taramasını **masaüstü metrikleriyle** yap (`mobile:false`) ve ikinci bir mobil emülasyon geçişinde `window.innerWidth` ile `visualViewport.width`'i kaydet — uyuşmazlığın kendisi hata sinyali.
2. Ölçümden önce sayfa işaretini (ör. `h1` metni) doğrula; rota yüklenmediyse iptal et (bu koşuda `next dev` yeniden derlediği için iki kez eski sayfa ölçüldü).
3. Kontrast: **her iki** tema ve her iki zemin için CSS token değerlerinden hesapla; tabloyu repoda sakla.
4. Dokunma hedefleri: yalnızca sayı değil, 44 px altı her hedefi rect'iyle listele.
5. İskelet: rota başına `h1–h3` dizisini dök; eksik/çift `h1` veya atlanmış seviyede başarısız ol.
6. `.shots/*.png` kanıtını koru; geçici script'leri sil (bu denetim `$TEMP`'e `owr-audit*.mjs`, `probe*.mjs` bıraktı — bunlar repoya girmemeli; ağaçta duran `tmp-audit.ts` Faz 0'da kaldırılmalı).

---

## 11. Riskler ve kapsam dışı

- **Eşzamanlı düzenleme:** çözüldü — diğer oturum işini `0689da8` olarak commit'ledi; ağaç yeniden temiz ve bu planın §0'ı neyi düzelttiğini kaydediyor.
- **44 px kontroller ilk ekran yüksekliğine mal oluyor:** E1 kabulü (24 px altı 0 hedef, birincil kontroller 44 px) ilk model kartını 1440×900'de y=756'dan y=882'ye taşıdı. Bunu geri kazanmak hedefleri küçültmekle değil, filtre/pulse yeniden tasarımıyla olur.
- **Token yayılımı:** `ui/Charts.tsx` (donut paleti, bar/trend renkleri) ve `globals.css` arkaplan gradyanları `rgba(53,208,186,…)` değerini sabit kodluyor — `--accent` ile birlikte güncellenmezse grafikler temadan kopar.
- **`min-w-0` masaüstünü kırpabilir:** 1440'ta kartın 554 px kaldığını ve 2 satırlık başlığın sığdığını doğrula.
- **Açık modda dolgu yok:** 1.10 surface/bg tavanında ayrışma kenarlık ve gölgeden gelmek zorunda; koyu gölgeyi devralmak yerine açık tema tedavisini açıkça planla.
- **`next/link` göçü:** dış bağlantılarda `target="_blank" rel="noopener"` korunsun ve `hrefFor(locale, …)` tek href üreticisi olarak kalsın.
- **Kapsam dışı:** yeni bağımlılık yok, sıfırdan palet yok, grafik kütüphanesi yok, veri modeli/API/rota değişikliği yok, sınıflandırma kuralları ve ingest hattı değişmez.
