# İstatistik sayfası v2 - "Veri Masası"

> İngilizce kaynak: [docs/en/STATS-PLAN.md](../en/STATS-PLAN.md)
> Durum: **uygulandı** 2026-10-20 (§15 neyin indiğini, sapmaları ve ölçülen sonuçları kaydeder). Sitenin gerçekten sunduğu anlık görüntüye göre yazıldı (`generatedAt 2026-10-20T12:17:46Z`, **1 544 model / 210 haber**), çalışan dev sunucusuna ve eski sayfanın headless-Chrome ölçümüne dayanır.
> [DESIGN-V3.md](DESIGN-V3.md) §7.1'deki `/stats` satırını ("`ui/Charts.tsx` renk/eksen restyle") geçersiz kılar. V3'ün tasarım dili aynen kalır - bu plan **sayfanın neyi ölçtüğünü** değiştirir, sitenin nasıl göründüğünü değil.
> Kanıt: `.shots/live-snapshot.json` (`npx tsx scripts/fetch-snapshot.ts`), `.shots/measure-stats-page.mjs` (CDP ölçümü), `.shots/before-stats-390.png` ve metin içinde alıntılanan curl çıktıları.

---

## 0. Özet

Bugün `/stats` üç panelden oluşuyor (çubuklar, halka, çizgi) ve **tek** boyutu (kategori sayıları) ölçüyor; trend grafiği ise kendi cron'umuzu ölçüyor. Canlı anlık görüntüde ölçülenler: *Pencere* kontrolü 7, 30, 90 ve 180 gün için aynı sayıyı döndürüyor (**her seferinde 606**), trend grafiğinde **üç nokta** ve **sıfır** eksen etiketi var, 30 günlük pencere "3 gün" olarak yazılıyor; halkada **8 dilim** ama **7** renk var, yani en küçük kategori en büyüğüyle aynı pembeye boyanıyor; sayfa **0 bağlantı** üretiyor, yani üzerindeki hiçbir sayı açılamıyor.

Plan bunu bir veri sayfasının olması gereken masaya çeviriyor:

1. **İki zaman ekseni, adlarıyla** - `tracked` (Radar'ın ilk gördüğü an) ve `created` (Hugging Face depo tarihi). İkincisi bugün günlük çözünürlüğe sahip tek eksen (49 farklı gün'e karşı 3), dolayısıyla zaman serisi ona taşınıyor.
2. **Her sayı bir fiil ve bir bağlantı alıyor** - her panel neyi saydığını (`in view`, `tracked`, `created`, `passes`) söylüyor ve o sayıyı üreten filtreli listeyi açıyor.
3. **Kalite kapısı görünmez olmaktan çıkıyor** - sayfa filtrenin neyi tuttuğunu ve neyi sakladığını gösteriyor (`606 / 1 544`; indirmeyle geçen 570, beğeniyle 36; robotik 0/111).
4. **390 px'te okunabilen grafikler** - çubuklar HTML oluyor (gerçek metin, gerçek 11 px etiket), halka ilk 6 + *Diğer*'e katlanıyor, eksik günler eksik gün olarak basılıyor.

---

## 1. Bugün sayfa neyi ölçüyor (varsayım değil, ölçüm)

