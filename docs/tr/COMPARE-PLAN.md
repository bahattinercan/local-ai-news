# Karşılaştırma planı v1 - ikili sayfa

> İngilizce eş: [docs/en/COMPARE-PLAN.md](../en/COMPARE-PLAN.md)
> Durum: **uygulandı 2026-10-20** - §9 neyin indiğini, üç sapmayı ve ölçülen sonuçları kaydeder. Aynı gün plan olarak yazıldı.
> `2026-10-18` snapshot'ını sunan canlı dev sunucusuna (**1 633 model izleniyor**, bunların **606'sı kapıdan geçiyor** - başlığın kendi ifadesiyle `1.5k models in window / 606 pass the gate`) ve CDP üzerinden headless Chrome 155'e karşı ölçüldü. Veri örneklemi o 606 satır: `GET /api/feed?window=7d&gate=passed&limit=100&page=1…7`. (`gate=all`, kategori yokken `passed`a zorlanıyor - `lib/query.ts` karar 9 - ve izlenen hiçbir satır ~7 günden eski değil, çünkü ilk görülme yaşının p90'ı 6,9 gün; bu yüzden `window=90d` de aynı 606'yı döndürüyor. Karşılaştırma bağlantılarını kapıdan geçen akış kartları üretiyor, yani sayfaya tam olarak bu kümeden geliniyor.)
> Kapsam: yalnızca `/[locale]/compare`. DESIGN-V3'ün görsel dilini (çizgili sayfa, **Almanak** masası) ve DESIGN-V2'nin ölçüm kurallarını korur; DESIGN.md §5.6'daki tek satırlık brief'i ("yapışkan başlık tablosu, satır başına en iyi değer, akışı anlatan boş durum") değiştirir - çünkü bunların üçü de var, ikisi bozuk ve hiçbiri sayfanın asıl sorunu değil.
> Kanıt: `.shots/plan-compare-measure.mjs` (yeniden koşturulabilir CDP ölçümü), `.shots/plan-f1…f7.json` (sunulan 606 satır), `.shots/compare-1440.png`, `.shots/compare-390.png`, sahibin 2026-10-20 ekran görüntüsü.

---

## 0. Özet

Sayfanın işi tek bir soru: **"bu ikisinden hangisini çalıştırayım?"** Bugün bu soru sorulamıyor.

- **İkinci model eklenemiyor.** Sitedeki tek karşılaştırma bağlantısı `FeedCard`'daki bağlantı ve o id listesinin tamamını *değiştiriyor* (`?ids=<tek slug>`). Karşılaştırma sayfasının kendisinde `?ids=` içeren **sıfır** bağlantı var (ölçüm: `compare` eşleşen 6 bağlantı, hepsi navigasyon öğesi). Yani ikinci modeli eklemek için adresi elle düzenlemek gerekiyor.
- **Sayfanın öğrettiği tek adres biçimi çalışmıyor.** Boş durum *"adrese iki depo kimliği yazın: `?ids=owner/model,owner/model`"* diyor. `slugify()` `/` karakterini `-` yapıyor; bu yüzden `?ids=axiomofmind/Moss-Image-base-GGUF` **"No models match these filters"** çiziyor, `?ids=axiomofmind-Moss-Image-base-GGUF` ise tabloyu açıyor. Kabul edilen tek biçim 32–102 karakterlik slug ve arayüz bunu hiçbir yerde göstermiyor.
- **Sayfa, kaydırmak yerine sıkışan bir tablo.** 390 px'te dört sütun 341 px'lik tabloya tıkılıyor: satır etiketi sütunu **34 px**, başlık satırı **179 px** yüksekliğinde, hücreler 11–15 px. Vaat edilen "görünür kaydırma çubuklu yatay kapsayıcı" (DESIGN-V2 §297) yok - ölçülen her genişlikte kullanılabilir yatay kaydırma **0 px**, çünkü `w-full` + otomatik tablo yerleşimi açığı sütunlara dağıtıyor.
- **Yapışkan başlık yapışmıyor.** `thead` hesaplanan değeri `position: sticky` ama atası `overflow-x-auto` sarmalayıcı ve o kutu dikey olarak hiç kaymıyor. 390 px'te ölçüm: sayfa 362 px kaydırıldı, başlık üst kenarı **−31 px**.
- **Satırların yarısı çoğu zaman boş ve sayfa bunu söylemiyor.** `paramsTotal` sunulan satırların **%17,7**'sinde, `vramEstGb` **%17,2**'sinde var. Rastgele bir ikilinin iki tarafında da parametre bulunma olasılığı **%2,9**; en az bir tarafta eksik olma olasılığı **%67,8**. Sayfa fark etmeksizin aynı 8 satırı, çıplak bir "-" ile basıyor.
- **Sessiz veri kaybı.** Bilinmeyen id'ler tek kelime edilmeden düşüyor (`?ids=<slug>,garbage` → 1 sütunlu sayfa, uyarı yok), 6'dan fazla id sessizce kırpılıyor (`slice(0, 6)`), tekrarlar yinelenen sütun olarak çiziliyor (`?ids=a,a` → iki özdeş sütun) ve farklı büyük/küçük harfle yazılmış bir model adı hiç çözülmüyor.
- **Metadata yok, boş rotada h1 yok.** `compare/page.tsx` `generateMetadata` dışa aktarmıyor; bu yüzden her karşılaştırma adresi site geneli başlığı taşıyor (`/tr/compare?ids=…` üzerinde ölçülen `document.title`), oysa `sitemap.ts` `/compare`'ı ilan ediyor. Boş durumda hiç `<h1>` yok (ölçüm: 0 `h1`), yani sayfanın başlık hiyerarşisi sorgu dizesine göre değişiyor.

Yeniden yapımın tek düzenleyici fikri şu: **sayfa, 2–4 depo hakkında bir olgu tablosudur ve her olgu yokluğunda da ayakta kalmalıdır.** Kimse bildirmiyorsa satır düşer, eksik hücre bunu kelimeyle söyler, farklar ilk sütuna göre hesaplanır, "en iyi" basılı bir dipnotla tanımlanır ve asla uydurulmaz; model eklemek/çıkarmak tek bağlantıdır - JavaScript yok, elle adres düzenleme yok.

---

## 1. Kanıt

### 1.1 Yöntem

| Ne | Komut / dosya |
|---|---|
| Canlı sunucu | `next dev`, `:3000`, snapshot `generatedAt 2026-10-18` |
| Yerleşim ölçümü | `node .shots/plan-compare-measure.mjs` (`:9222` CDP, `Emulation.setDeviceMetricsOverride`, `mobile: false`; `readyState === 'complete'` **ve** beklenen url/genişlik canlı olana kadar yeniden dener - `next dev` kayıtta derliyor ve sabit bekleme önceki rotayı ölçüyor) |
| Veri örneklemi | `GET /api/feed?window=7d&gate=passed&limit=100&page=1…7` → `.shots/plan-f1…f7.json` (606 satır; akışın ve onun karşılaştırma bağlantılarının paylaştığı kapıdan geçmiş pencere) |
| Adres davranışı | `curl -s "localhost:3000/en/compare?ids=…" \| grep` ile boş durum / tablo işaretleri |

### 1.2 `/en/compare` üzerinde ölçülen yerleşim (8 sabit satır)

| Durum | Tablo | Sütun | Satır etiketi sütunu | Başlık satırı yüksekliği | Kullanılabilir yatay kaydırma | Sayfa yüksekliği |
|---|---|---|---|---|---|---|
| 1 id @1440 | 1 246 px | 2 | **302 px** | 47 px | 0 px | 900 px |
| 2 id @1440 | 1 246 px | 3 | **153 px** | 47 px | 0 px | 900 px |
| 3 id @1440 | 1 246 px | 4 | **77 px** | 47 px | 0 px | 900 px |
| 3 id @390 | 341 px | 4 | **34 px** | **179 px** | 0 px | 1 262 px |
| 3 id @360 | 311 px | 4 | **33 px** | **179 px** | 0 px | 1 340 px |
| 6 id @1440 | 1 246 px | 7 | **60 px** | 69 px | 0 px | 900 px |
| 6 id @390 | 341 px | 7 | **29 px** | **289 px** | 0 px | 1 558 px |

Tek cümleyle: *karşılaştırdığın model sayısı arttıkça onları açıklayan etiket daralıyor; telefonda 11 px'lik satır etiketleri 29 px genişliğe iniyor ve başlık, sarılmış depo kimliklerinden 289 px'lik bir yığına dönüşüyor.*

Diğer ölçülen olgular:

| Olgu | Sayı |
|---|---|
| 40 karakterden uzun depo kimlikleri | **152 / 606 (%25,1)**; en uzun **102** |
| En uzun quantizations hücresi (`join(", ")`) | **138 karakter**, 21 girdiye kadar |
| Model başına runner | 1–4 |
| `<td>` yazı boyutu | 15 px; satır etiketleri 11 px (`.label`) |
| Sayfadaki `<th>` nitelikleri | hiçbiri - `scope` yok, `caption` yok, satır etiketleri `<td>` |
| Sayfa düzeyinde `?ids=` bağlantısı (ekle / çıkar / takas / temizle) | **0** |
| Id'siz `/en/compare` üzerinde `<h1>` | **0** |

### 1.3 Sunulan snapshot'ta alan kapsaması (606 kapıdan geçmiş satır)

| Alan | Bildiren | Rastgele ikilinin iki tarafı | En az bir taraf |
|---|---|---|---|
| İlk görülme (yaş) | **%100** | %100 | %100 |
| İndirme | **%97,5** | %95,1 | %99,9 |
| Runner | **%94,2** | %88,8 | %99,7 |
| Kütüphane (`libraryName`) | %85,6 | - | - |
| Ağırlık boyutu (`storageBytes`) | **%76,2** | %58,1 | %94,4 |
| Lisans | **%72,6** | %52,7 | %92,5 |
| Quantization | **%42,6** | %18,1 | %67,0 |
| Taban model (`cardMeta.baseModel`) | %26,4 | - | - |
| Beğeni | **%21,1** | %4,5 | %37,8 |
| Parametre (`paramsTotal`) | **%17,7** | %3,1 | %32,2 |
| VRAM tahmini (`vramEstGb`) | **%17,2** | %2,9 | %31,4 |
| Dil | %12,4 | - | - |
| Parametre **ve** VRAM | %17,2 | **%2,9** | %31,4 |

Planın üzerine kurulduğu sonuçlar:

1. **Parametre/VRAM ile açılan bir sayfa rastgele ikililerin 3'te 2'sinde boş.** Bu iki satır sayfanın omurgası olamaz; indirme, runner, boyut, lisans ve yaş olabilir.
2. **İlk görülmeden bu yana günlük indirme**, her biri ≥ %97 var olan iki alandan türetiliyor; yani her zaman basılan tek "performans" metriği ve 90 günlük pencere için dürüst olanı (kümülatif indirme ÷ depoyu ilk gördüğümüzden bu yana geçen gün; etiket bunu aynen söylemek zorunda).
3. Parametre veya VRAM gerektiren her türetilmiş metrik (1B başına VRAM, parametre başına bayt) ~6 modelde 1'inde var; **yaklaşık hesaplanmaz, gizlenir**.

### 1.4 Kusurlar