| # | Ölçüm | Değer | Komut |
|---|---|---|---|
| 1 | Sunulan anlık görüntü | **1 544** model · 210 haber · `2026-10-20T12:17:46Z` | `npx tsx scripts/fetch-snapshot.ts` |
| 2 | **Pencere ölü** | `days=7/30/90/180` → **606** kalite kapısı geçen satır, `gate=all` ile **1 538** - hep aynı | `curl "localhost:3000/api/stats?days=$d"` |
| 3 | Farklı `firstSeenAt` günü | **3** (13 Eki ×343, 14 Eki ×572, 20 Eki ×629). 15–19 Eki yok | canlı anlık görüntü |
| 4 | Farklı `createdAt` günü | **49** (21 Ağu → 20 Eki): 24 saatte 272, 7 günde 773, 30 günde 1 491, 90 günde 1 544 | canlı anlık görüntü |
| 5 | Trend grafiği | 1 200 birimlik viewBox'ta **3 nokta**, **0 `<text>`**, 30 günlük pencerede "3 gün" yazısı | `.shots/measure-stats-page.mjs` |
| 6 | Bugünkü ölçüler | paneller **384 / 384 / 290 px** = 1440'ta 1 007 px ana alan; 390'da 1 228 px; seri SVG'si 1440'ta **1 248×208**, 390'da **343×57** | aynı ölçüm |
| 7 | Sayfanın ürettiği bağlantı | **0**: `<main>` içindeki 16 bağlantı masa menüsü (15) ve kalite kapısındaki sözlük `?`'si | `grep -c Link page.tsx` |
| 8 | Halka | **8 dilim, 7 palet girdisi** → 8. dilim (Dil / LLM) 1. dilimin (Embedding) rengini tekrar ediyor - sahibin ekran görüntüsünde görünüyor | `Charts.tsx` + ölçüm |
| 9 | Kapı | geçen **606 / 1 544 (%39,2)**, gated 6, başarısız 938 (6 gated depo `failed` içinde sayılıyor); geçişler `downloads ≥ 50` **570** + `likes ≥ 5` **36**; `org` / `samples` gerekçeleri **0** kez | `src/lib/classify/gate.ts` + canlı |
| 10 | Menü sayfayla çelişiyor | `?gate=all` ile sayfa başlığı **1 538** yazarken masa şeridi hâlâ **606** yazıyor (Ses 234'e karşı 30) | `curl` + HTML kazıma |
| 11 | İndirmeler | **1 303 / 1 544 (%84,4)** satırda > 0; p50 **38**, p90 **351**, max **119 265**; **ilk depo tüm indirmelerin %24,0'ı**, ilk 10 = %53,6 | canlı anlık görüntü |
| 12 | Seyrek alanlar | `paramsTotal` %7,0, `storageBytes` %30,3, `vramEstGb` %6,8, `license` %28,9, `cardMeta` %11,3, `sampleImages` %0,8, **`downloadsAtFirstSeen` %0,0** | canlı anlık görüntü |
| 13 | Yoğun alanlar | `runners` dolu **%69,7** (9 değer, transformers 668 → ExLlama 6), `gateReason` %100, `primaryCategory` %100 | canlı anlık görüntü |
| 14 | Haber akışı | 210 öğe - paper 150, runtime 30, community 25, release 5; **23** farklı `publishedAt` günü, 7–20 Eki arası her gün dolu | canlı anlık görüntü |
| 15 | Kategoriye göre geçiş oranı | embedding 183/228 (%80), vision 107/174 (%61), coding 122/230 (%53), video 70/165 (%42), llm 14/51 (%27), image 46/202 (%23), multimodal 34/149 (%23), audio 30/234 (%13), **robotik 0/111 (%0)** | canlı anlık görüntü |
| 16 | İndirme medyanı (`> 0`) | embedding 213, vision 72, coding 68, video 61, llm 32, audio 21, multimodal 20, image 19, robotik 12; geçen kümenin tamamı 197 | canlı anlık görüntü |
| 17 | Pencere sözlüğü | akış: `24h / 7d / 30d / 90d` (`lib/query.ts`); istatistik: `7 / 30 / 90 / 180` gün | kod |

---

## 2. Kusurlar

Her madde bugün okuyucunun görebildiği bir şey.

| # | Kusur | Kanıt |
|---|---|---|
| **D1** | **Pencere kontrolü hiçbir şey yapmıyor.** Dört seçenek de aynı 606 / 1 538'i döndürüyor çünkü her şey `firstSeenAt` ile filtreleniyor ve o alan üç günü kapsıyor. Başlıktaki `30d`, sayfanın verdiği tek söz ve yanlış. | #2, #3 |
| **D2** | **"Günlük hacim" ekosistemi değil, ingest koşularımızı ölçüyor.** 343 / 572 / 629 birer parti boyutu; 14 → 20 Eki arasındaki 6 günlük boşluk düz çizgi olarak çiziliyor. Crawler'ın takvimi modellerin özelliği gibi sunuluyor. | #3, #5 |
| **D3** | **Sıfır doldurma yok.** `getDailySeries` yalnızca satırı olan günleri üretiyor; 30 günlük pencerede 3 günlük veri sürekli bir 3 noktalı çizgi oluyor. Okuyucu boş günle eksik günü ayırt edemiyor. | `store.ts::getDailySeries` |
| **D4** | **Grafiğin ekseni, değeri, birimi yok.** SVG içinde ölçülen `texts: 0`: y ekseni yok, x etiketi yok, nokta değeri yok. Tek sayılar altyazıda. | #5 |
| **D5** | **Başlıkla veri çelişiyor.** `h1` *Kategori bazlı hacim* diyor; panel *Kategoriye göre modeller* diyip **sayı** basıyor. Sitenin tek sıralama metriği olan indirmeler sayfada hiç görünmüyor. | page.tsx |
| **D6** | **Halka bir rengi tekrar ediyor.** 8 dilim, 7 token: Dil / LLM, Embedding / RAG ile aynı pembeye boyanıyor. | #8 |
| **D7** | **Kapı görünmez.** Sayfa varsayılan olarak *Sadece geçenler*'i gösteriyor ve 1 544'ün 606'sının (%39,2) göründüğünü, neyin çıkarıldığını hiç söylemiyor. Robotik (111 takip, 0 geçen) çubuklardan sessizce kayboluyor - menünün listelediği bir kategori. | #9, #15 |
| **D8** | **Masa şeridi sayfayla çelişiyor.** `DeskNav` `filters` almadan çağrılıyor, yani hep 7 gün/kapı açık görünümü sayıyor; `?gate=all` ile aynı ekranda sayfa 1 538, şerit 606 diyor. | #10 |
| **D9** | **Hiçbir şey bağlantı değil.** Sayfanın ürettiği 0 bağlantı: "Ses 30" öğrenen okuyucu o 30 modele ulaşamıyor. | #7 |
| **D10** | **Tarih satırı ve yöntem yok.** Tek tazelik sinyali göreli "Veriler 20 dk önce yenilendi"; bütün işi sayı olan bir sayfa ne mutlak anlık görüntü saatini ne de her sayının neyi saydığını basıyor. | `EmptyState.tsx::DataNotice` |
| **D11** | **İki panel, tek sayı.** Sayılar ve payları 768 px kaplıyor; %100 kapsamlı dört boyut (kapı gerekçesi, çalıştırıcılar, oluşturma tarihi, haber akışı) sayfada yok. | #6, #13, #14 |
| **D12** | **Baskı kapsamını kaybediyor.** `@media print` `form`u gizliyor, yani basılan kâğıt sayıları hangi pencere ve kapının ürettiğini artık söylemiyor. | `globals.css` §print |

---

## 3. Kararlar

| # | Karar | Neden |
|---|---|---|
| **S1** | **İki adlı zaman ekseni.** `tracked` = `firstSeenAt` (akışın ekseni; kategori sayıları sekme rozetleriyle eşit kalsın diye korunur); `created` = `createdAt` (Hugging Face depo tarihi, günlük çözünürlüğü olan tek eksen). Her panel hangisini kullandığını tek kelimeyle basar. | D1, D2. Akış sözleşmesi değişemez ve crawler'ın takvimi sayfanın konusu değil. |
| **S2** | **Envanter panelleri `tracked`, zaman serisi `created` kullanır.** Zaman panelinin notu bunu açıkça söyler ve farkı basar ("pencerede 1 491 oluşturuldu" yanında "görünümde 606"), iki ekseni tek "hacim" kelimesinin arkasına saklamaz. | D2, D5. Bir dürüst cümle, sessizce karışmış iki eksenden iyidir. |
| **S3** | **Tek pencere sözlüğü, akışla ortak**: `24h / 7d / 30d / 90d`, `lib/query.ts`'ten `WINDOWS`, URL parametresi `?window=`. `?days=` ayrıştırılan takma ad olarak kalır. `gate=all` karar 9'un sınırını korur (≤ 30 gün) çünkü satır bağlantıları sayıyla anlaşan bir akış açmak zorunda. | D1, #17. 180 günlük takip yok; tek etkili değeri olan kontrol süslemedir. |
| **S4** | **Zaman serisi SVG değil HTML çubuk.** Her gün için bir `<div>`, yükseklik yüzdeyle, eksen etiketleri 11 px gerçek metin, `passed / failed` üst üste. | D4. 343 px'e ölçeklenen 1 200 birimlik viewBox, 13 px etiketi 3,7 px yapar; gerilmiş SVG içindeki metin büyütülerek düzeltilemez. |
| **S5** | **Eksik günler basılır, interpolate edilmez.** Her pencereyi sıfırla doldur; boş gün `--rule` renginde 2 px'lik bir çubuk ve sayısı `title`'ında. | D2, D3. |
| **S6** | **İlk 6 + *Diğer*, renkler sıraya göre.** Halkanın dilimleri ile tablonun renk kareleri tek eşlemeyi paylaşır; *Diğer* `--muted` ve efsane satırı üyelerini adlandırır. | D6, #8. |
| **S7** | **Kapının kendi paneli var ve kontrolden bağımsız.** "Kapı neyi tutuyor" her zaman penceredeki tüm satırlardan hesaplanır; böylece filtre açıkken bile filtrenin neyi sakladığı görünür. | D7, #9, #15. Aksi hâlde sayfa kendini iki durumundan yalnızca birinde açıklayabilir. |
| **S8** | **Her sayı, onu üreten görünümün bağlantısı.** Kategori satırları → `/c/[category]?window=…&gate=…`; çalıştırıcı satırları → `/models?runner=…`. Hiçbir sayı çıkmaz sokak değil. | D9. |
| **S9** | **Seyrek veri anlatılır, grafiklenmez.** Kapsamı %40'ın altındaki her panel tek cümle ya da hiç (bkz. §7). `downloadsAtFirstSeen` (%0,0), `heat.ts`'in %60 eşiği geçilene kadar dışarıda kalır. | #12. %7 kapsam üzerine çubuk grafiği, ekosistemin değil ayrıştırıcımızın resmidir. |
| **S10** | **Sayfa kendi yöntemini basar.** Tek küçük punto paragraf: anlık görüntü saati, önbellek sıklığı, iki eksen, `GATE_THRESHOLDS`'tan okunan kapı kuralı ve bilinçli olarak olmayanlar. | D10, D12. "Canlı" ve "trending" dilinden kaçınmayı da bu sağlar. |

---

## 4. Sayfa

```
STATS · İstatistik (kicker)
Model istatistikleri                                    Anlık görüntü 20 Eki 2026 · 12:17 UTC
Radar neyi takip ediyor, kapı neyi tutuyor ve hepsi ne zaman oluşturuldu.
────────────────────────────────────────────────────────────────────────────────────────
PENCERE [30g ▾]   KALİTE KAPISI (?) [Sadece geçenler ▾]   [Uygula]

BU SAYI
GÖRÜNÜMDEKİ MODEL  KAPIDAN GEÇEN     EN BÜYÜK KATEGORİ   ÇALIŞTIRICI ETİKETLİ
606                606 · %39,2       Embedding / RAG     571 · %94
1 544 içinden      (?)               183 · %30           (?)
────────────────────────────────────────────────────────────────────────────────────────
KATEGORİYE GÖRE MODELLER  ●                                    KATEGORİ PAYI
Embedding / RAG  ██████████████ 183   medyan 213               ◕  Embedding / RAG 183 · %30
Coding           █████████ 122        medyan 68                 ·  Coding         122 · %20
Vision / CV      ████████ 107         medyan 72                 ·  Vision / CV    107 · %18
Video            █████ 70             medyan 61                 ·  Video           70 · %12
Image            ███ 46               medyan 19                 ·  Image           46 · %8
Multimodal       ██ 34                medyan 20                 ·  Multimodal      34 · %6
Diğer (ses, llm) ██ 44                medyan 26                 ·  Diğer           44 · %7
not: sayılar pencerede Radar'ın ilk gördüğü modeller, kapı uygulanmış;
     etiket o kategorinin akışını açar.
────────────────────────────────────────────────────────────────────────────────────────
GÜNLÜK OLUŞTURULAN                              1 491 depo · bugün 606'sı geçiyor
   235 ┤                    ▇
       │              ▇  ▇  ▇  ▇
     0 ┴───────────────────────────────────
        21 Eyl     28 Eyl      5 Eki    12 Eki    20 Eki
not: Hugging Face `createdAt` - depo oluşturma, ilk görülme değil.
     Çubuklar deponun bugün kapıdan geçip geçmediğine göre bölünmüş.
────────────────────────────────────────────────────────────────────────────────────────
KAPI NEYİ TUTUYOR                     │  NEREDE ÇALIŞIYOR
[■■■■■■■■■■■■■■■■■■■■■□□□□□□□□□□□]     │  transformers  ████████ 668  →
indirmeler ≥50 570 · beğeni ≥5 36 ·   │  ComfyUI       ███ 227     →
başarısız 932 · gated 6               │  llama.cpp     ██ 205      →
                                      │  ONNX → MLX → Core ML → …
Embedding %80 ████████                │  not: bir model birden çok etiket
Ses %13 █▁                            │       taşıyabilir; %30'unda hiç yok.
Robotik %0 ▁                          │
────────────────────────────────────────────────────────────────────────────────────────
HABER AKIŞI                                  paper 150 · runtime 30 · community 25 · release 5
  30 ┤              ▇     ▇
   0 ┴────────────────────────────
not: haber `publishedAt`, türe göre bölünmüş; 10 dakikada bir yenilenir.
────────────────────────────────────────────────────────────────────────────────────────
YÖNTEM  Anlık görüntü 20 Eki 2026 12:17 UTC · önbellek 15 dk · pencere ve kapı yukarıdaki gibi ·
        "tracked" = Radar'ın ilk gördüğü (13 Eki →) · "created" = HF depo tarihi ·
        kapı ≥50 indirme veya ≥5 beğeniyle geçer (küratörlü kuruluş / örnek widget:
        bugün 0) · pencerede indirme geçmişi yok, bu yüzden büyüme kolonu yok.
```

### 4.1 Bölüm özellikleri

| § | Bölüm | Veri | Notlar / bağlantılar | Boş durum |
|---|---|---|---|---|
| 0 | Üst satır | `PageHeader` + `aside` içinde mutlak tarih | `Anlık görüntü 20 Eki 2026 · 12:17 UTC` (göreli "3s önce" değil) | - |
| 1 | Bu sayı (4 rakam) | `totals.inView`, `passRate`, `top`, `withRunner` | etiketler kapsamı taşır (`1 544 içinden`, `30g · sadece geçenler`); kalite-kapısı ve çalıştırıcı için `Term` | - |
| 2 | Kategoriye göre modeller | `categories[].count` (görünümde) + `medianDownloads` | satır = `/c/x?window&gate` bağlantısı; çubuk `count/max`; medyan yalnızca > 0 ise | "Bu pencerede kapıdan geçen model yok" + kapı kapalı görünüm bağlantısı |
| 3 | Kategori payı | ilk 6 + *Diğer*, `categories[].share` | §2 ile aynı renk karesi; *Diğer* üyelerini adlandırır | 2'den az kategori varsa gizli |
| 4 | Günlük oluşturulan | sıfır doldurulmuş `cadence[]`, `created` + `passed` | y işaretleri 0 / orta / max, 5 x etiketi, çubuk başına `<title>`, `<details>` sayı tablosu | "Bu pencerede depo oluşturulmadı" (bugün imkânsız: 24 saatte 272) |
| 5 | Kapı neyi tutuyor | `gate.byReason`, `categories[].tracked/passed/passRate` (kapıdan bağımsız), `GATE_THRESHOLDS` | %100 yığılmış çubuk + 9 satırlık oran tablosu; satırlar `gate=all` ile açılır | - |
| 6 | Nerede çalışıyor | `runners[]` (toplam + görünümdeki) | satırlar `/models?runner=…`; %69,7 kapsam ve çoklu etiket notu | "Bu pencerede çalıştırıcı etiketi yok" |
| 7 | Haber akışı (P4) | `wire[]`, `kind`'a göre sıfır doldurulmuş | `/news`, `/research` bağlantıları; 10 dakikalık sıklık yazılır | 0 öğe varsa gizli |
| 8 | Yöntem | yukarıdaki sayılar | küçük punto, `.section-note` boyutu; baskıda çıkar | - |

Dikey bütçe: 1440'ta ≤ 1 700 px (bugün 3 panel 1 007 px), 390'da ≤ 2 400 px. §2 + §3 tek `.stats-grid` satırında; §5 + §6 ikinci satırda.

---

## 5. Veri katmanı

Dosya sistemine dokunmadan test edilebilsin diye yeni saf modül `src/lib/stats.ts`:

```ts
export interface StatsRow {
  category: string;
  /** Geçerli görünümdeki (pencere + kapı) satırlar. */
  count: number;
  share: number;                 // count / görünümdeki toplam
  medianDownloads: number | null;// indirmesi > 0 olanlar üzerinden, yoksa null
  /** Kapıdan bağımsız, pencereyle sınırlı - yalnızca §5. */
  tracked: number;
  passed: number;
  passRate: number;
}

export interface StatsBoard {
  windowDays: number;
  gate: "passed" | "all";
  generatedAt: string | null;
  totals: {
    inView: number; tracked: number; gated: number;
    passRate: number; medianDownloads: number | null;
    withRunner: number;
    top: { category: string; count: number } | null;
  };
  categories: StatsRow[];
  gateReasons: Record<"downloads" | "likes" | "org" | "samples" | "failed", number> & { gated: number };
  cadence: Array<{ date: string; created: number; passed: number }>;   // sıfır doldurulmuş
  tracking: Array<{ date: string; count: number }>;                    // firstSeen, seyrek, not için
  runners: Array<{ runner: string; models: number; inView: number }>;
  wire: Array<{ date: string; paper: number; runtime: number; community: number; release: number }>;
}

export function buildStatsBoard(snapshot: StatsSnapshot, options: StatsOptions): StatsBoard;
export function fillDaily<T>(rows: Array<{ date: string } & T>, days: number, endIso: string): Array<{ date: string } & T>;
export function medianOf(values: number[]): number | null;
export function foldSlices(rows: StatsRow[], keep: number): Array<StatsRow & { members?: string[] }>;
```

- `buildStatsBoard` anlık görüntüyü **bir kez** dolaşır (bugün sayfa `filterModels`'ı iki kez, `DeskNav → getCategoryCounts` ise her istekte on kez daha çağırıyor).
- `store.ts` içindeki `getStatsBoard(days, options)` = `loadSnapshot()` + `buildStatsBoard` (tek 15 dakikalık önbellek okuması korunur).
- `getStats` / `getDailySeries` ince sarmalayıcı olarak kalır, böylece mevcut importlar kırılmaz; `getDailySeries` sıfır doldurma kazanır (tek başına D3'ü her yerde kapatır).
- `created` ekseninin pencere filtresi `buildStatsBoard` içinde yalnızca `cadence` için `createdAt`'e uygulanır. Diğer her şey `withinWindow(firstSeenAt)` kullanmaya devam eder, böylece `/stats` ile akış kayamaz.
- `endIso` = `snapshot.generatedAt`, `Date.now()` değil - önbellekteki sayfa anlık görüntüde olmayan bir kovayı basmamalı (ve testler deterministik olmalı).

`src/lib/query.ts` yeni `statsQuerySchema` kazanır:

```ts
window: z.enum(WINDOWS).catch("30d")   // istatistik varsayılanı 30g, akışınki 7g
days:   z.coerce.number().positive().optional()   // eski takma ad -> window
gate:   z.enum(["passed", "all"]).catch("passed")
```

sonra `normalizeStatsQuery()` `normalizeFeedQuery()`'i çağırır, böylece karar 9 (kapı `all` yalnızca ≤ 30 gün) burada farklı biçimde yeniden yazılamaz.

---

## 6. Bileşenler

| Dosya | Değişiklik |
|---|---|
| `src/app/[locale]/stats/page.tsx` | `getStatsBoard`'dan yeniden yazılır; tek `<form method="get">`; `DeskNav` artık `filters` alır (D8'i kapatır) |
| `src/components/ui/Charts.tsx` | `BarChart` → silinir (tek çağıran bu sayfa); `TrendChart` → silinir; `Donut` `foldSlices`, `swatches` eşlemesi, dilim başına `<title>` ve *Diğer* için `--muted` kazanır |
| `src/components/ui/DailyBars.tsx` | **yeni** - HTML/CSS yığılmış çubuklar, metin olarak y/x etiketleri, `<details>` sayı tablosu, `role="img"` + özet; SVG yok |
| `src/components/ui/RateBar.tsx` ya da `Meter`'ın kullanımı | §5 için %0–100 çubuk (`Meter` indirmeler için log ölçekli - **kullanılmaz**) |
| `src/components/ui/Stat.tsx` | değişmez; §1 dört tanesini çizgili bir bantta kullanır |
| `src/app/globals.css` | `.stats-grid` değişmez; `.bars-*` kuralları (N kolonlu grid, `align-items: end`) ve `@media print { details > * { display: block } }` eklenir, böylece §4 basılır |
| `src/i18n/dictionaries/{en,tr}.json` | +~30 anahtar (aşağıda), `stats.trend`→`stats.cadence`, `stats.bars`→`stats.categories`; eşitlik 175 → ~205 |

Yeni anahtarlar: `stats.lede`, `stats.dateline`, `stats.inView`, `stats.inViewHint`, `stats.passRate`, `stats.passRateHint`, `stats.top`, `stats.withRunner`, `stats.withRunnerHint`, `stats.categories`, `stats.categoriesNote`, `stats.share`, `stats.shareNote`, `stats.other`, `stats.otherMembers`, `stats.cadence`, `stats.cadenceNote`, `stats.created`, `stats.cadenceTotal`, `stats.gateTitle`, `stats.gateNote`, `stats.gateByDownloads`, `stats.gateByLikes`, `stats.gateFailed`, `stats.gated`, `stats.passRateCol`, `stats.trackedCol`, `stats.passedCol`, `stats.medianDownloads`, `stats.runnersTitle`, `stats.runnersNote`, `stats.wireTitle`, `stats.wireNote`, `stats.methodTitle`, `stats.methodBody`, `stats.trackingSince`, `stats.all`.

---

## 7. Bu sayfa neyi göstermeyecek (ve arkasındaki sayılar)

| Aday | Bugünkü kapsam | Karar |
|---|---|---|
| Boyut / parametre dağılımı | `paramsTotal` **%7,0**, `storageBytes` %30,3 | yöntem notunda tek cümle; grafik yok |
| VRAM kovaları | `vramEstGb` %6,8 | aynı |
| Lisans dağılımı | `license` %28,9 (1 544'ün 1 098'i null) | yöntem notunda tek cümle |
| Diller / temel modeller | `cardMeta` %11,3 (diller %5,1) | sayfada yok |
| Büyüme (`+Δ indirme`) | `downloadsAtFirstSeen` **%0,0** | **kolon yok**; `heat.ts`'in %60 eşiği açar, bu plan değil |
| Kategoriye göre indirme *payı* | toplam tek depo tarafından domine ediliyor (tüm indirmelerin %24'ü) | yalnızca medyan, tanımı basılı |
| "Trending" | `trendingScore` 1 544/1 544 null | kelime dışarıda kalır |

---

## 8. API

`/api/stats` tek çağrıda panoyu döndürür; sayfa ile API asla çelişemez:

```jsonc
GET /api/stats?window=30d&gate=passed
{
  "window": "30d", "windowDays": 30, "gate": "passed",
  "generatedAt": "2026-10-20T12:17:46.589Z",
  "totals": { "inView": 606, "tracked": 1538, "gated": 6, "passRate": 0.392,
              "medianDownloads": 197, "withRunner": 571,
              "top": { "category": "embedding", "count": 183 } },
  "categories": [ { "category": "embedding", "count": 183, "share": 0.302,
                    "medianDownloads": 213, "tracked": 228, "passed": 183, "passRate": 0.803 } ],
  "gateReasons": { "downloads": 570, "likes": 36, "org": 0, "samples": 0, "failed": 932, "gated": 6 },
  "cadence": [ { "date": "2026-10-20", "created": 111, "passed": 40 } ],
  "tracking": [ { "date": "2026-10-13", "count": 343 } ],
  "runners": [ { "runner": "transformers", "models": 668, "inView": 6 } ],
  "wire": [ { "date": "2026-10-20", "paper": 20, "runtime": 3, "community": 2, "release": 1 } ]
}
```

`stats` ve `series` (eski anahtarlar) **kaldırılır**: `grep`, `docs/*/PLAN.md` dışında tüketici bulmuyor; bu plan o satırları günceller. `Cache-Control: public, s-maxage=900` kalır.

---

## 9. Testler (`tests/stats.test.ts`, node:test, fixture anlık görüntü)

1. `fillDaily` tam `days` kova döndürür: artan, tekil, sıfır doldurulmuş ve girdi toplamını korur.
2. `fillDaily` `endIso` (anlık görüntü `generatedAt`) kullanır, duvar saatini değil - 2026-01-10 tarihli fixture 2026-01-10'da biten kovalar üretir.
3. `buildStatsBoard` toplamları: `Σ categories.tracked === totals.tracked`; `Σ categories.passed === totals.passed`; `Σ share ≈ 1`; `Σ gateReasons === tracked + gated`.
4. `cadence` `createdAt` okur, `firstSeenAt` değil (ikisinin bilerek farklı olduğu fixture - D2 regresyonu).
5. Fixture'da yalnızca 3 günlük veri varken 30 günlük pencerede 30 kova olur ve her kovada `created ≥ passed`.
6. 0 geçenli kategori `categories` içinde görünür (§5 için) ama katlanmış halka dilimlerinde görünmez.
7. `medianOf`: tek/çift sayı, sıfırları yok sayar, boşta `null`; `categories[].medianDownloads`, indirmesi > 0 satır yoksa `null`.
8. `foldSlices(rows, 6)`: toplam korunur, `Other.members` katlanan anahtarları listeler, çıktı ≤ 7 dilim.
9. `normalizeStatsQuery`: `?days=30` ≡ `?window=30d`; `?window=abc` → `30d`; `?gate=all&window=90d` → `passed` (karar 9), `?gate=all&window=30d` → `all`.
10. `runners`: her sayı `inView` + görünüm dışı toplamını aşmaz; `Σ runners.models ≥` etiketli satırlar (çoklu etiket), asla az değil.

Arayüz eşitliği birim testiyle değil, ölçüm betiğiyle doğrulanır (`scripts/` usulü): §2 başlığındaki sayı `Σ rows`'a eşit; §4 pencerenin her günü için bir çubuk; §2 en az 9 `/c/` bağlantısı üretir.

---

## 10. Aşamalar

| Aşama | Kapsam | Kabul (ölçülebilir) |
|---|---|---|
| **P0** | `lib/stats.ts` + sıfır doldurma + `statsQuerySchema` + testler; `/api/stats` yeni şekil; sayfa eski panelleri yeni panodan çizmeye devam eder | `npm test` yeşil (10 yeni); `curl "…/api/stats?window=30d"` → `totals.inView === 606` ve 30 `cadence` kovası; `npm run lint && npm run typecheck` temiz |
| **P1** | Tarih satırı, §1 rakamları, §2 tablosu, §3 halka katlaması, bağlantılar, `DeskNav filters` | `?gate=all` ile: şerit **1 538** ve Ses **234** basar (HTML kazıma); §2'de `/c/`'ye ≥ 9 bağlantı; halka dilimi ≤ 7 ve iki dilim aynı rengi paylaşmaz; 360/390/1440'ta 0 taşma; `/tr` dizeleri çevrili; baskıda pencere + kapı görünür |
| **P2** | §4 için `DailyBars` (HTML), yöntem notu, `TrendChart` silinir | `window=30d`'de 30 çubuk, `24h`'de 1; çubuklar toplamı `cadence.created`; §4 içinde **0** `<svg>`; §4 yüksekliği 1440'ta ≤ 260 px, 390'da ≤ 240 px; baskıda tüm çubuklar |
| **P3** | §5 kapı paneli + §6 çalıştırıcılar | kapı dilimleri 1 544'e toplanır; Robotik satırı 0/111 (%0) basar; gözle seçilen 3 çalıştırıcı bağlantısı `/models?runner=…` sayfasını basılan sayıya eşit toplamla açar |
| **P4** (opsiyonel) | §7 haber akışı | 30 kova; türler toplamı `countNews({window:30})`'a eşit; 0 öğede panel gizli |

---

## 11. Doğrulama

```bash
npm run dev
npx tsx scripts/fetch-snapshot.ts                    # sunulan anlık görüntü, ölçülmüş
curl -s "localhost:3000/api/stats?window=7d"  | jq '.totals'   # 606 / 1538
curl -s "localhost:3000/api/stats?window=90d" | jq '.totals'   # aynı, tasarım gereği
curl -s "localhost:3000/en/stats?gate=all"    | grep -c '234'   # menü sayfayla anlaşıyor
node .shots/measure-stats-page.mjs "http://localhost:3000/en/stats?window=30d" "1440,390"
npx tsx scripts/check-overflow.ts http://localhost:3000/tr/stats 360
npx tsx scripts/check-nav-current.ts http://localhost:3000/tr/stats
npx tsx scripts/screenshot.ts http://localhost:3000/tr/stats .shots/v4-stats-1440.png 1440 2600 light
npm test && npm run lint && npm run typecheck
```

DESIGN-V2/V3'ten devralınan kurallar: masaüstü metrikleriyle ölç; ölçmeden önce sayfa işaretçisini doğrula; API'nin yeniden üretemediği hiçbir sayıyı iddia etme.

---

## 12. Riskler

| Risk | Önlem |
|---|---|
| Altı panel telefonu 2,4 bin px yapar | §2/§5/§6 `sm` altında üçüncü kolonu düşürür; §6 ilk 5 + bağlantı gösterir; §7 opsiyonel |
| `createdAt` "yayın tarihi" diye okunur | not "depo oluşturma tarihi, HF'nin kendi zaman damgası, bizim ilk görüşümüz değil" der; tablodaki fiil `created` |
| Pencere anlamı yer imlerini bozar | `?days=` takma ad olarak ayrıştırılır; `?window=` kanonik; rota taşınmaz |
| İki eksen okuyucuyu şaşırtır | panel başına tek fiil (`in view` / `tracked` / `created` / `passes`) ve §8 ikisini de yazar |
| 90 günde `gate=all` hata gibi okunur (karar 9 kısıtlıyor) | §5 kapıdan bağımsız, yani filtrenin sakladığı her pencerede görünür; kontrol sessizce URL'i yok saymak yerine *Sadece geçenler*'i gösterir |
| İndirmeler kalite sinyali gibi görünür | §2 medyanı tanımıyla basar (`indirmesi > 0 satırlar`), asla toplam; ilk deponun %24 yoğunluğu yöntem notunda |
| Planın sayıları eskir | §1'deki her rakam §11'deki komutlarla yeniden üretilir; belge ölçtüğü anlık görüntüyü adlandırır |

Geri alma: `page.tsx` tek dosya; `Charts.tsx` içinde `Donut` kalır; `TrendChart`/`BarChart` yalnızca P2'de, §4 geçtikten sonra silinir.

---

## 13. Açık sorular (sahibin kararı)

1. **`h1`**: *Model istatistikleri* (somut, arama terimini korur) mi *Veri Masası* (DESIGN-V3 adlandırmasına uyar) mı? Plan birincisini varsayıyor.
2. **Varsayılan pencere**: 30 gün mü kalsın (`created` ekseninde 49 gün var) yoksa akışın 7 gününe mi eşitlensin? Plan 30 günü varsayıyor.
3. **Halka**: sayfanın tek "gravürü" olarak (ilk 6 + *Diğer*) kalsın mı, yoksa atılıp §2'ye pay kolonu mu eklensin? Kalması varsayılıyor.
4. **§7 haber akışı**: P1–P3 ile birlikte mi çıksın (ikinci dürüst günlük seri ve masaları birbirine bağlıyor) yoksa sonraya mı?
5. **API kırılması**: `/api/stats`'tan `stats`/`series` anahtarlarının kaldırılması uygun mu (kodda tüketici bulunamadı; `docs/*/PLAN.md` burada güncellendi)?

---

## 14. Uygulanınca güncellenecek belgeler

- `docs/en|tr/DESIGN-V3.md` §7.1, `/stats` satırı → "Data Desk per [STATS-PLAN.md]".
- `docs/en|tr/PLAN.md` §13 rota satırı ("per-category volume, weekly chart") ve §15 API satırı (`GET /api/stats?days=30`).
- `docs/en|tr/DECISIONS.md`: **S1** (iki eksen) ve **S3** (tek pencere sözlüğü) için bir kayıt.

---

## 15. Uygulama kaydı - 2026-10-20

> Değişiklikten **sonra** ölçüldü: sunulan anlık görüntü (`generatedAt 2026-10-20T12:17:46Z`, **1 544 model / 210 haber**), `.shots/measure-stats-page.mjs` (CDP) ve `curl /api/stats`. `npm test` **133/133**, `lint` ve `typecheck` temiz.

| Plan maddesi | Sonuç (ölçüldü) |
|---|---|
| **S1/S2** iki adlı eksen | `src/lib/stats.ts` - `buildStatsBoard`, `fillDaily`, `foldSlices`, `medianOf`; `store.ts` içindeki `getStatsBoard()` anlık görüntüyü bir kez okur. `window=30d` → görünümde **606**, takipte **1 538**, gated 6, geçiş **%39,4**, medyan **197**, çalıştırıcı etiketli **571**; `cadence` 30 kova, toplam **1 491** oluşturuldu; `wire` 210. 10 yeni test (toplam 133) |
| **S3** tek pencere sözlüğü | `lib/query.ts` içinde `parseStatsQuery`: `?window=24h/7d/30d/90d`, `?days=` takma ad (30 → 30d, 180 → 90d). `gate=all` bu toplu yüzeyde 30 gün içinde `normalizeFeedQuery(input, { aggregate: true })` ile serbest; akışın karar 9'u değişmedi |
| **S4/S5** HTML çubuklar | `DailyBars.tsx`: 30 günde 30 çubuk, 24 saatte 1, 90 günde 90; panelde **0** `<svg>`, sayfada **0** `<svg text>`; y işaretleri 235 / 118 / 0, beş x etiketi; boş gün `--rule` renginde 2 px; sayılar kapalı bir `<details>` içinde |
| **S6** katlama + palet | 8 veya 9 kategori **6 + Diğer** olur; halkada en fazla 7 dilim var ve *Diğer* paletin son girdisini alır, böylece iki görünür dilim aynı rengi paylaşmaz (eski 8 dilim/7 renk hatası) |
| **S7** kapı paneli | her zaman kapıdan bağımsız: indirme **570** · beğeni **36** · başarısız **932** · gated **6** = **1 544**; kategori oranı her pencerede görünür, robotik **0/111 (%0)** |
| **S8** bağlantılar | `/c/…`'ye 18 bağlantı (9 tablo satırı + 9 masa öğesi) ve `/models?runner=…`'a 9; her §2 ve §6 satırı sayısını üreten akışı açar |
| **S9** seyrek veri | parametre / boyut / lisans / `cardMeta` / `downloadsAtFirstSeen` (%0,0) hiç grafiklenmez; yöntem notu bunu söyler |
| **S10** yöntem | §8 anlık görüntü saatini, 15 dakikalık önbelleği, iki ekseni, `GATE_THRESHOLDS`'tan okunan eşikleri ve büyüme kolonunun neden yok olduğunu basar |
| Yerleşim | 1440: ana alan **2 214 px**, belge 2 451; 390: belge 3 734. Dört durumda (30g geçen, 30g hepsi, `tr` 24s hepsi, `tr` 90g hepsi) 360 / 390 / 1440'ta **0 yatay taşma** |
| Menü | `/tr/stats` sayfası `İstatistik:page` işaretler; `check-nav-current.ts` 14 rotada geçer |
| Baskı | menü, formlar ve `<details>` düğmesi düşer; eksen, efsaneler, altyazılar ve yöntem notu kalır - 1 000 px genişlikte 2 835 px'lik sayfa |

### 15.1 Plandan sapmalar (ve nedenleri)

| Planlanan | İndi | Neden |
|---|---|---|
| `?gate=all` ile masa şeridi 1 538 ve Ses 234 basar | şerit *Hepsi* için **606**, masalar için kapı açık sayıları (**Ses 231**) basar | `getCategoryCounts()` kategorisiz anahtara karar 9'u uygular, yani *Hepsi* rozeti gerçekte açtığı `/models` akışını (606) tarif eder. Aynı asimetri bugün `/models?gate=all&category=…` sayfasında da var; değiştirmek menünün "rozet, bağlantının açtığı satır sayısıdır" kuralını bozar. Sessizce yamalanmadı, açık madde olarak kaydedildi |
| Dikey bütçe 1440'ta ≤ 1 700 px / 390'da ≤ 2 400 | **2 214 / 3 734** | notlarıyla altı panel; uygulanan kırpma (`sm` altında çubuklar ve medyanlar gizli, `<details>` kapalı) ~180 px kazandırıyor, gerisi sayfanın var oluş sebebi. Sayıyı tutturmak için panel atmak, bilgiyi boşlukla değişmek olurdu |
| Baskı sayı tablosunu basar | `<details>` artık `print:hidden` | Chrome 155'te kapalı bir `<details>` CSS'ten açılamıyor (`::details-content` yanıt vermedi; baskı ortamında tablo yüksekliği 0 ölçüldü) ve summary bir kontrol olarak gizli. Kâğıt boş kutu yerine çubukları + ekseni + efsaneyi + altyazıyı alır |
| `getStats` / `getDailySeries` sarmalayıcı olarak kalır | **silindi** | yeniden yazımdan sonra çağıranları kalmadı; ölü sarmalayıcı bu projenin kaldırdığı türden doğrulanamaz bir yüzey. `/api/stats` da aynı değişiklikte yeniden şekillendi (kodda tüketici yoktu) |
| §5 satırları `gate=all` ile kategorisine bağlanır | §5 satırları **bağlantı değil** | 30 günün üzerinde akış `gate=all`'ı kısıtlar; bağlantı, sayının saydığından farklı bir küme açardı. Her kategori bir panel yukarıda, §2'de bağlantı |
| "606 / 1 544 (%39,2)" | "606 / 1 538 (**%39,4**)" | `tracked` gated depoları dışlar (akışa hiç girmezler); altı gated satırı kendi diliminde. §1'deki 1 544 / 938 onları `failed` içinde sayar |
| Kategori başına medyan indirme | **görünümün** medyanı | tablo geçerli görünümü tarif eder, medyanı da görünümdeki `downloads > 0` satırlar üzerinden alır (embedding görünümde 218, tüm satırlarda 213) |

### 15.2 Uygularken bulunan gerçek kusurlar (burada düzeltildi)

1. **Halka efsanesi belgeyi 360 px'lik görünümün 92 px dışına taşırdı.** Efsanedeki `min-w-[9rem]`, otomatik min-content tabanını kaldırdığı için satırlar 183 px'lik yuvada 276 px genişliğinde çizildi (`gate=all` ile `docScroll` 452, `client` 360 ölçüldü). Liste ve satıra `min-w-0` eklendi - DESIGN-V3 §0.2 #1 ile aynı `min-width: auto` ailesi.
2. **`failedColor` ilk kullanımından sonra tanımlıydı**, her render `ReferenceError: Cannot access 'failedColor' before initialization` ile düştü ve rota 500 verdi. TypeScript bir callback içindeki TDZ okumasını yakalamaz; sayfayı yüklemek yakaladı.
3. **Kapı tablosu ortak `.stats-grid` (`1fr auto`) tarafından sıkıştırıldı**: Geçiş oranı başlığı iki satıra kırıldı ve sayılar çubuğa sokuldu. O satır artık kendi `1.25fr / 1fr` ızgarasında.
4. **§2'deki satır içi çubuk 390 px'te satır ayırıcı gibi okunuyordu** (her etiketin altında 256 px'lik çizgi). Kendi kolonuna taşındı, `sm` altında gizli.
5. **`formatNumber` 1 544'ü "1.5k" yapıyor**, "1 544'ün 606'sı" ifadesini taşıyamaz; bu yüzden `lib/format.ts`'e `formatCount` / `formatPercent` eklendi.

### 15.3 Açık maddeler

- **`?gate=all` altında masa şeridinin *Hepsi* rozeti** (15.1) - istatistik sayfasının değil, menünün kararı.
- **Ingest boşluğu** (15–19 Eki koşu yok) hâlâ duruyor; kadans paneli `createdAt` okuduğu için onu gizler, yöntem notundaki "13 Eki'den beri" ise üç `firstSeenAt` kovasından gelir.
- **Mobil uzunluk** (3 734 px): sahip 2 400'ün altını isterse atılacak panel haber akışı (§7).