| # | Kusur | Ölçüm |
|---|---|---|
| **D1** | Öğretilen adres biçimi (`?ids=owner/model`) çözülmüyor | `?ids=axiomofmind/Moss-Image-base-GGUF` → "No models match"; `?ids=axiomofmind-Moss-Image-base-GGUF` → tablo |
| **D2** | Bilinmeyen id'ler sessizce düşüyor | `?ids=<slug>,garbage` → 1 sütunlu sayfa, uyarı yok |
| **D3** | 6'dan fazla id sessizce kırpılıyor | `page.tsx` içinde `slice(0, 6)` |
| **D4** | Tekrar eden id'ler yinelenen sütun çiziyor | `?ids=a,a` → 2 özdeş sütun, ikisi de "en iyi" |
| **D5** | Sayfada ekle / çıkar / takas / temizle yok | Rotada 0 adet `?ids=` bağlantısı |
| **D6** | Seçici yok, arama yok, öneri yok | Sayfada 1 `<input>`; o da masa araması |
| **D7** | Kaydırmıyor, sıkışıyor: model eklendikçe etiketler okunamaz hâle geliyor | 390'da 34 px etiket, 1440'ta 6 modelle 60 px |
| **D8** | Yapışkan başlık dekoratif | `thead` sticky ama 362 px'lik sayfa kaydırmasından sonra başlık −31 px |
| **D9** | Sabit 8 satır; tamamen boş satırlar yine basılıyor | 8 satır; `params` modellerin %82'sinde boş |
| **D10** | "En iyi" tanımsız, eşitlikleri görmüyor ve boyut metriklerinde ters yönde | `params`/VRAM'de `min` küçük modeli "en iyi" ilan ediyor; `findIndex` yalnızca ilk maksimumu işaretliyor; kural basılmıyor |
| **D11** | `generateMetadata` yok, boş rotada h1 yok, `sitemap` `/compare`'ı listeliyor | `document.title` = site başlığı; idsiz sayfada 0 `h1` |
| **D12** | Yardımcı teknoloji için gerçek tablo değil | `caption` yok, `scope` yok, etiketler `<td>` içinde |
| **D13** | Seyrek hücreler açıklamasız çıplak "-" basıyor, kapsama notu yok | Parametresiz bir ikilide `params` hücrelerinin %100'ünde `-` |
| **D14** | Tek id, "tek kişilik karşılaştırma" çiziyor; ikinci eklemeye çağrı yok | 1-id sayfası: 2 sütun, `best` sayısı 0 |

---

## 2. Kararlar

| # | Karar | Gerekçe (ölçülmüş) |
|---|---|---|
| **C1** | **Adres durumdur, ama insanların gerçekten yapıştırdığını kabul eder**: `owner/model`, `owner-model` slug'ı, `https://huggingface.co/owner/model` (`/tree/main`, sondaki `/` dahil), her büyük/küçük harf, `%2C` ile kodlanmış ayırıcı | D1: öğretilen biçim bozuk olanı. Tek çözümleyici `lib/compare.ts` içinde; hem adres hem ekleme formu onu kullanıyor, böylece ikisi çelişemez |
| **C2** | **Sınır 4 model** (varsayılan 2) | 1 246 px'lik sayfada 4 sütun × 276 px, etiket sütununu sabit 140 px'te tutuyor; 6 sütun otomatik yerleşimde etiket sütununu 60 px'e düşürdü (§1.2). Dört, bir kararın ihtiyaç duyduğu en fazla sayı |
| **C3** | **Ekle / çıkar / takas / temizle düz GET bağlantıları ve tek GET formu** - istemci JS yok | Sitenin tamamı sunucuda render ediliyor; bu bölgedeki tek istemci bileşeni `ScrollStrip` ve o başka bir sebeple var (D5) |
| **C4** | **1 024 px altında sayfa biçimini korur**: solda sabitlenmiş 90 px etiket sütunu, model sütunları en az 148 px, mevcut `ScrollStrip` içinde (görünür kaydırma çubuğu, fareyle sürükleme, klavye odak noktası) | Ölçüm: 2 model 390 px ekrana kaydırmasız sığıyor (90 + 2×148 = 386). 4 modelde taşma 296 px ve çubuk / sürükleme / ok tuşlarıyla erişilebilir - DESIGN-V2 §297'nin istediği ve DESIGN-V3 §0.2.9'un şerit için zaten bir kez çözdüğü erişilebilirlik |
| **C5** | **Kimse bildirmiyorsa satır düşer**; kısmi satır kapsamasını etiketinde basar (`Ağırlık boyutu · 2/3`) | D9/D13: modellerin %82'sinde parametre yok; tamamen boş satır basmak hiçbir şey öğretmeyen gürültü |
| **C6** | **Eksik değer "bildirilmemiş" der** (görsel olarak çizgi, yardımcı teknoloji için kelime ve `title`) - çıplak `-` değil | Aynı veri yalnızca var olduğu yerde karşılaştırılabilir; açıklamasız çizgi "sıfır" gibi okunuyor |
| **C7** | **Yön satır bazında ve bir kez basılır**; "en iyi" yalnızca olgu olduğu yerde işaretlenir | `↑` yüksek iyi: indirme, günlük indirme, beğeni, 1k indirme başına beğeni. `↓` düşük iyi: ağırlık boyutu, VRAM, 1B başına VRAM. **Yön yok**: parametre, quantization, lisans, kategori, runner, ilk görülme, taban model - küçük model daha iyi model değildir, küçük modeldir |
| **C8** | **Eşitliklerin hepsi işaretlenir**, yalnızca değeri ≥ 2 model bildirdiğinde | D10: `findIndex` iki eşit maksimumdan birini işaretliyordu |
| **C9** | **Her sayısal değerin altında, ilk sütuna göre fark** (`+1.2k`, `−2.1 GB`, `+38/gün`), 0'da ve bir taraf eksikse basılmaz | Sayfanın sorusu "hangisi" ve iki sayı yerine fark bu soruya daha iyi cevap veriyor. İlk sütun referans, çünkü adresin sırası korunuyor |
| **C10** | **"En büyük farklar" bir hüküm değil, olgu**: iki tarafın da bildirdiği satırlardan en büyük göreli açıklığa sahip 3 cümle - `Günlük indirme: 41,2 vs 6,1 (6,7×)` | Sitenin geri kalanıyla aynı kural (DESIGN-V3 §0.1: doğrulanamayan bileşik skor yok). Burada basılan her sayı bir satırda da basılıyor |
| **C11** | **Bileşik "kazanan" yok, skor yok, grafik yok** | İndirme ile VRAM karışımını okuyucu denetleyemez ve bu, sitedeki üçüncü belgesiz sayı olurdu |
| **C12** | **Rotada `generateMetadata`**: ikili başlık ("A vs B - Karşılaştır"), pencereyi ve snapshot'ı adlandıran açıklama, **tekilleştirilmiş ve sırası korunmuş** canonical adres, ve id'ler çözüldüğünde `robots: { index: false, follow: true }` | D11: karşılaştırma adresleri bir araçtır, içerik değil; permütasyonlar neredeyse sonsuz ve hepsi kendini canonical ilan ediyor. `/compare` (idsiz) dizine açık kalır ve sitemap'te kalır |
| **C13** | **Gerçek tablo semantiği + gerçekten çalışan yapışkan başlık**: `<caption class="sr-only">`, `<th scope="col">`, `<th scope="row">`, "en iyi nasıl belirlenir" dipnotuna işaret eden `aria-describedby`; sayfa sarmalayıcısı `thead`'in üstünde dikey kaydırma alanı yaratmamalı | D12, D8 |
| **C14** | **İstek başına tek snapshot okuması**: `getModelsBySlugs(slugs)` (Map araması) + `getCompareSuggestions(seed)` `lib/store.ts` içinde; satır kurma `lib/compare.ts` içinde saf fonksiyon | Bugün rota `Promise.all(slugs.map(getModel))` yapıyor - tek sayfa için N snapshot okuması |

---

## 3. Sayfa

### 3.1 Durumlar

| Verilen id | Ne çizilir |
|---|---|
| **0** | `PageHeader` (kicker `KARŞILAŞTIR`, h1, pencereyi ve snapshot yaşını söyleyen tek cümle) → **seçici**: bir GET formu ("Depo kimliği yapıştır - `owner/model`"), pencerenin en çok indirilen 8 modeli "Ekle" çipleri olarak ve **hesaplanmış 3 ikili** ("Bu haftanın iki embedding modeli: A vs B") → sayfanın nasıl okunacağına dair dipnot |
| **1** | Tek sütunlu sayfa, "Tek model - farkları görmek için ikinciyi ekle" uyarısı ve **en yakın 6 komşu** (önce aynı kategori, sonra en yakın indirme) "Ekle" bağlantıları olarak |
| **2–4** | Sayfa, üstünde "ekle" formu, sütun başına çıkar, takas, temizle, bağlantıyı kopyala |
| **>4** | Adres sırasına göre ilk 4 + düşenleri adlandıran uyarı |
| **bazıları çözülemiyor** | Çözülenler + uyarı: `2 of 3 addresses are not in this snapshot: garbage, nope` |
| **tekrarlar** | Tek sütuna indirgenir + uyarı (iki biçim aynı depoyu çözüyorsa da uyarı - dürüst seçim) |
| **hiçbiri çözülemiyor** | `EmptyState` (v3 çizgili sürüm, `DataNotice`) + seçici + gerçekten çalışan depo-kimliği örnekleri |

### 3.2 Sayfa anatomisi (≥ 1 024 px)

```
KARŞILAŞTIR                                      edition · snapshot 3h ago
Modelleri karşılaştır
Son 7 günden iki ile dört depo, yan yana.

[ owner/name             ] [ Ekle ]      takas · temizle · bağlantıyı kopyala   (2 / 4 başlıkta yazıyor)

                                   ╷ axiomofmind/     ╷ AmirFazlollahi/
            (boş köşe)             ╷ Moss-Image-base  ╷ Gemma3-1B-…
                                   ╷ [plaka] Coding  ╷ [plaka] LLM       ✕
─────────────────────────────────────────────────────────────────────────────
FIT                                                                    2/2
  Ağırlık boyutu               ↓   ╷ 6,14 GB          ╷ 2,09 GB   · en iyi
                                   ╷ +4,05 GB         ╷ -
  Parametre                        ╷ -                ╷ 1,0B
  Quantization                     ╷ Q4_K_M, Q8_0     ╷ BF16
─────────────────────────────────────────────────────────────────────────────
ÇALIŞTIRAN                                                             2/2
  Runner                           ╷ llama.cpp, ONNX  ╷ transformers
─────────────────────────────────────────────────────────────────────────────
İLGİ                                                                   2/2
  İndirme                      ↑   ╷ 12,3k            ╷ 4,1k
                                   ╷ +8,2k            ╷ -
  Günlük indirme               ↑   ╷ 41,2/gün         ╷ 6,1/gün  · en iyi
  Beğeni                       ↑   ╷ -                ╷ 12
─────────────────────────────────────────────────────────────────────────────
KÖKEN                                                                  2/2
  Lisans                       ·   ╷ apache-2.0       ╷ mit
  İlk görülme                  ·   ╷ 3g önce          ╷ 4g önce
  Taban model                  ·   ╷ -                ╷ google/gemma-3-1b
  Hugging Face                 ·   ╷ ↗ aç            ╷ ↗ aç

En büyük farklar
  Ağırlık boyutu     6,14 GB vs 2,09 GB (2,9×)
  Günlük indirme     41,2/gün vs 6,1/gün (6,7×)

Bu sayfa nasıl okunur - ↑ yüksek iyi, ↓ düşük iyi, · yön yok.
"en iyi", değeri bildiren modeller arasındaki uç değeri işaretler.
Farklar ilk sütuna göredir. VRAM bir tahmindir (sözlüğe bakın).
```

Kurallar:

- **İlk sütun referanstır**, farkları boştur; ≥ 3 sütunda başlığında `· referans` yazar.
- Grup çizgileri (`FIT`, `ÇALIŞTIRAN`, `İLGİ`, `KÖKEN`) `.section-title` / `.rule-strong` kullanır.
- Her grup kendi kapsamasını (`2/2`) basar, böylece okuyucu sayfanın ne kadarının dolu olduğunu görür.
- Satır etiketleri `<th scope="row">`, 13 px `.label` benzeri ama `normal-case`, **sabit 140 px** - tablo `table-layout: fixed` olduğu için etiket sütunu asla daralmaz.
- Değerler mono, sağa hizalı, `tabular-nums`; birim değerin parçası (`6,14 GB`, `41,2/gün`).
- "en iyi" renk değil metin çipidir: `· en iyi` (bugünkü gibi) - gri tonlamada ve `prefers-contrast` altında da ayakta kalır.
- Sütun başlığındaki `✕`, o slug'ı çıkarılmış aynı adrese gider, `aria-label="<ad> kaldır"`; 24 px hedef (sitenin ölçülmüş alt sınırı).

### 3.3 Mobil (< 1 024 px)

Aynı `<table>` (kart değil - kartlar karşılaştırmayı, yani işin kendisini siler):

- etiket sütunu `sticky left-0`, **90 px**, opak `--bg` ve 1 px sağ çizgi; başlık satırının ilk hücresi boş köşe ve iki eksende sabit;
- her model sütunu `min-width: 148px`;
- sarmalayıcı `ScrollStrip` (`label` = "Model karşılaştırması", görünür 4 px temalı kaydırma çubuğu, sürükleyerek kaydırma, `tabIndex=0`);
- başlık hücreleri 2 satıra kırpılır, `title` tam depo kimliğini taşır (%25 id 40 karakterden uzun, en uzunu 102 - kısa ad uydurmak seçenek değil, kırpmak seçenek);
- gruplar, "En büyük farklar" ve dipnot kalır.

### 3.4 Satırlar (sıra = grup, sonra ölçülmüş kapsama)

| Grup | Satır | Kaynak | Biçim | Yön | Kapsama |
|---|---|---|---|---|---|
| Fit | Ağırlık boyutu | `storageBytes` | `formatBytes` | ↓ | %76,2 |
| Fit | Parametre | `paramsTotal` | `formatParams` | · | %17,7 |
| Fit | Quantization | `quantizations` | join, 4'e kırp + `+n` | · | %42,6 |
| Fit | VRAM tahmini | `vramEstGb` | `~N GB` + sözlük bağlantısı | ↓ | %17,2 |
| Fit | 1B parametre başına VRAM | `vramEstGb / (paramsTotal/1e9)` | `N GB/B` | ↓ | ikisi de %17,2 |
| Çalıştıran | Runner | `runners` | `·` ile join | · | %94,2 |
| Çalıştıran | Kütüphane / pipeline | `libraryName`, `pipelineTag` | metin | · | %85,6 / %93,1 |
| İlgi | İndirme | `downloads` | `formatNumber` | ↑ | %97,5 |
| İlgi | İlk görülmeden bu yana günlük indirme | `downloads / max(1, daysSince(firstSeenAt))` | `N/gün` | ↑ | ~%97,5 |
| İlgi | Beğeni | `likes` | `formatNumber` | ↑ | %21,1 |
| İlgi | 1k indirme başına beğeni | `likes / downloads * 1000` | `N` (0,1) | ↑ | ikisi de %21,1 |
| Köken | Lisans | `license` | metin + filtreli akışa bağlantı | · | %72,6 |
| Köken | Kalite kapısı | `qualityPassed`, `gateReason` | çip | · | %100 |
| Köken | İlk görülme | `firstSeenAt` | `Nd önce` | · | %100 |
| Köken | Taban model | `cardMeta.baseModel` | metin; izleniyorsa o modele bağlantı | · | %26,4 |
| Köken | Hugging Face | `url` | `↗ aç` | · | %100 |

Türetilmiş satırlar formüllerini satır etiketinin `title`'ında ve dipnotta taşır; iki düşük kapsamlı girdi gerektirenler (`1B başına VRAM`, `1k başına beğeni`) çoğu ikilide hiç çizilmez - zaten amaç bu.

---

## 4. Veri katmanı

### 4.1 Yeni saf modül `src/lib/compare.ts`

```ts
export interface CompareToken { raw: string; slug: string }
export interface CompareInput { slugs: string[]; tokens: CompareToken[]; duplicates: string[]; overflow: string[] }
export function parseCompareIds(raw: string | string[] | undefined, cap?: number): CompareInput
export function toRepoId(value: string): string        // HF URL / çıplak id / slug → owner/model
export function compareSlugOf(value: string): string | null
export function splitResolved(tokens: CompareToken[], models: ClassifiedModel[]): { models; rejected: string[] }
export function compareRows(models: ClassifiedModel[], locale: Locale): CompareRow[]
export function bestIndexes(row: CompareRow): number[]  // tüm eşitlikler, yalnızca >= 2 sayısal değer varsa
export function rowDeltas(row: CompareRow): Array<string | null> // 0. indist'e göre, karşılaştırılamazsa null
export function topDifferences(rows: CompareRow[], limit?: number): Difference[]
```

`parseCompareIds` kuralları (test tablosu, ≥ 12 durum):

| Girdi | Sonuç |
|---|---|
| `owner/model` | slug `owner-model` |
| `owner-model` | slug `owner-model` |
| `https://huggingface.co/owner/model` | slug `owner-model` |
| `https://huggingface.co/owner/model/tree/main` | slug `owner-model` |
| `OWNER/Model` | snapshot'a karşı büyük/küçük harf duyarsız çözülür |
| `a, b ,c` | 3 slug, kırpılmış, sıra korunur |
| `a,a` | 1 slug + `duplicates: ["a"]` |
| `a,b,c,d,e` | 4 slug + `overflow: ["e"]` (sınır 4) |
| `garbage` | `rejected: ["garbage"]`, 0 slug |
| `a%2Cb` | 2 slug (kodlanmış ayırıcı) |
| `""`, `,`, `, ,` | 0 slug, hiçbiri reddedilmedi (boş = "ayarlanmamış", `cleanSearch` kuralı) |
| `%E0%A4%A` (bozuk kaçış) | ham değer, hata fırlatmaz |
| > 102 karakterlik id | kabul edilir, yalnızca başlıkta kırpılır |

### 4.2 Store eklemeleri (`src/lib/store.ts`)

```ts
export async function getModelsBySlugs(slugs: string[]): Promise<ClassifiedModel[]> // tek loadSnapshot + Map
export async function resolveModelSlug(candidate: string): Promise<string | null>  // önce tam, sonra küçük harf indeksi
export async function getCompareSuggestions(seed: ClassifiedModel | null, limit: number): Promise<ClassifiedModel[]>
```

`getCompareSuggestions(null)` (boş sayfa) → 7 günlük pencerenin en çok indirilenleri, kapıdan geçenler.
`getCompareSuggestions(seed)` (1 model) → önce aynı kategori (indirme azalan), sonra pencerenin geri kalanı; seed ve tekrarlar hariç.

### 4.3 Testler

`tests/compare.test.ts` (yeni):

1. yukarıdaki ayrıştırma tablosu (her satır bir durum);
2. bildiren 0 ise satır düşer; 1 bildiren varsa satır çizilir ve **en iyi işareti almaz**;
3. eşitlikler her indisi işaretler;
4. `params` hiçbir zaman yön taşımaz ve hiç "en iyi" basmaz;
5. farklar bir taraf eksikse `null`, 0'da `null`, diğer durumda işaretli;
6. `topDifferences` bir satırda basılmayan hiçbir ikiliyi üretmez;
7. gerçek snapshot biçimlerinden fixture'lar (parametresiz bir GGUF, tamamı bildirilmiş bir safetensors, kapıdan geçmeyen bir model).

`tests/i18n.test.ts` (yeni): iki sözlükte aynı anahtar kümesi, boş değer yok ve `src/app/[locale]/compare` içinde kullanılan her `t()` anahtarı mevcut.

---

## 5. Uygulama adımları

| Faz | İş | Dosyalar |
|---|---|---|
| **P0** | Ayrıştırıcı + saf satır modeli + testler (arayüz değişmez) | `src/lib/compare.ts`, `tests/compare.test.ts`, `tests/i18n.test.ts` |
| **P1** | Store eklemeleri (tek snapshot okuması, çözümleyici, öneriler) | `src/lib/store.ts` |
| **P2** | Sayfa bileşeni: gruplu satırlar, sabit etiket sütunu, farklar, en iyi/eşitlik, kapsama notları, eksik değer dili, gerçek tablo semantiği | `src/components/compare/CompareSheet.tsx` (yeni) |
| **P3** | Rota: ayrıştır → çöz → uyarılar (reddedilen / taşan / tekrar / hiçbiri) → seçici (form + Ekle çipleri + hesaplanmış ikililer + komşular) → `PageHeader` + `DataNotice` + dipnot; `generateMetadata` canonical (sıralı, tekilleştirilmiş) + id'ler çözüldüğünde `noindex` | `src/app/[locale]/compare/page.tsx` |
| **P4** | Mobil: `sticky` etiket sütunu + `ScrollStrip` sarmalayıcı + 148 px sütunlar + 2 satıra kırpılmış başlıklar | `CompareSheet.tsx`, `globals.css` (gerekirse `.compare-*` yardımcıları) |
| **P5** | i18n anahtarları (en + tr), doküman indeksi, ekran görüntüleri, ölçüm | `src/i18n/dictionaries/*.json`, `docs/README.md`, `.shots/` |
| **P6** | `FeedCard` metni: kartın "Karşılaştır" bağlantısı *değiştiren* bağlantı olarak kalır (tek model) ama çoklu ekleme yolu sayfanın kendi formudur; "şununla karşılaştır…" `title`/`aria-label` eklenerek değiştirme davranışı sürpriz olmaktan çıkar | `src/components/FeedCard.tsx` |

Yeni i18n anahtarları (~30, iki dilde, eşlik yeni testle zorunlu):
`compare.lede`, `compare.addModel`, `compare.pasteHint`, `compare.pastePlaceholder`, `compare.add`, `compare.added`, `compare.remove`, `compare.swap`, `compare.clear`, `compare.copyLink`, `compare.selected`, `compare.ofCap`, `compare.baseline`, `compare.best`, `compare.notReported`, `compare.coverage`, `compare.groupFit`, `compare.groupRuns`, `compare.groupTraction`, `compare.groupProvenance`, `compare.rateSinceFirstSeen`, `compare.vramPerB`, `compare.likesPerK`, `compare.topDifferences`, `compare.howToRead`, `compare.deltaNote`, `compare.oneModel`, `compare.suggestTitle`, `compare.suggestPair`, `compare.neighbours`, `compare.rejected`, `compare.overflow`, `compare.duplicates`, `compare.noneResolved`, `compare.weights`, `compare.gate`, `compare.openHf`, `compare.formatExamples`.

---

## 6. Kabul kriterleri

| # | Kriter | Nasıl |
|---|---|---|
1 | 2 ve 4 modelli sayfada 320/360/390/768/1024/1280/1440'te **0 px** yatay taşma | `scripts/audit-ui.ts` taraması + `.shots/plan-compare-measure.mjs` |
2 | Satır etiketi sütunu ≥ 1 024 px'te **140 px**, altında (sabitlenmiş) **90 px** | CDP `getBoundingClientRect`, `tbody th` |
3 | 4 modelli sayfada 102 karakterlik depo kimliğiyle başlık satırı masaüstünde ≤ **96 px**, mobilde ≤ **64 px** (bugün: 47 / **289**) | aynı ölçüm |
4 | `thead` yapışıyor: `window.scrollTo(0, 400)` sonrası başlık üst kenarı **0 ± 1 px** (bugün: **−31**) | aynı ölçüm |
5 | 390'da 4 modelle kullanılabilir yatay kaydırma **≥ 250 px** ve görünür çubuk, sürükleme, ok tuşlarıyla erişilebilir (bugün: **0**) | `scrollWidth − clientWidth` + elle tuş testi |
6 | Hiçbir model bildirmiyorsa satır çizilmez; 1 bildiren satır "en iyi" işareti almaz | birim testi (4.3 #2) |
7 | `?ids=owner/model`, slug biçimi ve HF adresi çözülür | birim testi + `curl` |
8 | Bilinmeyen id adlandırılmış uyarı üretir; 5 id 4 sütun + uyarı üretir; tekrarlar 1 sütun üretir | `curl` + birim testi |
9 | Ekle → çıkar gidiş-dönüş: `/compare?ids=a` + `b` ekle → `a,b` sütunları; `a` çıkar → `b` sütunu | `curl` |
10 | `document.title` ikiliye göre değişir; id'li karşılaştırma adresleri `noindex`; `/compare` `sitemap.xml`'de kalır | `curl` |
11 | Sözlükler eşit (anahtar kümesi + boş değer yok) ve her compare anahtarı mevcut | `tests/i18n.test.ts` |
12 | `npm test`, `npm run typecheck`, `npm run lint` yeşil | CI |
13 | Ekran görüntüleri `.shots/compare-v2-2up-1440.png`, `-4up-1440`, `-2up-390`, `-4up-390` ve bir print-media geçişi | `scripts/screenshot.ts` |

---

## 7. Riskler

| Risk | Önlem |
|---|---|
| Uzun depo kimlikleri (%25 > 40 karakter, en uzun 102) başlığı yıkıyor | sabit 140/148 px sütunlar + `line-clamp-2` + `title` + plaka; kısa ad asla uydurulmaz |
| Türetilmiş "günlük indirme" büyüme oranı sanılabilir | etiket *ilk görülmeden bu yana* der, tooltip `indirme ÷ 2026-10-15'ten bu yana geçen gün` basar; önceki snapshot'a göre delta değildir (o `lib/heat.ts`'in işi ve henüz hiç taban çizgisi yok - 606 satırın 0'ında `downloadsAtFirstSeen` var) |
| Daha çok satır = kimsenin denetlemediği daha çok sayı | basılan her sayı `/m/[slug]` sayfasında veya kartta da var; bileşik skor yok (C11) |
| Mobil kaydırma etiket sütununu yine saklar | etiket sütunu `sticky left-0`, ölçüt #2 ile doğrulanır |
| Seçici, akışın filtrelerinden kopan ikinci bir arama arayüzüne dönüşür | seçici aynı `getFeed`/`getCompareSuggestions` fonksiyonlarını sorgular; kendi filtresi yok |
| Karşılaştırma adreslerinde `noindex` SEO gerilemesi gibi görünebilir | `/compare`'ın kendisi dizinde kalır ve sitemap kaydını korur; yalnızca id permütasyonları dışlanır |

## 8. Kapsam dışı

Kaydedilmiş karşılaştırmalar, paylaşım kartları, CSV dışa aktarma, grafikler, quantization başına VRAM matrisi, 5+ model, kategoriler arası "genel en iyi" skorlaması, istemci tarafı durum.

---

## 9. Uygulama günlüğü - 2026-10-20

Tek geçişte uygulandı. Aşağıdaki her sayı değişiklikten **sonra** `node .shots/compare-verify.mjs` (15 durum, JSON `.shots/compare-verify.json`) ve `.shots/compare-shots.mjs` (altı ekran görüntüsü) ile ölçüldü.

| Plan maddesi | Sonuç (ölçülmüş) |
|---|---|
| **P0** ayrıştırıcı + satır modeli | `src/lib/compare.ts` (saf; `now` ve `knownSlugs` dışarıdan veriliyor, satır modeli test edilebilir) ve `tests/compare.test.ts`, **12 durum**: her adres biçimi, önce çöz sonra böl, tekilleştirme, sınır, satır düşmesi, eşitlik işaretleme, parametrede yön yokluğu, farklar, en büyük farklar, ikili önerileri |
| **P1** store | `getModelsBySlugs` (tek snapshot okuması + önce tam, sonra büyük/küçük harf duyarsız indeks), `getTrackedSlugs`, `getCompareSuggestions` |
| **P2/P3** sayfa + rota | `src/components/compare/CompareSheet.tsx`, `src/components/compare/ComparePicker.tsx`, `generateMetadata` ile yeniden yazılmış `src/app/[locale]/compare/page.tsx` |
| **P4** mobil | 96 px sabitlenmiş etiket sütunu, 148 px model sütunları, dört modelle yatay kaydırma **390 px'te 345 px**, **320 px'te 415 px**; sona kaydırıldıktan sonra etiket sütunu **x = 16 px** |
| **P5** i18n | İki sözlükte **67 yeni anahtar**; eşlik yeni `tests/i18n.test.ts` ile zorunlu (anahtar kümeleri eşit, boş değer yok, compare yüzeyinin istediği her anahtar var) |
| Kapılar | `npm test` **159/159**, `npm run lint` temiz, `npm run typecheck` temiz |

### 9.1 Değişiklikten sonra ölçülen (102 karakterlik depo kimliği içeren 4 modelli sayfa)

| Durum | Etiket sütunu | Başlık satırı | Yatay kaydırma | Sayfa kaydırmasından sonra başlık |
|---|---|---|---|---|
| @1440 | **140 px** | **83 px** | 0 (sığıyor) | **0 px - yapışık** |
| @1024 | 140 px | **99 px** | 0 (sığıyor) | **0 px - yapışık** |
| @768 | 140 px | **99 px** | 0 (sığıyor) | **0 px - yapışık** |
| @390 / 360 / 320 | **96 px (sabit)** | **83 px** | 345 / 375 / 415 px | sayfayla kayıyor (§9.2) |

Belge taşması 320/360/390/768/1024/1280/1440'ta **0 px**. Id'siz sayfa artık boş bir viewport değil: seçici, 8 ekleme çipi ve **hesaplanmış 3 ikili** çiziyor (1440'ta 1 198 px yüksekliğinde; eskiden 844 px hiçlik).

Adres davranışı, ölçülmüş: `?ids=axiomofmind/Moss-Image-base-GGUF` ve `?ids=https://huggingface.co/…` ikisi de çözülüyor; `?ids=a,a` tek sütun ve adlandırılmış uyarı veriyor; altı adres dört sütun artı `Bir sayfa 4 model tutar; düşenler: e5, f6` veriyor; bilinmeyen adres `3 adresten 2 tanesi bu snapshot'ta yok: xx/garbage` diyor ve **yazıldığı gibi** alıntılıyor. Ekleme formu **307 → `/en/compare?ids=…`** döndürüyor, yazım hatası sessizce düşmek yerine adlandırılmış uyarı veriyor. `document.title` `Moss-Image-base-GGUF vs Gemma3-1B-… - Karşılaştır`, canonical tekilleştirilmiş ve sırası korunmuş, çözülen sayfalar `robots: noindex, follow` taşıyor.

### 9.2 Plandan sapmalar (ve nedenleri)

| Planlanan | İnen | Neden |
|---|---|---|
| Id'leri **sıralanmış** canonical | tekilleştirilmiş, **sırası korunmuş** | İlk sütun, her farkın referansıdır (§2 C9); yani `?ids=b,a` ile `?ids=a,b` farklı belgelerdir. Canonical'ı sıralamak, çizilen sayfayı ters farklara sahip bir sayfanın kopyası ilan ederdi. |
| Başlık satırı masaüstünde ≤ 96 px / mobilde ≤ 64 px | **her yerde ≤ 100 px** (1440'ta dört modelle 83, 1024/768'de 99) | Sütun başlığı adı, sahibi, kategoriyi, yaşı ve çıkar düğmesini taşıyor. 64 px, sütunun *ne olduğunu* saklamak demekti. Kural ayrıca yolda gerçek bir kusur yakaladı: plaka ve çıkar düğmesi ayrı flex öğeleriyken 768 px'te ada 53 px yer kalıyordu ve başlık satırı **189 px**'e çıkıyordu - plaka artık yalnızca `lg`, çıkar düğmesi adın yanında. |
| `thead` her genişlikte yapışıyor | **768 px'ten itibaren** yapışıyor; altında etiket sütunu sabit, başlık sayfayla kayıyor | `overflow-x: auto`, `overflow-y`'yi `hidden`a hesaplıyor; bu, sarmalayıcıyı dikey kaydırma aralığı sıfır olan bir scroll port yapıyor ve `position: sticky` viewport'a asla ulaşamıyor (ölçüm: dört modelle −494 px). `overflow-y: clip` yardımcı olmuyor: spesifikasyon tam bu yüzden onu `hidden`a çeviriyor. 768 px altında sayfa gerçekten yatay kaydırmaya ihtiyaç duyuyor (148 px en az sütun), yani seçim yapışkan başlık ile okunabilir sütunlar arasında - sütunlar kazanıyor; grup çizgileri ve sabit etiket sütunu yönü koruyor. |
| Boş durum `EmptyState`'i yeniden kullanır | compare rotasında kendine ait çizgili blok | `EmptyState` hâlâ akış, haber, araştırma ve 404 yollarında kullanılıyor ve bu rotanın kapsamı dışında; compare'ın sıfır durumu bir mesaj ve düğme değil, form, çipler ve hesaplanmış ikililer gerektiriyordu. |
| - | `CompareActions` model sayısını kaybetti | Sayfa başlığının `aside` alanı zaten `4 modelden 2 tanesi` basıyor; 100 px içinde iki kez basmak gürültüydü. |

Yolda düzeltilen bir ölçülmüş kusur daha: eski sayfanın `min` yönü, parametre ve VRAM'de **küçük** modeli "en iyi" ilan ediyordu. Parametre artık hiç yön taşımıyor (küçük model küçüktür, daha iyi değil) ve boyut biçimli satırlar (`ağırlık`, `vram`, `1B başına vram`) `min` yönünü dipnotta basılan kuralla koruyor.
