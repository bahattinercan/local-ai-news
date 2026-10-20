# SEO planı — 252 ilan edilen URL'den bulunabilir bir arşive

> İngilizce kaynak: [docs/en/SEO-PLAN.md](../en/SEO-PLAN.md)
> Durum: **plan**, 2026-10-20'de yazıldı. §11'deki hiçbir madde henüz uygulanmadı.
> Üretim dağıtımına (`https://local-ai-news.vercel.app`, uygulamanın kendi ilan ettiği origin) ve `:3000`'deki yerel `next dev` sunucusuna karşı ölçüldü; sunulan snapshot `generatedAt 2026-10-20T20:42:42Z` — **1 402 model, 529'u kalite kapısını geçmiş, 210 haber** (repodaki yedek: 915 / 347 / 104).
> Kapsam: taranabilirlik, dizin politikası, metadata, yapısal veri, içerik derinliği, talebi yakalama. Kapsam dışı: ücretli reklam, bağlantı satın alma, CMS taşıma, 1 400 varlık sayfasının makine çevirisi.
>
> **Revizyon 2 (2026-10-20):** rakip/SERP kanıtı (§2.1), kazanma koşullarıyla sorgu portföyü (§2.2), gerçekçi SERP özellikleri listesi (§2.3), alan adı taşıma runbook'u (§3.5), içerik kalite rubriği (§7.7), iç bağlantı matrisi (§8.1), olay enstrümantasyonu ve dizin hızlandırıcıları (§10.4–10.6), 90 günlük takvim (§11.5), bağlantı kazanımı (§11.6), budama (§11.7) ve dosya düzeyinde uygulama haritası (§16) eklendi. Üç önceki varsayım düzeltildi: bir model sayfası puanlama olmadan Software App zengin sonucu kazanamaz; FAQ/HowTo işaretlemesi zengin sonuç kaldıracı değildir; genel bir VRAM hesaplayıcı P2 farklılaştırıcısı olamayacak kadar kalabalıktır.

---

## 0. Özet

Ürünün zor kısmı zaten var: benzersiz bir veri kümesi, dokuz kategori masası, sözlük, istatistik masası, haber, RSS, JSON-LD ve iki dil. Tarayıcının bunu okuyabilmesini sağlayan tesisat ise yok.

- **Ölçtüğümüz her içerik rotası aynı `<title>` ve aynı açıklamayı döndürüyor.** Üretimde (2026-10-20) `/`, `/models`, `/c/llm`, `/m/…`, `/news`, `/glossary/gguf` ve `/stats` ölçüldü: yedisi de `OpenWeight Radar — New open-weight models you can run locally` döndürüyor. Rota düzeyinde `generateMetadata` yalnızca `/compare`'da var (`[locale]` layout'u site geneli tek değeri sağlıyor); TR'de yalnızca kabuk tagline'ı değişiyor.
- **Hiçbir rotada canonical, hreflang, Open Graph veya Twitter card yok.** Ölçüm: `/en` üzerinde 0 `rel="canonical"`, 0 `hreflang`, 0 `property="og:*"`.
- **Sitemap 252 URL ilan ediyor ve sıfır model sayfası içeriyor.** Locale başına 1 402 model sayfası var — **2 804 URL yapısal olarak görünmez**. Haber listesi ayrıca 200'de sabitlenmiş, oysa sunulan snapshot'ta 210 öğe var; yani en az 10 sayfa hiç ilan edilemiyor.
- **Var olmayan model, haber ve kategori URL'leri `200` dönüyor** — GSC'nin "soft 404" olarak raporlayacağı üç sınıf.
- **Locale yönlendirmeleri `307`**, `308` değil; hem `/` hem de prefix'siz yollar için.
- **Her HTML yanıtı `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.** ISR yok, CDN isabeti yok, tarayıcı ve okur için en kötü TTFB.
- **Sunulan snapshot'ta 0 model kartı özeti var.** Modellerin %7,5'i parametre, %31'i lisans, %18'i dosya bildiriyor. Model sayfalarının çoğu birkaç `—` satırlı spec ızgarası ve model hakkında tek cümle değil.
- **RSS öğeleri site dışına bağlanıyor** (`huggingface.co`, `github.com`); yem, sitenin zaten ürettiği 210 kanonik detay sayfasından okuru ve bağlantı değerini uzaklaştırıyor.
- **Kodun kendi varsayılanındaki marka alan adı (`openweightradar.com`) NXDOMAIN.** Üretim yalnızca `NEXT_PUBLIC_SITE_URL` `vercel.app` hostunu gösterdiği için çalışıyor.

Plan bilinçli olarak URL sayısına göre değil, kaldıraca göre sıralı: **P0 siteyi taranabilir ve ölçülebilir yapar (günler), P1 neyin dizine girmeyi hak ettiğini tanımlar (bir hafta), P2 gerçekten sıralanabilecek içeriği ekler (iki hafta), P3 bağlantı kazanır ve iterasyon yapar.** Başarı üretilen sayfa sayısıyla değil, GSC kapsamı ve gösterimlerle ölçülür.

---

## 1. Tarayıcı bugün ne görüyor

### 1.1 Yöntem

| Ne | Nerede / komut |
|---|---|
| Üretim yüzeyi | `https://local-ai-news.vercel.app` (çalışan uygulamanın ilan ettiği host) |
| Yerel yüzey | `:3000`'de `next dev`, yayınlanmış Blob snapshot `2026-10-20T20:42:42Z` |
| Head çıkarımı | `curl -s <url> \| rg -o '<title>\|<meta name="description"\|rel="canonical"\|hreflang\|property="og:'` |
| Sitemap | `curl -s <origin>/sitemap.xml \| rg -c '<url>'` ve `\| rg -c '/m/'` |
| Durum sınıfları | Geçerli ve geçersiz varyantlar için `curl -s -o /dev/null -w '%{http_code}'` |
| Snapshot kapsamı | `.seo-probe.ts` (geçici) → `.env` ile `loadSnapshot()`, boş olmayan alanları sayar |
| Yönlendirme / önbellek | `curl -sI`, `curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}'` |

### 1.2 Üretim ne döndürüyor

| Rota | Doküman başlığı | Canonical | hreflang | OG/Twitter | Durum |
|---|---|---|---|---|---|
| `/` | site başlığı | — | — | — | `307 → /en` |
| `/en` | site başlığı | — | — | — | 200 |
| `/en/models` | site başlığı | — | — | — | 200 |
| `/en/c/llm` | site başlığı | — | — | — | 200 |
| `/en/m/realrebelai-MOSS-Imagine_ComfyUI` | site başlığı | — | — | — | 200 |
| `/en/news` | site başlığı | — | — | — | 200 |
| `/en/glossary/gguf` | site başlığı | — | — | — | 200 |
| `/en/stats` | site başlığı | — | — | — | 200 |
| `/en/compare?ids=…` | ikili başlığı | var | — | — | 200, `noindex` |
| `/en/m/does-not-exist` | site başlığı | — | — | — | **200 (soft 404)** |
| `/en/n/does-not-exist` | site başlığı | — | — | — | **200 (soft 404)** |
| `/en/c/notacategory` | site başlığı | — | — | — | **200 (soft 404)** |
| `/en/glossary/nope` | 404 sayfası | — | — | — | 404 ✓ |
| `/models` (locale'siz) | — | — | — | — | `307 → /en/models` |

### 1.3 Ölçülmüş kusurlar

| # | Kusur | Kanıt | Arama etkisi | Faz |
|---|---|---|---|---|
| **D1** | Her rota için tek title/description | 7/7 rota aynı | Google başlığı yeniden yazar; sayfalar birbiriyle yarışır; CTR çöker | P0 |
| **D2** | Canonical etiketi yok | Her rotada 0 | Sorgu permütasyonları (`window/sort/gate/runner/maxParams/license/q/page`) ayrı doküman gibi görünür | P0 |
| **D3** | hreflang ve `x-default` yok | 0 `hreflang` bağlantısı | EN/TR çiftleri yarışır; TR sayfalar EN'nin kopyası sayılabilir | P0 |
| **D4** | OG/Twitter metadata yok | 0 `og:*`, 0 `twitter:*` | Paylaşılan bağlantılar çıplak URL olarak görünür; görsel ve başlık yok | P0 |
| **D5** | Sitemap her model sayfasını atlıyor | 252 URL, **0**'ında `/m/`; 2 804 model URL'si var | 2 804 URL yalnızca derin sayfalamaya ve iç bağlantılara bağlı | P0 |
| **D6** | Sitemap haberi 200'de kesiyor, model `lastmod` göndermiyor | 210 haber sayfası; 200 `<lastmod>` (hepsi haber) | 10 sayfa düşüyor; modeller için yeniden tarama önceliği kör | P1 |
| **D7** | Soft 404'ler | 3/3 geçersiz model/haber/kategori probu 200 dönüyor | Dizin şişmesi; GSC "soft 404"; tarama bütçesi israfı | P0 |
| **D8** | Locale yönlendirmeleri 307 | `/` ve `/models` → 307 | Geçici yönlendirmeler sinyalleri 308 kadar güçlü birleştirmez | P0 |
| **D9** | Sorgu URL'lerinde dizin politikası yok | `/models?window=30d&sort=downloads`, `?page=2`, `?runner=ollama` hepsi 200, canonical yok | Pratikte sonsuz kopya URL uzayı | P1 |
| **D10** | Her HTML yanıtında `no-store` | `/en` ve model sayfasında `Cache-Control: private, no-cache, no-store…` | CDN önbelleği yok, yavaş TTFB/LCP, daha fazla tarayıcı baskısı | P1 |
| **D11** | RSS site dışına bağlanıyor | Öğe başına `<link>https://huggingface.co/…</link>` | Yem okuyucuları kanonik detay sayfasına hiç ulaşmıyor; iç bağlantı değeri yok | P1 |
| **D12** | JSON-LD ince veya site dışını gösteriyor | model `CreativeWork` `url` = HF; haber `NewsArticle` `url` = dış kaynak; liste `ItemList` dış URL'ler; `WebSite`/`Organization` yok; model/haberde breadcrumb yok | Zayıf varlık anlayışı; breadcrumb/sitelink uygunluğu yok | P1 |
| **D13** | Model sayfalarında düzyazı yok | sunulan snapshot: `cardSummary` **0/1 402**, params **105 (%7,5)**, lisans **434 (%31)**, dosya **254 (%18,1)**, quantization **304 (%21,7)**, depolama **466 (%33,2)** | Ölçekte ince/neredeyse kopya sayfalar; uzun kuyruk sorguları için sıralanacak içerik yok | P2 |
| **D14** | Doğrulama, analitik veya OG görseli yok | `google-site-verification` yok, Bing token'ı yok, analitik betiği yok, `opengraph-image` rotası yok | Aksiyon alınacak veri yok; ölçüm döngüsü yok | P0 |
| **D15** | Marka alan adı çözümlenmiyor | `openweightradar.com` → NXDOMAIN; üretim `local-ai-news.vercel.app` kullanıyor | Otorite paylaşılan bir `*.vercel.app` hostunda birikir, üründe değil | P0 (sahip) |

### 1.4 Zaten doğru olanlar — bozmayın

- Locale önekli rotalar ve `<html lang>`; sözlükler tek string kaynağı.
- Rota başına bir `<h1>`; gerçek sayfa tipleri (ön sayfa, dizin, kategori, model, haber, sözlük, istatistik, karşılaştırma).
- Sözlük JSON-LD'si sitenin en iyisi: `DefinedTerm` + `BreadcrumbList`, 15 madde × 2 locale.
- `/compare` bu planın genelleştirdiği deseni zaten uyguluyor: tekilleştirilmiş canonical, id permütasyonlarında `noindex`, `generateMetadata`.
- `sitemap.ts`, `robots.ts`, `feed.rss`, `icon.svg`/`apple-icon.png` var ve 200 dönüyor.
- `middleware.ts` zaten `/sitemap.xml`, `/robots.txt`, `/feed.rss` ve statik dosyaları locale yönlendirmesinden muaf tutan listeye sahip.

### 1.5 İçerik envanteri (sunulan snapshot, 2026-10-20)

| Yüzey | Bugünkü URL | Dizine uygun (öneri §3) | Bugünkü benzersiz düzyazı |
|---|---|---|---|
| Ön sayfa + dizin + 9 kategori + haber/araştırma/istatistik/karşılaştırma/sözlük | 16 × 2 = 32 | 32 | kategori sayfaları: tek sözlük satırı, kategoriye özel giriş yok |
| Sözlük maddeleri | 15 × 2 = 30 | 30 | güçlü (tanım + kanıt + hesaplayıcı) |
| Model sayfaları | 1 402 × 2 = 2 804 | **430 × 2 = 860** bugün → kart doldurma sonrası 529 × 2 | yok (0 özet) |
| Haber detayları | 210 × 2 = 420 | 420 | medyan özet 1 404 karakter, p10 207 |
| Toplam | **3 286** | **1 342** bugün → kart doldurma sonrası 1 540 | |

Kapıyı geçen model: **529**. Bunlardan **430**'u `params/license/library/storage/vram/runners/quantizations/files` alanlarından en az dördünü bildiriyor; **324**'ü beş veya daha fazlasını. `cardSummary` sunulan snapshot'ta **0**; repodaki yedekte hâlâ 24 var, daha eski bir ingest'ten (§7.1 bütçe aritmetiğini açıklıyor).

---

## 2. Strateji ve kararlar

| # | Karar | Gerekçe |
|---|---|---|
| **S1** | **Gerçek alan adında tek kanonik host.** `openweightradar.com`'u (veya seçilen alternatifi) bağla, `*.vercel.app` → 308, `NEXT_PUBLIC_SITE_URL` özel origin olsun. | Otorite paylaşılan bir önizleme hostunda birikmez; koddaki varsayılan marka alan adı bugün NXDOMAIN. |
| **S2** | **Her rota `generateMetadata` dışa aktarır.** Paylaşılan yardımcılar `src/lib/seo.ts`'de; `metadataBase` bir kez `[locale]/layout.tsx`'te. | Tüm siteye tek başlık, sayfa içi en büyük kusur. |
| **S3** | **İki locale çeviridir, ayna değil.** EN kanonik varsayılan (`x-default`), TR çevrilmiş başlık/açıklama ve kategori/sözlük/rehber sayfalarında gerçek TR metin alır; varlık adları çevrilmez. | hreflang ancak alternatif gerçekten farklı bir kitleye hitap ediyorsa yardımcı olur; farklı kabukla aynı sayfa değil. |
| **S4** | **Dizin politikası bir yüklemdir, umut değil.** Her rota tipinin açık bir `isIndexable*()` fonksiyonu ve birim testi var; `noindex` URL'ler sitemap'e girmez. | 1 400 ince sayfa 430 faydalı sayfadan kötüdür. Canonical tek başına tarama israfını durdurmaz. |
| **S5** | **Sitemap keşif sözleşmesidir.** Yalnızca 200 + dizine uygun URL, `lastModified` ile; tipe göre bölünmüş; sorgu dizesi yok. | Mevcut sitemap, sitenin en büyük içerik tipini atlayan kısmi bir döküm. |
| **S6** | **Yapısal veri iç sayfayı tanımlar.** `url`/`mainEntityOfPage` Radar URL'leri; HF/GitHub `sameAs`/`isBasedOn` içinde. | Google dizine aldığı sayfayı anlamalı, dış kaynağı değil. |
| **S7** | **Programatik ölçekten önce içerik derinliği.** `[kategori] × [VRAM kademesi]` matrisi yok. P2'de en fazla 12 küratörlü talep sayfası; her biri okurun başka yerde bulamayacağı veriyle. | İnce programatik sayfalar yeni bir alan adını kaybetmenin en hızlı yoludur. |
| **S8** | **HTML için ISR, yalnızca `/api` için `no-store`.** Liste/haberde `revalidate = 300`, model/sitemap'te `900`; snapshot fetch'i önbelleklenir, `no-store` değil. | Ingest 10 dakikada bir çalışıyor; 5–15 dakikalık önbellek gereğinden taze ve TTFB cezasını kaldırır. |
| **S9** | **RSS bir iç üründür.** Öğeler `/n/{id}`'ye bağlanır; kaynak bir atıf, hedef değil. | Yem oturum ve bağlantı üretmeli, GitHub'a devretmemeli. |
| **S10** | **SEO gerilemesi CI'ı düşürür.** `scripts/seo-audit.ts` başlıkları, canonical'ları, hreflang karşılıklılığını, sitemap/dizin tutarlılığını, soft 404'leri ve JSON-LD ayrıştırmasını doğrular. | Repo sınıflandırmayı zaten `classify-check` ile kapıya bağlıyor; SEO aynı muameleyi hak ediyor. |

### 2.1 SERP gerçeği: bu sorguları bugün kim sahipleniyor

Kanıt: 2026-10-20'de çok sorgulu bir arama anlık görüntüsü aşağıdaki alan adlarını yüzeye çıkardı. Bu bir **sıralama denetimi değil**; yeni bir alan adının yenmesi gereken içerik tiplerinin ve mevcut oyuncuların haritası. Kullanılan sorgular: `open weight models list tracker`, `local llm vram calculator`, `yerel yapay zeka modeli çalıştırma`. P2 öncesi tekrar çalıştır ve sonucu §17'ye yaz.

| Alan adı / ürün | Bugün neyi sahipleniyor | Gücü | Bizim kullanacağımız boşluk |
|---|---|---|---|
| **Hugging Face** (`huggingface.co`) | Birinci taraf model sayfaları, `/<org>/<model>` sorguları, dokümanlar | Alan adı otoritesi; kanonik kaynak | Yerel uyum kararı yok: runner komutu, quant/bağlamda VRAM, dosya boyutları, kapı, modeller arası karşılaştırma |
| **Ollama library** (`ollama.com/library`) | "run <model> ollama", `ollama run` sorguları | Marka + tek komut UX'i | Yalnızca Ollama uyumlu modeller; safetensors/MLX/vLLM kapsamı, VRAM veya lisans uyumu yok |
| **LM Studio / llama.cpp dokümanları** | GUI ve runtime kurulum sorguları | Ürün dokümanı ve güven | Katalog değiller; tazelik ve modeller arası veri yok |
| **NLP.COM.AI models** | "open weight models" kataloğu, aylık sürüm arşivleri | Derin model başına düzyazı, mimari, lisanslar, makaleler | Metin-LLM merkezli; runner/VRAM/quantization uyumu ve görüntü/video/ses genişliği yok |
| **The Open Weights, Open Model Weights, LLM Watch, Optinest, AI Release Tracker** | Sürüm defterleri, aile değişiklikleri, kanıt geçmişleri | Yapılı kayıtlar, editoryal özetler, tarih kapsamı | Çoğunlukla metin LLM'leri; yerel çalıştırma katmanı yok; bazıları JS ağırlıklı ve tarayıcı için ince |
| **FitLLM, LLMeter, VRAMCalculator, willitrunai, apxml, looot, InsiderLLM, flaviocopes.com** | "vram calculator", "will it fit" | Adanmış araçlar, donanım ön ayarları | Taze model kataloğu olmayan araçlar; komut + lisans + dosya listesi olan model sayfası yok |
| **GitHub `awesome-*` listeleri, r/LocalLLaMA** | Küratörlü bağlantılar ve topluluk önerileri | Güven ve bağlantılar | Statik, eski, yapısız |

Bunun anlamı:

1. **"Bir açık ağırlıklı model listesi daha" olarak konumlanma.** Liste artık standart; yerel uyum katmanı kama.
2. **Genel bir VRAM hesaplayıcıyla öne çıkma.** Sekiz cilalı hesaplayıcı zaten var. Model başına sayfalarla öne çık: "çalıştırabilir miyim, hangi komutla, hangi quant'ta, ne kadar VRAM'de, hangi lisansta". Hesaplayıcı bu sayfaların içinde bir özellik, ürün değil.
3. **Genişlik gerçek bir farklılaştırıcı.** Mevcut oyuncular metin-LLM katalogları; dokuz modalite (görüntü, video, ses, kod, robotik, embedding, görü, multimodal, LLM) hiçbirinin anlatmadığı bir hikâye.
4. **Türkçede veri odaklı yerel-AI kataloğu görünmüyor**, yalnızca genel eğitimler (DataCamp, Microsoft Learn, Octopi). En ucuz uluslararası niş bu.

### 2.2 Sorgu portföyü ve kazanma koşulları

Hiçbir anahtar kelime hacmi iddia edilmiyor; hiçbiri bir anahtar kelime aracıyla ölçülmedi. Portföy, **zaten sahip olduğumuz veriye uyuma** ve mevcut sonuç tipinin yenilebilirliğine göre sıralı.

| # | Küme | Örnek sorgular (EN / TR) | Hedef | Bugün kim sahipleniyor | Kazanma koşulumuz | Faz |
|---|---|---|---|---|---|---|
| 1 | Tazelik / keşif | "new open weight models", "new open source AI models this week" / "yeni açık kaynak yapay zeka modelleri" | `/`, `/models`, `/news`, `/c/*` | HF, sürüm defterleri | Görünür `firstSeenAt`, 10 dakikalık ingest ve dokuz kategori tek yerde | P0–P1 |
| 2 | Model uzun kuyruğu | "<repo>", "<model> VRAM", "<model> GGUF", "<model> ollama", "<model> license" | `/m/{slug}` | HF, Ollama | Yerel uyum tablosu + runner başına komut + dosya boyutları + lisans + benzer modeller | P2 |
| 3 | Çalıştırma / uyum | "how much VRAM for a 7B model", "run <model> on 8 GB" / "7b model kaç gb ram" | `/m/*` + 3 uyum rehberi | Hesaplayıcılar | Genel formül değil, gerçek GGUF dosya boyutları ve somut model seçkileri | P2 (koşullu, §7.5) |
| 4 | Karşılaştırma | "<a> vs <b>", "best local coding model", "best local image model" | küratörlü rehberler + `/compare` | Bloglar, Reddit | Aynı snapshot farkları, kapı, günlük indirme, yazdırılabilir komutlar | P2–P3 |
| 5 | Tanım | "what is quantization", "Q4_K_M", "gguf vs safetensors" / "quantization nedir" | `/glossary/*` | Bloglar, dokümanlar | Tanım + snapshot'tan canlı kanıt + hesaplayıcı + model bağlantıları | P1–P2 |
| 6 | Kategori | "open weight video models", "local image generation models", "open embedding models" | `/c/*` | Genel listeler | Kategori başına sayı, runner kapsamı, kapı, medyan VRAM | P2 |
| 7 | Veri / istatistik | "open weight model statistics", "how many open models released" | `/stats` + aylık çalışma | Güçlü kimse yok | CSV'li ve aylık bulgulu atıflanabilir veri kümesi | P3 |
| 8 | Marka / navigasyon | "OpenWeight Radar" | `/`, `/about` | — | Tutarlı `Organization`, `sameAs`, about/method sayfaları | P0–P1 |

### 2.3 Beklenen SERP özellikleri — ve alamayacaklarımız

| Özellik | Gerçekçi mi? | Neden / eylem |
|---|---|---|
| Sonuçta breadcrumb | **Evet** | Her model, haber ve sözlük detayında `BreadcrumbList` |
| Article / NewsArticle zengin sonucu | **Evet**, görsel + yazar + yayıncı varsa | `author` olarak kaynak kuruluşu kullan; asla uydurma. Yazarı olmayan öğeler hak kazanamayabilir |
| Sitelinks | Marka talebinden sonra mümkün | Net IA, tutarlı iç bağlantılar, about sayfası, `Organization` + `sameAs` |
| Görsel paketi | Sınırlı | 1 402 modelin yalnızca 10'unda örnek görsel var; üretilen plate'ler içerik görseli değil. 151 haber küçük resmi için alt metin ve görsel sitemap ekle |
| Discover | Sınırlı | Büyük, benzersiz içerik görselleri ister. Tek gerçekçi yüzey haber küçük resimleri (151/210); model sayfaları değil |
| FAQ zengin sonucu | **Hayır** | Google 2023'te FAQ zengin sonuçlarını kısıtladı. SSS metnini okurlar ve AI yanıtları için kullan; SERP özelliği bekleyerek `FAQPage` ekleme |
| HowTo zengin sonucu | **Hayır** | Kullanımdan kaldırıldı. `HowTo` işaretlemesini atla |
| Software App zengin sonucu | **Hayır** (puanlama olmadan) | `offers` + `aggregateRating`/`review` ister. Puan uydurmayacağız; `SoftwareApplication` varlık anlayışı içindir, zengin sonuç değil |
| Sitelinks arama kutusu | **Hayır** | Kaldırıldı. `SearchAction` ekleme |
| Dataset zengin sonucu | Web aramasında **hayır** | Yalnızca Dataset Search; atıf ve aylık çalışma için yine faydalı |
| Video zengin sonucu | Yok | Video yüzeyi yok |

---

## 3. Dizin politikası — sözleşme

### 3.1 Rota matrisi

| Rota | Dizin | Canonical | Sitemap'te | Not |
|---|---|---|---|---|
| `/{locale}` | evet | kendisi | evet, `hourly` | ön sayfa |
| `/{locale}/models` | evet | kendisi | evet, `hourly` | yalnızca 1. sayfa |
| `/{locale}/models?page=N` (N ≥ 2) | evet | kendisi | hayır | sayfalama bir yoldur, kopya değil; iç bağlantılar + sitemap'teki 1. sayfa yeter |
| `/{locale}/models?window|sort|gate|runner|maxParams|license|q` | **hayır** | `/models` | hayır | `robots: { index: false, follow: true }`; filtreli sayfayı *farklı* bir sonuç kümesinin 1. sayfasına canonical yapma |
| `/{locale}/c/{category}` | evet | kendisi | evet | kategori giriş metni gerekli (§7.3) |
| `/{locale}/c/{category}?…` | **hayır** | `/c/{category}` | hayır | dizinle aynı politika |
| `/{locale}/m/{slug}` | yüklem §3.2 | kendisi | uygunsa evet | aksi hâlde `noindex,follow`; bağlantılanabilir kalır |
| `/{locale}/n/{id}` | özet ≥ 300 karakter veya `kind` ≠ `paper` ise evet | kendisi | evet | bugün 210'unun tamamı uygun (makaleler ≥ 300: 150/150) |
| `/{locale}/news`, `/research` | evet | kendisi | evet, `hourly` | sorgu varyantları rotaya canonical, `noindex` |
| `/{locale}/glossary` | evet | kendisi | evet | `?q=`/`?cat=` → `noindex,follow` |
| `/{locale}/glossary/{slug}` | evet | kendisi | evet | 15 terim |
| `/{locale}/stats` | evet | kendisi | evet | `?days=` → canonical `/stats`, `noindex` |
| `/{locale}/compare` (idsiz) | evet | kendisi | evet | araç açılış sayfası |
| `/{locale}/compare?ids=…` | **hayır** | tekilleştirilmiş, sıra korunmuş | hayır | zaten uygulanmış; koru |
| `/{locale}/guides/*`, `/tools/*` (P2) | evet | kendisi | evet | yalnızca küratörlü |
| `/api/*` | hayır | — | hayır | robots'ta `Disallow: /api/` |
| 404 / not-found | hayır | — | hayır | gerçek 404 durumu + `noindex` |

### 3.2 Model yüklemi (ölçülmüş hacim)

```ts
// src/lib/seo.ts
const SPEC_KEYS = ["paramsTotal", "license", "libraryName", "storageBytes", "vramEstGb", "files", "quantizations", "runners"] as const;

export function specCount(model: ClassifiedModel): number {
  return SPEC_KEYS.filter((key) => (Array.isArray(model[key]) ? model[key].length > 0 : model[key] != null)).length;
}

export function isIndexableModel(model: ClassifiedModel): boolean {
  return model.qualityPassed && (specCount(model) >= 4 || (model.cardSummary?.trim().length ?? 0) >= 200);
}
```

| Yüklem | Bugünkü model | × 2 locale |
|---|---|---|
| `qualityPassed` | 529 | 1 058 |
| `qualityPassed && specCount ≥ 3` | 454 | 908 |
| **`qualityPassed && (specCount ≥ 4 \|\| summary ≥ 200)`** | **430** | **860** |
| `qualityPassed && specCount ≥ 5` | 324 | 648 |

430 ile başla; kart doldurma gelince aynı yüklem otomatik olarak 529'un tamamına genişler (§7.1). Kapıyı geçmeyen modeller `noindex, follow` kalır ama erişilebilir, karşılaştırılabilir ve bağlantılanabilir olur — kapı bir kalite sinyali olarak kalır, duvar olmaz.

### 3.3 Sorgu dizesi politikası

- Yüzey başına kanonik olan tek parametre kombinasyonu: çıplak rota.
- `page` istisnadır: ayrı bir dokümandır ve kendine canonical'dır.
- Filtreli sayfalar `robots: { index: false, follow: true }` ve çıplak rotaya işaret eden `alternates.canonical` döndürür. `follow` önemli: filtreli sayfalar model sayfalarına bağlanır.
- `/compare?ids=…` mevcut `noindex` + tekilleştirilmiş canonical'ını korur (sitedeki bugünkü tek doğru uygulama).
- Sitemap'e sorgu URL'si koyma ve `noindex` taşıyan bir URL'yi `Disallow` etme — tarayıcı direktifi görebilmelidir.

### 3.4 404'ler ve yönlendirmeler

| Durum | Bugün | Hedef |
|---|---|---|
| Bilinmeyen model slug'ı | 200 + boş durum | `notFound()` → 404, `noindex` |
| Bilinmeyen haber id'si | 200 + boş durum | `notFound()` → 404 |
| Bilinmeyen kategori | 200 + boş durum | `CATEGORY_RULES` ile doğrula, `notFound()` → 404 |
| `/` ve locale'siz yollar | 307 | `NextResponse.redirect(url, 308)` ile 308 |
| `/?window=…` → `/en/models?window=…` | 308 (zaten) | koru |
| `*.vercel.app` → özel alan adı | yok | platform seviyesinde, Next'ten önce 308 |

`src/app/[locale]/not-found.tsx` ekle: gerçek bir arama formu ve `/models`, `/news`, `/glossary` bağlantıları; 404 gövdesi faydalı ama asla dizine uygun olmasın.

Next 404 durumunu yalnızca **streaming başlamadan önce** döndürür; sonrasında not-found arayüzü `200` ile ve enjekte edilmiş `<meta name="robots" content="noindex">` ile çizilir. Bu rotalar snapshot'ta askıya alındığı için durumu `curl` ile doğrula; 200 geliyorsa `generateMetadata` içinde de `notFound()` çağır (metadata çözümü tarayıcılar için bloklayıcıdır) veya varlığı ilk Suspense sınırından önce çöz.

### 3.5 Kanonik host ve taşıma runbook'u

Site bugün `local-ai-news.vercel.app` üzerinde canlı, kodun varsayılanı ise NXDOMAIN olan `openweightradar.com`. Dizinleme başladıktan sonra taşımak, şimdi taşımaktan daha pahalıdır.

1. **Tek host seç** — apex (`https://openweightradar.com`) veya `www` — diğerini kalıcı olarak 308'le ona yönlendir. İkisini birden asla sunma.
2. Vercel'de alan adını ekle, bastığı DNS kayıtlarını gir, TLS'i bekle. Alan adı çözülmeden duyuru yapma.
3. `NEXT_PUBLIC_SITE_URL`'i Production/Preview'da son origin yap, yeniden dağıt ve sitemap, robots, RSS, canonical ve OG URL'lerinin **aynı** hostu bastığını doğrula.
4. `local-ai-news.vercel.app/*` → özel host 308'ini platform seviyesinde, Next'ten önce kur. En az 12 ay tut.
5. GSC: **Domain property** ekle, DNS TXT ile doğrula, `/sitemap.xml`'i gönder, eski host dizinlenmişse **Adres değişikliği** aracını kullan. Bing: GSC'den içe aktar, aynı sitemap'i gönder.
6. Her dış profili (GitHub, Hugging Face org, X, bültenler, README rozetleri) yeni hosta güncelle.
7. Kesim sonrası kontroller: kanonik host 200; eski host her yolda ( `/en` dahil) 308; hiçbir head veya sitemap'te `vercel.app`, `localhost` veya `http://` yok; tek `metadataBase`.
8. Dört hafta kapsam dalgalanması bekle. Taşıma penceresinde başlık veya canonical değiştirme; hangi değişikliğin neye yol açtığını bilemezsin.

---

## 4. Metadata şartnamesi

### 4.1 Site geneli (`src/app/[locale]/layout.tsx`)

```ts
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://openweightradar.com";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: "OpenWeight Radar — open-weight models you can run locally",
    template: "%s · OpenWeight Radar"
  },
  description: "Track new open-weight AI models you can run locally: params, VRAM, quantization, runners and license, updated every 10 minutes.",
  applicationName: "OpenWeight Radar",
  // canonical + languages sayfa başında ayarlanır, burada değil: layout'un yolu yok.
  // metadataBase yalnızca onları mutlak yapar.
  openGraph: {
    type: "website",
    siteName: "OpenWeight Radar",
    locale: "en_US",
    alternateLocale: ["tr_TR"],
    // Görseller opengraph-image dosya konvansiyonundan gelir; iki kez elle yazma.
  },
  twitter: { card: "summary_large_image" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION } : {}
  },
  robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
};
```

Notlar:
- `metadataBase` göreli `alternates`/`images` değerlerini mutlak yapar; her dinamik rota yine de mutlak değer geçirir.
- `max-image-preview: large` Discover/Arama'da büyük küçük resimleri açar.
- Doğrulama değerleri commit edilmiş string değil, env değişkenidir.
- Kök layout `[locale]/layout.tsx`'tir (`app/layout.tsx` yok), yani doğru yer burasıdır.

### 4.2 Rota başına başlık ve açıklama

Dinamik rotalarda başlıklar mutlaktır; marka soneki varlığı ~60 karakterin ötesine itmesin. Açıklamalar 120–160 karakterdir ve her zaman bir sayı (adet, parametre, tarih) içerir; böylece şablon metin olamazlar.

| Rota | Başlık | Açıklama |
|---|---|---|
| `/` | `OpenWeight Radar — open-weight models you can run locally` | `1 402 open-weight models tracked, 529 pass the quality gate. New LLM, image, video, audio and coding models you can run locally, updated every 10 minutes.` |
| `/models` | `All open-weight models — OpenWeight Radar` | `Browse every tracked model: filter by window, runner, params and license. 430 pages with full specs, 9 categories, updated hourly.` |
| `/c/{category}` | `New {label} models you can run locally — OpenWeight Radar` | `{N} new {label} models first seen in the last {window}. Filter by runner, params and license; sorted by downloads, likes or recency.` |
| `/m/{slug}` | `{repoId} — {params?} local {category} model` (60'a kısalt) | `{repoId}: {params} {category} model first seen {date}. {quantizations} · {runners} · ~{vram} GB VRAM · {license}. Run command and file list.` |
| `/n/{id}` | `{temiz başlık} — {kind} · OpenWeight Radar` | `newsText(...).body`'nin ilk 155 karakteri, URL'lerden arındırılmış. |
| `/news` | `Local AI news — releases, runtimes and announcements` | `{N} model releases and runtime updates from the last {window}, with the source and the model each one mentions.` |
| `/research` | `Open-weight AI papers — daily research feed` | `{N} papers from the Hugging Face daily feed, filtered to work that ships open weights you can run.` |
| `/glossary` | `Local AI glossary — quantization, VRAM, GGUF, MoE` | `{15} terms behind the spec sheets, each with the numbers from the current snapshot and a VRAM calculator.` |
| `/glossary/{slug}` | `{term}: {kısa tanım}` (≤ 60) | `{summary} Definition, evidence from {N} tracked models, and a VRAM calculator.` |
| `/stats` | `Open-weight model statistics — the Data Desk` | `1 402 models tracked, 529 pass the gate, {median} median downloads. Category share, runner coverage, gate pass rate and daily cadence.` |
| `/compare` | `Compare open-weight models side by side` | `Two to four models on one sheet: params, VRAM, quantization, runners, license, downloads per day and the differences that matter.` |

`{params?}` segmentin `null` veya `—` basmadan temizce atlandığı anlamına gelir. Her başlık `src/lib/seo.ts` içinde saf bir fonksiyonla üretilir ve tüm alanları dolu bir model, hiç alanı olmayan bir model ve yalnızca özeti olan bir modelle birim testine bağlanır.

### 4.3 hreflang kuralları

- Her dizine uygun sayfa tam olarak üç alternatif yayınlar: `en`, `tr`, `x-default` → EN.
- Alternatifler karşılıklıdır: `/en/x` ve `/tr/x` çifti birlikte listelemelidir. Denetim betiği iki yönü de kontrol eder.
- Varlık rotaları (`/m`, `/n`, `/glossary`) iki locale'de aynı slug'ı kullanır; yalnızca kabuk dili değişir.
- `noindex` sayfalar, 404'ler veya sorguyla filtrelenmiş sayfalar için hreflang yayınlama.
- `x-default` hem HTML'de hem sitemap'te yayınlanır. Sitemap hreflang ek açıklamaları `x-default` kabul eder ve `sitemap.ts` içindeki `alternates.languages` onu taşıyabilir; değeri HTML etiketiyle aynı tut.

### 4.4 Open Graph görselleri

- Site varsayılanı: `src/app/[locale]/opengraph-image.tsx` → 1200×630, nameplate + tagline + canlı sayılar.
- Model: `{repoId}`, kategori, parametre, VRAM, `Free` fiyatı, Radar işareti. Haber: temizlenmiş başlık + kaynak + tarih. Sözlük: terim + tek satır tanım.
- Repo `next/font/google` kullanıyor; bu CSS/font nesneleri satori'nin tüketebileceği biçimde değil. `ImageResponse` ham `ArrayBuffer` TTF/OTF ister. `src/assets/fonts/` altına OFL bir font (Space Grotesk 700, latin + latin-ext) commit et ve `readFile` ile oku (Node runtime) ya da dağıtılmış origin'den çek. Türkçe glifler için paketlenmiş varsayılana güvenme.
- Üretilen görselleri önbellekle (`revalidate = 86400`); snapshot'tan deterministiktirler.

---

## 5. Yapısal veri

| Sayfa | Tipler | Gerekli / önerilen alanlar | Kural |
|---|---|---|---|
| Site geneli (`layout`) | `WebSite`, `Organization` | `name`, `url`, `inLanguage`, `publisher.logo`, `sameAs` (varsa GitHub, Hugging Face org, X) | `SearchAction` yok — Google sitelinks arama kutusunu kaldırdı; grafiği dürüst tut. |
| Model | `SoftwareApplication` + `BreadcrumbList` | `name`, `applicationCategory: "DeveloperApplication"`, `applicationSubCategory` (kategori etiketi), `operatingSystem`, `offers: { price: 0, priceCurrency: "USD" }`, `license`, `datePublished`, `dateModified`, `url` (iç), `sameAs` (HF), `keywords`, `isPartOf` | HF URL'sini asla `url`'e koyma; `sameAs`'e gider. Lisans ticari kullanımı yasaklıyorsa `offers`'ı çıkarma? Hayır — fiyat 0 hâlâ doğru; kısıt `license` içinde. |
| Haber | `NewsArticle` + `BreadcrumbList` | `headline`, `datePublished`, `dateModified`, `mainEntityOfPage` (iç), `url` (iç), `image` (varsa küçük resim), `publisher` = Radar + logo, `author` = biliniyorsa kaynak kuruluş, `isBasedOn` = kaynak URL, `articleSection` | Sayfa gövdeyi yeniden yayınlamıyor; `isBasedOn` kaynağa dürüst bağdır. Google'ın Article yönergeleri headline, image, datePublished, author ve publisher ister; kaynak kuruluş bilinmiyorsa grafiği geçerli tut ve yazar uydurmak yerine öğenin zengin sonuç kazanamayabileceğini kabul et. |
| Listeler (`/models`, `/c/*`, `/news`, `/research`) | `ItemList` + `BreadcrumbList` | **iç** URL'lerle `itemListElement`, `numberOfItems`, `itemListOrder` | Yalnızca o sayfada gerçekten çizilen öğeleri kullan. |
| Sözlük dizini/terimi | `DefinedTermSet` / `DefinedTerm` + `BreadcrumbList` | mevcut alanlar | Koru; metin değişince `dateModified` ekle. |
| İstatistik | `Dataset` (opsiyonel) | `name`, `description`, `temporalCoverage`, `creator`, `isAccessibleForFree`, `distribution` → `/api/stats` | Yalnızca sahibi veri kümesini lisanslamaya razıysa; aksi hâlde düz `WebPage`. |
| Id'li karşılaştırma | yok (`noindex`) | — | Dizine uygun olmayan sayfada yapısal veri boşa giden bayttır. |

Mevcut kodda ölçülen tuzaklar:
- Model sayfasının `CreativeWork.url` değeri Hugging Face URL'si, haber `NewsArticle.url` değeri dış kaynak. İkisi de Google'a "bu sayfa site dışı bir dokümanın kopyası" der. §4 ile aynı commit'te düzelt.
- `image` alanına `model.sampleImages[0]` geçiliyor; bu **10/1 402** modelde var. `undefined`/boş yayınlamak yerine alanı atla.
- Tarihler saat dilimli ISO string olmalı (`createdAt`, `firstSeenAt`, `publishedAt` zaten ISO). `dateModified` `updatedAt || firstSeenAt` olmalı, render anında `new Date()` asla.
- Beğeni/indirmeden `aggregateRating` üretme; bunlar oy değildir ve uydurma olur.

---

## 6. Sitemap'ler, robots ve yemler

### 6.1 Sitemap bölünmesi

`generateSitemaps` kullan (Next 16 `id`'yi `Promise<string>` olarak geçirir), dört grup:

| id | İçerik | Bugünkü URL bütçesi |
|---|---|---|
| `0` | Çekirdek rotalar × locale: ön sayfa, models 1. sayfa, 9 kategori, news, research, glossary, stats, compare | 32 |
| `1` | Sözlük terimleri × locale | 30 |
| `2` | Dizine uygun modeller × locale | bugün 860, doldurma sonrası 1 058 |
| `3` | Tüm haber detayları (üst sınır yok) | 420 |

Her kayıt: mutlak `url`, `lastModified` (modellerde `updatedAt || firstSeenAt`, haberde `publishedAt`, sözlük/rehberde metin sürümü), `changeFrequency`, `en`/`tr`/`x-default` için `alternates.languages` ve 151 haber küçük resmi ile 10 model örnek görseli için `images`. `priority` yok (Google yok sayıyor). Görsel sitemap küçük ama sitenin tek görsel yüzeyi.

Dağıtımdan sonra `/sitemap.xml`'in gerçekte ne döndürdüğünü doğrula: `generateSitemaps` ile çocuklar `/sitemap/{id}.xml` altında yaşar; kök otomatik bir indeks üretmiyorsa her çocuğu `robots.txt`'te açıkça listele. 404'e işaret eden bir robots dosyası yayınlama.

### 6.2 robots.txt

```
User-Agent: *
Allow: /
Disallow: /api/

User-Agent: GPTBot
Allow: /

User-Agent: ClaudeBot
Allow: /

User-Agent: PerplexityBot
Allow: /

User-Agent: Google-Extended
Allow: /

Sitemap: https://<kanonik-host>/sitemap.xml
```

- `/api/` JSON'dur, içerik değil; tarama bütçesini sayfalarda tutmak için yasakla.
- Filtreleri, `?page=`'i veya `/compare?ids=`'i `Disallow` etme — bunlar `noindex` taşır ve tarayıcı direktifi okuyabilmelidir.
- AI tarayıcılarına izin vermek bir ürün kararıdır (atıf ve yönlendirme mi, eğitim kullanımı mı). `DECISIONS.md`'ye yaz; yukarıdaki blok öneridir.
- `Host:` direktifi yok (yalnızca Yandex, kullanımdan kalkmış).

### 6.3 RSS

Mevcut yem: 50 öğe, `<link>` dış kaynağa gidiyor, `atom:link rel="self"` yem URL'si yerine `/news`'e işaret ediyor. Hedef:

- `<link>` ve `<guid isPermaLink="true">` → iç `/n/{externalId}` kanonik sayfası.
- Atıf için `<source url="{item.url}">{organization}</source>` ekle.
- `atom:link rel="self"` → `/feed.rss?lang={lang}` (kategori varyantı varsa onunla).
- Küçük resim varsa `<enclosure url="{thumbnail}" type="image/…"/>` ekle (151/210).
- 7 günlük pencereyi ve 50 öğe sınırını koru; okuyucular isterse sonra `?kind=` eklenir.
- Yem, `/news` ve `/research` head'inde ilan edilmeli (`alternates.types["application/rss+xml"]`).

---

## 7. İçerik derinliği — asıl sıralanan kısım

### 7.1 Model sayfaları

**`cardSummary: 0`'ın kök nedeni.** `runIngest` önce detay doldurmayı çalıştırıp kart bütçesini sonra hesaplıyor:

```ts
const backfillBudget = Math.max(0, Math.min(options.maxBackfills ?? 120, options.maxRequests - client.requestsUsed - 10));
const backfilled = backfillBudget > 0 ? await backfillDetails(client, models, backfillBudget) : 0;
const cardBudget = Math.max(0, Math.min(options.maxCards ?? 80, options.maxRequests - client.requestsUsed - 10));
```

`maxRequests = 400` ile listelemeler ~18 kullanıyor, detaylar 300'e kadar alıyor, kart okumalarına 0–10 kalıyor. Sonuç ölçülebilir: özellik yayınlandığı hâlde sunulan snapshot'ta **0** özet var. İki çözümden biri:

1. **Harcamadan önce ayır**: önce `cardBudget = min(80, floor(0.2 × maxRequests))` hesapla, detay payından düş; veya
2. **Ayrı bir workflow adımı olarak çalıştır**: `npm run ingest` sonrası, `npm run publish` öncesi `npm run cards-backfill -- --limit=150`; böylece kart geçişinin kendi 150 istek bütçesi ve kendi hata modu olur. 529 geçen model / tur başına 150 ≈ 4 tur. Workflow özetine bir `cards-backfill` satırı ekle.

Sonra: özeti olmayan ve spec sayısı 4'ün altında olan model sayfasını dizine almamayı reddet (§3.2) ve özeti sayfada göster (zaten varsa çiziliyor).

**Bir sayfayı dizine değer kılan bölümler** (her biri veriden türemeli, asla uydurulmamalı):

| Bölüm | Kaynak | Bugün var | Kural |
|---|---|---|---|
| Nedir | `cardSummary` (README özeti, ≤ 600 karakter) | %0 | Dizin için zorunlu; atıf + HF bağlantısı |
| Spec'ler | params, depolama, quant'lar, runner'lar, kütüphane, VRAM, lisans, popülerlik | %7,5–74,9 | Yalnızca dolu satırları bas; `—` ızgarası yok |
| Çalıştır | `runCommand(model)` + runner başına komutlar | %100 (türetilmiş) | Tespit edildiğinde `llama.cpp`, `Ollama`, `MLX` varyantlarını göster |
| VRAM tablosu | 4/8/16/24 GB ve 4k/8k bağlamda `estimateVramGb` | params %7,5 | Parametre yoksa tabloyu gizle, hesaplayıcıyı göster |
| Dosyalar | `files` | %18,1 | Koru; repo başına benzersiz |
| Benzer modeller | aynı kategori + parametre bandı + runner | %100 (türetilmiş) | 4–6 iç bağlantı; tarama ağının göbeği |
| Anıldığı yer | `getModelNews` | 10/210 haberde `modelSlug` | Koşullu kalır |
| Provenance | ilk görülme, güncelleme, kapı nedeni, lisans | %100 | Tek satır: "İlk görülme 12 Eki 2026 · 2 sa önce güncellendi" |

Mutlak kural: **altında hiçbir şey olmayan başlık asla çizilmez.** Mevcut sayfa bunu kart özeti ve anılmalar için zaten uyguluyor; her bloğa genişlet.

### 7.2 Haber detayı

- Politikayı koru: özet + atıf + bağlantı, kaynak gövdesi asla.
- Her sayfa şunları gösterir: temizlenmiş başlık (build etiketleri ayıklanmış), tür, kategori, kaynak kuruluş, yayın zamanı, özet, "Kaynağı oku" (dış, `nofollow`) ve 3 ilgili haber.
- Model bağlantısını daha sık çöz. Yalnızca **10/210** öğede `modelSlug` var; isim indeksi zaten mevcut (`lib/model-mentions.ts`). Ingest'te ters eşleşmeyi çalıştır ve tam olarak bir model eşleştiğinde `modelSlug` sakla; güven kuralı: tam repo id veya benzersiz ≥ 6 karakter model adı. Bir haber sayfasının model sayfasına ve geri bağlanması, sitedeki en güçlü iç bağlantı çiftidir.
- `dateModified`'ı yalnızca özet/upvote gerçekten değişince ekle; aksi hâlde `datePublished` kalsın.
- Görünen özeti 4 000 karakterde sınırla (zaten) ve `<h1>`'i temizlenmiş başlık yap.

### 7.3 Kategori sayfaları

Her `/c/{category}` listenin üstünde 150–250 kelimelik, snapshot gerçeklerinden üretilen ama her kategori için bir kez yazılan giriş metni ister:

- kategorinin ne içerdiği ve hangi `pipeline_tag`'lerin beslediği;
- kaç model izlendiği, kaçının kapıyı geçtiği, medyan indirme;
- en yaygın üç runner ve bildirildiğinde medyan VRAM/parametre;
- 3 soruluk SSS (ör. "Şu an en iyi yerel kod modeli hangisi?", "7B model kaç VRAM ister?", "Kalite kapısı neyi filtreler?") ve sayfanın kendi sayılarından türetilmiş yanıtlar. **İşaretleme notu:** `FAQPage` bu site için zengin sonuç kazandırmaz (Google 2023'te FAQ zengin sonuçlarını kısıtladı). Metin okurlar ve AI yanıt motorları içindir; SERP özelliği bekleyerek FAQ şeması ekleme;
- eşleşen sözlük terimlerine ve en yakın rehbere bağlantılar.

Metni `src/i18n/dictionaries/{en,tr}.json` içinde `desk.intro.{key}` olarak sakla; böylece çevrilmiş ve diff'te incelenebilir kalır. Her render'da snapshot'tan üretme; içindeki sayılar listeyi değiştiren aynı ingest tarafından güncellenmeli, yoksa sayfa kendisiyle çelişir.

### 7.4 Sözlük

Sitenin zaten en iyi içeriği. Baştan yazma, genişlet:

- 15 → 25 terim; sorgu fırsatına göre: `Q4_K_M`, `Q8_0`, `FP8`, `BF16`, `bağlam penceresi`, `KV cache`, `tokenizer`, `MoE yönlendirme`, `LoRA`, `merge`, `distilasyon`, `benchmark`, `throughput`, `tokens/s`, `quantization-aware training`.
- Her terim Türkçe bir tanım alır (İngilizcenin makine çevirisi değil), mevcut kanıt bloğunu korur ve filtrelenmiş model listelerine 2–3 iç bağlantı verir.
- Metin değişince `DefinedTerm`'e `dateModified` ekle.
- Sözlük dizini `?q=`'yi zaten yanıtlıyor; `noindex` kalsın ama sonuçlar terimlere bağlansın.

### 7.5 Talep yüzeyleri (P2 — en fazla 12; `/best/*` P3'e ertelendi)

| URL | Sorgu niyeti | Neden sıralanabilir | İhtiyaç duyduğu veri |
|---|---|---|---|
| `/tools/vram-calculator` | "vram calculator", "llm vram calculator", "gguf vram hesaplama" | **Koşullu.** Sekiz cilalı hesaplayıcı zaten var (§2.1); yalnızca snapshot'tan gerçek GGUF dosya boyutlarını okuyup `/m/*` sayfalarına bağlanıyorsa yayınla | `estimateVramGb`, dosya boyutları, quantization tablosu, parametre girişi |
| `/guides/run-llm-locally` | "how to run an llm locally" | `runCommand`'dan gerçek komutlarla adım adım | runner tespiti, model seçkileri |
| `/guides/best-local-coding-models` | "best local coding model" | Günlük indirme + parametreye göre sıralı tablo, snapshot'tan tazelenir | kategori verisi, kapı, runner'lar |
| `/guides/best-local-image-models` | "best local image model", "flux gguf" | Aynısı, görüntü için | kategori verisi |
| `/guides/gguf-vs-safetensors` | "gguf vs safetensors" | Tanım + depolama/VRAM sonucu + gerçek örnekler | sözlük, depolama baytları |
| `/guides/local-model-quantization` | "Q4_K_M", "quantization explained" | Quantization tablosu zaten kurulu | sözlük, `quantizations` |
| `/guides/how-much-vram-for-a-7b-model` | "7b vram", "8b vram" | Boyut bandı başına tek sorgu; hesaplayıcı **ve gerçekten sığan modellerin listesi** ile yanıtlanır | params → VRAM, dosya boyutları |
| `/guides/ollama-vs-llama-cpp` | "ollama vs llama.cpp" | Runner kapsam verisi | runner'lar |
| `/best/{category}` × 9 (**P3**) | "best open {category} model" | Yalnızca her sayfa farklı bir ilk-10 tablosu ve girişe sahipse | kategori verisi |
| `/about`, `/method`, `/data` | marka + E-E-A-T | Siteyi kim işletiyor, kapı nasıl çalışıyor, veri nasıl atıflanır | statik metin |

Bunların her biri aynı çıtayı geçmeli: **≥ 150 kelime benzersiz düzyazı + snapshot'la değişen bir veri tablosu.** Geçemeyen sayfa yayınlanmaz. `[kategori] × [vram]` matrisi yok, editoryal seçim içermeyen otomatik "top 10" sayfası yok.

### 7.6 Türkçe

- Yeni kategori girişlerini, rehberleri ve sözlük tanımlarını düzgün çevir; EN kaynak, TR ayna (repo kuralı).
- Model ve haber sayfaları İngilizce varlık adlarını ve kaynak metni korur; TR kabuk ve TR açıklama alır. Bu dürüst olandır; 1 400 model kartını makineyle çevirme.
- JSON-LD'ye `inLanguage` ekle ve `<html lang="tr">`'yi koru.
- TR metni sürdürülemeyecekse TR'yi UI + sözlük/rehberlerle sınırla ve TR varlık sayfalarını `noindex` yap; neredeyse kopya yayınlamaktansa. Bir kez karar ver; belirsiz bırakma.
- TR sayfa içindeki İngilizce alıntıları `lang="en"` ile işaretle (model kartı metni, haber özetleri, kuruluş adları). Ekran okuyuculara yardım eder ve dil sınıflandırıcılarının tüm TR sayfasını İngilizce sanmasını engeller.

### 7.7 İçerik kalite rubriği (yayın kapısı)

Her dizine uygun sayfa, sitemap'e girmeden önce altı eksende 0–2 puanlanır. Rubrik var çünkü "≥ 150 kelime benzersiz düzyazı" tek başına şablon cümlelerle kandırılabilir; bu tablo sayfanın gerçekten faydalı olup olmadığını sorar.

| Eksen | 0 | 1 | 2 |
|---|---|---|---|
| **Benzersiz düzyazı** | yok | yalnızca şablon spec cümleleri | kart özeti + bu sayfa için yazılmış özgün bağlam |
| **Veri bütünlüğü** | ≤ 2 spec | 3–4 spec | ≥ 5 spec + dosya listesi |
| **Yerel çalıştırma** | runner veya komut yok | tek genel komut | runner başına komutlar + ≥ 2 quant'ta VRAM tablosu |
| **İç bağlantılar** | < 2 | 2–3 | ≥ 4 ilgili (kategori, benzer modeller, sözlük, haber) |
| **Provenance** | yok | bir tarih | ilk görülme + güncelleme + kapı nedeni + lisans + kaynak bağlantısı |
| **Medya / yapısal veri** | ikisi de yok | yalnızca JSON-LD | görsel + JSON-LD + breadcrumb |

- **Yayın eşiği: 8/12.** 8'in altındaki model sayfası `noindex, follow` kalır.
- Ayda bir yeniden puanla. 6'nın altına düşen sayfa dizin statüsünü kaybeder; arka bağlantısı olan sayfa silinmez, zenginleştirilir.
- Rubrik editoryaldir, çalışma zamanı kontrolü değil. `seo-audit.ts` mekanik yarıyı (kelime sayısı, bağlantılar, JSON-LD) uygular; bu tablo içeriğin var olmayı hak edip etmediğine karar verir.

---

## 8. İç bağlantı ve tarama yolları

- **Her detay sayfasında breadcrumb** (görünür + JSON-LD): Ana → Kategori → Model, Ana → Haber → Öğe, Ana → Sözlük → Terim.
- **Model → kategori → model**: her model sayfası kategorisine ve 4–6 benzer modele bağlanır; her kategori sayfası ilk 24'e bağlanır ve sayfalar.
- **Model ↔ haber**: haber detayı (çözüldüğünde) modele bağlanır; model sayfası anılmaları listeler (zaten).
- **Sözlük ↔ veri**: her terim filtrelenmiş model listesine ve hesaplayıcıya bağlanır (zaten); filtre o terimle ilgiliyse liste sayfaları terime geri bağlanır.
- **Tarama derinliği**: her sitemap URL'si `/`'dan ≤ 3 tıkla ulaşılabilir olmalı. Denetim betiği iç bağlantıları tarar ve derinlik dağılımını raporlar; yalnızca sitemap'te var olan URL uyarıdır, hata değil.
- **Sayfalama**: sayfa başına 24 model × 1 402 = 59 sayfa. `page` dizine uygun ve kendine canonical; sitemap yalnızca 1. sayfayı taşır; kategori sayfaları ve "benzer modeller" gerisini taşır.
- Opsiyonel `/sitemap` HTML sayfası (hub'ların hub'ı) XML sitemap tamamlanınca gerekli değil; bir ince dizine uygun sayfa daha üretmemek için atla.

### 8.1 İç bağlantı matrisi

| Nereden | Nereye | Bağlantı | Amaç |
|---|---|---|---|
| Ön sayfa | models, 9 kategori, news, research, glossary, stats | 12–18 | otoriteyi en güçlü sayfadan dağıt |
| `/models` | sayfa başına 24 model + kategoriler + sözlük | 24 + 12 | keşif ve derin sayfalama |
| Kategori `/c/*` | 24 model + kardeş kategoriler + 2 sözlük terimi | 24 + 4 | tarama ağı ve konusal kümeleme |
| Model `/m/*` | kategori, 4–6 benzer, sözlük terimleri, anılmalar, HF (`nofollow`) | 8–12 | okuru ve tarayıcıyı sitede tut |
| Haber `/n/*` | model (çözüldüğünde), kategori, 3 ilgili haber, liste | 4–6 | tazeliği kalıcı sayfalara bağla |
| Sözlük terimi | filtrelenmiş model listesi, hesaplayıcı, 2 ilgili terim | 4 | tanımları model oturumlarına çevir |
| İstatistik `/stats` | her sayı için filtrelenmiş listeler | 8–15 | veri masasını hub yap |
| Rehberler / uyum sayfaları | 6–10 model + sözlük + hesaplayıcı | 8–12 | ticari niyetli yolu model sayfalarına bağla |
| Footer | about, method, data, RSS, sözlük | 5 | güven sayfaları ve yem keşfi |

Kural: hiçbir sayfa yaprak değildir. Her dizine uygun sayfa yukarı (breadcrumb), yana (kardeşler) ve aşağı (çocuklar/ilgili) bağlanır.

---

## 9. Performans ve önbellekleme

| Öğe | Bugün | Hedef |
|---|---|---|
| HTML önbelleği | her sayfada `private, no-store` | liste/haberde `s-maxage=300, stale-while-revalidate=600`; model/sitemap'te `s-maxage=900` |
| Render | her yerde dinamik SSR; yalnızca sözlükte statik params | ISR + en çok indirilen 200 model ve son 100 haber için `generateStaticParams` |
| Snapshot fetch | `fetch(..., { cache: "no-store" })` | `next: { revalidate: 900 }` + dev için bellek içi TTL |
| TTFB | `curl -w '%{time_starttransfer}'` ile ölç | edge'de p75 < 500 ms |
| LCP / INP / CLS | ölçülmedi | p75 LCP < 2,5 sn, INP < 200 ms, CLS < 0,1 (28 gün sonra CrUX) |
| Görseller | HF remote pattern'li `next/image`; 10 örnek görsel | `sizes` ekle, üretilen plate önce kalsın |
| Fontlar | 3 aile, `display: swap` | koru; yalnızca display yüzünü preload et |
| JS | model sayfası 140 KB HTML (RSC payload dahil) | gerileme yok; rota başına build çıktısını ölç |

Önbellek politikası ayrıntısı:
- `/models`, `/c/*`, `/news`, `/research`, `/glossary`, `/stats` üzerinde `revalidate = 300`; `/m/*`, `/n/*`, sitemap üzerinde `revalidate = 900`.
- Ingest 10 dakikada bir yayınlıyor; 5 dakikalık HTML önbelleği en fazla 5 dakika eski snapshot sunabilir, bu ürünün kendi vaadinin ("10 dakikada bir güncellenir") içinde.
- `/api/*` `no-store` kalır; hız sınırlıdır ve tarayıcı hedefi değildir.

---

## 10. Ölçüm

### 10.1 Enstrümantasyon (P0)

- **Google Search Console**: DNS TXT ile domain property (locale yönlendirmesi içindeki HTML dosyası kullanma). `/sitemap.xml`'i, sonra her çocuğu gönder. Özel alan adını birincil property yap.
- **Bing Webmaster Tools**: GSC'den içe aktar; aynı sitemap'i gönder.
- **Analitik**: Vercel Analytics veya Plausible (çereksiz). Olaylar: dış HF/GitHub tıklaması, çalıştırma komutunu kopyalama, filtre uygulama, karşılaştırmaya ekleme, sözlük → model tıklaması, RSS tıklaması.
- **Rich Results Test** her tipten bir URL'de: model, haber, sözlük, kategori, istatistik.
- **CrUX / PageSpeed** 28 günlük trafikten sonra (alan verisi hacim ister; laboratuvar skoru tek başına KPI değildir).

### 10.2 `scripts/seo-audit.ts` (yeni, CI)

Çalışan bir sunucuya (yerel veya önizleme) karşı sözleşme:

1. Sitemap'teki her URL 200 döner ve `noindex` değildir.
2. Sitemap URL'lerinin hiçbirinde `?` yoktur.
3. Her dizine uygun sayfanın benzersiz `<title>`'ı, dolu açıklaması, kendine canonical'ı ve karşılıklı `en`/`tr`/`x-default` alternatifleri vardır.
4. Her `noindex` sayfa sitemap'ten çıkarılmıştır.
5. `/en/m/<bilinmeyen>`, `/en/n/<bilinmeyen>`, `/en/c/<bilinmeyen>` 404 döner.
6. `/` ve `/models` 308 döner.
7. `robots.txt` sitemap'i ve `Disallow: /api/`'yi içerir.
8. JSON-LD blokları ayrışır; her biri `@type`'ı için gerekli alanları taşır.
9. Her dizine uygun model/haber sayfasında ≥ 150 kelime benzersiz düzyazı (görünür metni çıkar, nav/spec etiketlerini ayıkla) ve en az 4 iç bağlantı vardır.
10. Her sitemap URL'sine `/`'dan ≤ 3 iç tıkla ulaşılır.

`npm run seo-audit` ve `ingest` workflow'unda `npm run build` + `npm start` sonrası bir CI adımı olarak bağla; ya da `app/`, `middleware.ts`, `sitemap.ts`, `robots.ts`'e dokunan PR'larda ve gecelik çalışan ayrı bir `seo.yml` (gecelik + PR) kur.

### 10.3 KPI'lar

| Metrik | Başlangıç (2026-10-20) | 4 hafta | 12 hafta |
|---|---|---|---|
| Sitemap'te dizine uygun URL | 252 | 1 342 (P0) | 1 540 (kart doldurma sonrası) |
| Benzersiz başlıklı rota | %0 (8 rota tipinden 1'i) | %100 | %100 |
| 200 dönen soft-404 probu | 3/3 | 0/3 | 0/3 |
| Canonical + hreflang kapsamı | %0 | %100 | %100 |
| 200 dönen sitemap URL'si | URL başına henüz ölçülmedi | %100 | %100 |
| İçerik rubriğinde ≥ 8/12 alan sayfalar | 0 | tüm dizine uygunlar | tüm dizine uygunlar |
| Yönlendiren alan adları (GSC Links) | yok | başlangıç | başlangıç + 10 |
| Yayın başına IndexNow gönderimi | 0 | her yayın | her yayın |
| GSC dizine giren / gönderilen | yok | başlangıç kur | ≥ %70 |
| GSC gösterim / 28 gün | yok | başlangıç | başlangıcın 3 katı |
| Organik tıklama / 28 gün | yok | başlangıç | başlangıcın 2 katı |
| p75 LCP | yok | < 2,5 sn | < 2,5 sn |
| Geçerli yapısal veri (tüm tipler) | 0 | %100 | %100 |
| Zengin sonuca uygun sayfalar (Article / breadcrumb) | 0 | tüm haberler + detaylar | tüm haberler + detaylar |

Hedefler GSC'de dört haftalık veri oluşana kadar bilinçli olarak görecelidir. Mutlak trafik sayısı uydurma; ilk gerçek gösterim raporundan belirle.

### 10.4 Olay enstrümantasyonu

Yalnızca çereksiz analitik. Her biri bir karara bağlı altı olay:

| Olay | Tetikleyici | Özellikler | Bilgilendirdiği karar |
|---|---|---|---|
| `outbound_source` | HF/GitHub/makale tıklaması | `page_type`, `model_slug`, `source` | Model sayfaları işini yapıyor mu, trafiği mi sızdırıyor? |
| `copy_command` | çalıştırma komutunu kopyalama | `model_slug`, `runner` | Okurlar hangi runner komutlarını gerçekten kullanıyor |
| `filter_apply` | filtre gönderme | `surface`, `filters`, `result_count` | Hangi filtreler hub sayfası hak ediyor |
| `compare_add` | karşılaştırmaya model ekleme | `model_slug`, `position` | Sırada hangi karşılaştırmalar küratörlenmeli |
| `glossary_to_model` | sözlük → filtrelenmiş liste | `term`, `target` | Hangi tanımlar model oturumu üretiyor |
| `rss_click` | RSS bağlantısı / abonelik | `surface`, `lang` | Yem gerçek bir kanal mı |

Scroll derinliği, öfke tıklaması veya "etkileşim süresi" ölçme; bu planın sorduğu bir soruyu yanıtlamıyorlar.

### 10.5 Dizin hızlandırıcıları (ve kurulmayacaklar)

| Mekanizma | Kullan? | Not |
|---|---|---|
| **IndexNow** (Bing, Yandex, Seznam) | **Evet** | Kökte anahtar dosyası sun ve `npm run publish` sonrası değişen model/haber URL'lerini POST et (toplu 10 000). Google IndexNow tüketmez |
| Sitemap ping (`/ping?sitemap=`) | **Hayır** | Google ve Bing kaldırdı; robots + GSC'deki sitemap desteklenen yoldur |
| Google Indexing API | **Hayır** | Yalnızca JobPosting/BroadcastEvent için; model sayfaları için kullanmak sözleşmeyi ihlal eder |
| GSC URL Inspection | Yalnızca nokta kontrolü | Toplu dizinleme API'si yok; tek URL hata ayıklamak için kullan |
| RSS / WebSub | **Hayır** | Yayıncı hub'ı yok; RSS okurlar için, dizinleme için değil |

### 10.6 Kapsam ve log incelemesi (haftalık, 30 dakika)

1. **GSC → Pages:** dizine giren / girmeyen ve nedeni ("Crawled – currently not indexed", "Duplicate, Google chose different canonical", "Soft 404", "Blocked by robots"). En büyük beş kovayı kaydet.
2. **GSC → Performance:** sorgular ve sayfalar, son 28 gün ile önceki 28 gün. Gösterimi haftalık > %30 düşen sayfayı işaretle.
3. **GSC → Sitemaps:** çekildi mi, keşfedilen URL, hata. Sitemap'in çekilmeyi bırakması bir olaydır.
4. **Sunucu logları:** Googlebot/Bingbot isabet sayısı, 5xx oranı, 404 sıçramaları ve botların `noindex` URL'leri tarayıp taramadığı. 5xx > %1 veya yeni bir 404 sınıfı çıkarsa alarm.
5. **CrUX:** hacim oluşunca sayfa grubuna göre p75 LCP/INP/CLS.

Beş sayıyı `docs/en/SEO-LOG.md`'ye (yeni, haftada bir satır) yaz; böylece sonraki kararın hafızası değil geçmişi olur.

---

## 11. Fazlar

### P0 — taranabilir ve ölçülebilir (1–3 gün)

| Görev | Dosyalar | Kabul |
|---|---|---|
| Özel alan adını bağla; `*.vercel.app` → 308; `NEXT_PUBLIC_SITE_URL` ayarla | Vercel + env | `curl -I` özel hosta 308 gösterir; sitemap/robots/RSS hepsi onu basar |
| `metadataBase`, başlık şablonu, varsayılan açıklama, OG/Twitter varsayılanları, doğrulama | `[locale]/layout.tsx`, `src/lib/seo.ts` | tip başına bir URL benzersiz başlık taşır |
| `/models`, `/c/*`, `/m/*`, `/n/*`, `/news`, `/research`, `/glossary`, `/glossary/*`, `/stats`, `/` için `generateMetadata` | rota dosyaları | §4.2'deki başlık/açıklamalar |
| Her dizine uygun sayfada canonical + `en`/`tr`/`x-default` | `src/lib/seo.ts` + rotalar | denetim karşılıklılığı doğrular |
| Bilinmeyen model/haber/kategori için `notFound()`; 404 şablonu | 3 rota dosyası, `not-found.tsx` | 3/3 prob 404 döner |
| `/` ve locale'siz yollar için 308 | `middleware.ts` | `curl -w '%{http_code}'` = 308 |
| Sitemap: tipe göre böl, her model sayfasını ekle (P1 bunu yükleme daraltır), haber sınırını kaldır, `lastModified` ekle | `sitemap.ts` | ≥ 1 300 URL, 0 sorgu dizesi, hepsi 200 |
| robots: `/api/` yasak, sitemap listesi, AI tarayıcı politikası | `robots.ts` | metin §6.2 ile aynı |
| GSC + Bing doğrulaması, sitemap gönderimi, analitik | env + platform | property'ler doğrulandı, sitemap "Success" |

### P1 — dizin politikası ve yapısal veri (3–5 gün)

| Görev | Dosyalar | Kabul |
|---|---|---|
| `isIndexableModel`, `isIndexableNews`, `specCount` + birim testleri | `src/lib/seo.ts`, `tests/seo.test.ts` | bugün 430 model / 210 haber |
| Her sorgu varyantında `noindex,follow` + canonical (`page` istisna) | liste rotaları | filtreli URL'ler noindex ve çıplak rotaya canonical |
| `?q=`/`?cat=`/`?days=` üzerinde `noindex` | sözlük, istatistik | denetim geçer |
| JSON-LD yükseltmesi (SoftwareApplication, NewsArticle, ItemList, WebSite/Organization, BreadcrumbList) | rota dosyaları + `JsonLd.tsx` | Rich Results Test: 0 hata |
| RSS iç bağlantıları, `source`, `self`, enclosure | `lib/rss.ts`, `feed.rss/route.ts` | ilk `<link>` `/n/…` |
| ISR + önbellekli snapshot, `no-store`'u kaldır | rota dosyaları, `lib/store.ts` | yanıt `s-maxage` taşır |
| `seo-audit.ts` + `npm run seo-audit` + CI | `scripts/`, workflow | test dalında bilerek bozulan başlıkta düşer |

### P2 — içerik derinliği (1–2 hafta)

| Görev | Dosyalar | Kabul |
|---|---|---|
| Kart doldurma açlığını gider (bütçe ayır veya ayrı workflow adımı) | `lib/ingest.ts`, `.github/workflows/ingest.yml` | sunulan snapshot: 5 turda geçen modellerin ≥ %80'inde ≥ 200 karakter özet |
| Model sayfası: veriden türeyen bölümler, boş başlık yok, benzer modeller, provenance | `m/[slug]/page.tsx` | dizine uygun modellerde ≥ 150 kelime benzersiz düzyazı; yalnızca `—` ızgarası yok |
| Kategori girişi + SSS metni iki sözlükte | `i18n/*.json`, `c/[category]/page.tsx` | 9 × 2 sayfa, 150–250 kelime ve snapshot sayıları |
| Haber → model çözümü ingest'te | `lib/ingest.ts`, `lib/model-mentions.ts` | repo adı geçen haberlerin > %50'sinde `modelSlug` |
| 7 rehber; VRAM aracı yalnızca §7.5 koşulu tutarsa (9 `/best/*` sayfası P3'te, yalnızca her biri farklıysa) | yeni rotalar | her biri benzersiz veri tablosu + ≥ 150 kelime |
| Sözlük 15 → 25 terim, TR tanımlarla | `lib/glossary.ts`, sözlükler | 50 dizine uygun terim sayfası |
| OG görsel rotaları | segment başına `opengraph-image.tsx` | `og:image` 200, 1200×630, Türkçe glifler çizilir |

### P3 — otorite ve iterasyon (sürekli)

- `/stats`'tan ayda bir veri çalışması yayınla (ör. "1 400 açık ağırlıklı sürüm VRAM ve indirme hakkında ne söylüyor"), atıf bloğu ve CSV indirmesiyle; bu bağlantı mıknatısıdır.
- Çalışmayı bültenlere/topluluklara duyur (r/LocalLLaMA, Hacker News, TLDR AI) — ücretli bağlantı yok.
- En iyi 20 model çifti için küratörlü karşılaştırmalar; `?ids=` permütasyonları `noindex` kalsın.
- Üç aylık içerik tazeleme: hiç gösterim kazanmayan `noindex` sayfaları buda, kopyaları birleştir, kategori metnini güncelle.
- Deney günlüğü: başlık formülleri, açıklama formülleri, OG varyantları — her seferinde tek değişiklik, 28 günlük pencereler.

### 11.5 90 günlük takvim

| Hafta | Çıktı | Öncü metrik |
|---|---|---|
| 1 | P0: alan adı, metadata, canonical/hreflang, 404, 308, sitemap, robots, GSC/Bing | %100 benzersiz başlık; sitemap çekildi |
| 2 | P1: yüklemler, sorgu noindex, JSON-LD, RSS, ISR, denetim CI'ı | 0 soft 404; 0 sitemap/dizin çelişkisi |
| 3 | Ingest workflow'unda kart doldurma; model sayfası düzyazı bölümleri | Geçen modellerin ≥ %80'inde özet |
| 4 | Kategori girişleri + SSS metni; haber → model çözümü | 150+ kelimeli 18 kategori sayfası |
| 5 | Sözlük 15 → 20; 3 rehber (yerelde çalıştır, kod, görüntü) | 16 yeni dizine uygun sayfa (10 sözlük + 6 rehber) |
| 6 | Sözlük 20 → 25; 3 rehber (GGUF, quantization, VRAM) | Kanıtlı 10+ sözlük sayfası |
| 7 | Uyum sayfaları (`8 GB`, `16 GB`, `24 GB`) + `ollama vs llama.cpp` + hesaplayıcı kararı | Uyum sorgularında ilk gösterimler |
| 8 | Site/model/haber/sözlük OG görselleri; hub'lar için TR metin | Paylaşım önizlemeleri çiziliyor |
| 9 | `/stats`'tan ilk veri çalışması + CSV + atıf bloğu | İlk yönlendiren alan adları |
| 10 | Erişim: bültenler, r/LocalLLaMA, Show HN, awesome listeleri | 5–10 yönlendiren alan adı |
| 11 | Buda: rubrik < 6 sayfaları noindex; kopyaları birleştir; redirect haritası | Dizine giren/gönderilen oranı ↑ |
| 12 | İnceleme: GSC kapsamı, CWV, sorgu portföyü, sonraki çeyrek | 1. güne göre başlangıç |

### 11.6 Bağlantı kazanımı ve dijital PR

Bağlantılanabilir varlıklar, güç sırasına göre:

1. **Aylık veri çalışması** — `/stats`'tan, CSV ve atıf bloğuyla ("1 400 açık ağırlıklı sürüm VRAM ve indirme hakkında ne söylüyor"). Bir gazetecinin veya bültenin atıflayabileceği tek varlık bu.
2. **Uyum tabloları** ("8 GB'a sığan modeller, gerçek dosya boyutlarıyla") — hiçbir genel hesaplayıcıda yok.
3. **Canlı kanıtlı sözlük** (15–25 terim, her biri snapshot sayılarıyla).
4. **Açık snapshot/API** (`/api/stats`, `/api/feed`) — araştırmacılar ve küçük araçlar için.

Hedefler ve kurallar:

| Hedef | Açı | Kural |
|---|---|---|
| GitHub `awesome-local-llm` / `awesome-llm` listeleri | Ana sayfa değil, belirli bir sayfa (çalışma veya uyum tablosu) | PR aç; toplu gönderim yok |
| r/LocalLLaMA haftalık başlıkları | Gerçek bir soruyu veriyle yanıtla, yalnızca yardımcı olduğunda bağlantı ver | Drive-by gönderi yok; yazarlığı açıkla |
| Hacker News **Show HN** | Tracker + veri çalışması, bir kez | Tek lansman; tekrar yok |
| Bültenler (TLDR AI, Ben's Bites, Import AI, Last Week in AI) | Aylık bulgu, 3 cümle + bağlantı | Ücretli yerleşim yok; toplu e-posta yok |
| Model yazarları / runtime repoları | Sürümleri hakkında doğru, faydalı bir sayfa | Yalnızca sayfa değer katıyorsa; bağlantı talebi yok |
| Üniversite ders sayfaları / okuma listeleri | Sözlük + veri kümesi | Yalnızca gerçekten ilgiliyse |

Ölçüm: yönlendiren alan adları (GSC Links), iniş sayfaları, anchor metni ve bağlantılanan sayfaların dizine uygunluğu. Bağlantı satın alma, bağlantı değişimi yapma veya karşılıklı ortak dizini kurma.

### 11.7 Budama ve tazeleme

- Aylık: **90 günde 0 gösterim** alan ve rubrik puanı **< 6** olan sayfa `noindex` olur; bir üst sayfanın kopyasıysa ona 301; değerli ama inceyse zenginleştir.
- Arka bağlantısı olan URL asla silinmez. `docs/en/REDIRECTS.md` (yeni) içinde redirect haritası tut ve denetim betiğinde test et.
- Snapshot sayıları > %20 kayınca kategori girişlerini ve uyum rehberlerini tazele.
- Sitemap ile dizin politikasını senkron tut: `noindex`'e dönen sayfa aynı commit'te sitemap'ten çıkar.

---

## 12. Doğrulama (komutlar)

```bash
# 1. Başlıklar rota tipine göre benzersiz
for u in /en /en/models /en/c/llm /en/m/<slug> /en/news /en/glossary/gguf /en/stats; do
  printf "%s: " "$u"; curl -s "http://localhost:3000$u" | rg -o '<title>[^<]*' | head -1
done

# 2. Canonical + hreflang
curl -s http://localhost:3000/en/m/<slug> | rg -o 'rel="canonical"|hreflang="[^"]*"'

# 3. Soft 404'ler
for u in /en/m/nope /en/n/nope /en/c/nope; do
  printf "%s -> " "$u"; curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3000$u"
done

# 4. Yönlendirme durumu
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' http://localhost:3000/models

# 5. Sitemap bileşimi
curl -s http://localhost:3000/sitemap.xml | rg -c '<url>'
curl -s http://localhost:3000/sitemap.xml | rg -c '/m/'
curl -s http://localhost:3000/sitemap.xml | rg -c '\?'

# 6. Önbellek
curl -sI http://localhost:3000/en/m/<slug> | rg -i '^cache-control'

# 7. JSON-LD tipleri
curl -s http://localhost:3000/en/m/<slug> | rg -o '"@type":"[^"]*"' | sort -u

# 8. Robots
curl -s http://localhost:3000/robots.txt

# 9. Denetim + birim testleri
npm run seo-audit
npm test
```

P0/P1 sonrası beklenen: 7/7 farklı başlık, 3 canonical/hreflang çifti, 3/3 404, 2× 308, ≥ 1 300 URL'li sitemap'te 0 `/m/` eksiği ve 0 `?`, `s-maxage`, `SoftwareApplication` + `BreadcrumbList`, `/api/` yasaklı.

---

## 13. Riskler ve kapsam dışı

| Risk | Azaltma |
|---|---|
| 3 286 URL'den dizin şişmesi | Yüklem + noindex + sitemap dışlama; 1 342 ile başla |
| İnce model sayfaları | Kart doldurma P2 kapısıdır; düzyazı veya ≥ 4 spec olmadan dizine alma |
| Neredeyse kopya TR sayfalarda hreflang | Hub/sözlük/rehberlerde gerçek TR metin; TR varlık politikasını açıkça kararlaştır (§7.6) |
| Hugging Face'e karşı haber kopya içeriği | Özet + atıf + `isBasedOn` + gövdeyi asla yeniden yayınlama |
| HF istek bütçesinin aç kalması | Kart doldurma kendi bütçesini veya kendi workflow adımını alır |
| ISR eski snapshot sunar | 10 dakikalık ingest'e karşı 5–15 dakika TTL; sayfa snapshot zamanını basar |
| Alan adı taşıma | Platformda 308, GSC "Adres değişikliği", eski hostu ≥ 12 ay 308'de tut |
| `noindex`'i ceza düzeltmesi sanmak | Bu bir dizin kalitesi aracıdır, sıralama kaldıracı değil; sayfa nitelik kazanınca kaldır |
| Analitik gizliliği | Çereksiz Plausible/Vercel Analytics; çerez yoksa onay banner'ı gerekmez |
| Kart özeti lisansı | ≤ 600 karakter, atıf + bağlantı, model lisansına uy; talep üzerine kaldır |

**Kapsam dışı:** bağlantı satın alma, doorway sayfaları, otomatik model incelemeleri, 1 400 kartın makine çevirisi, anahtar kelime doldurulmuş başlıklar, beğeniden `aggregateRating`, `noindex` sayfalar için sitemap kaydı.

---

## 14. Açık sorular (sahibin kararı)

1. **Özel alan adı şimdi mi?** `openweightradar.com` NXDOMAIN; dağıtılan host `local-ai-news.vercel.app`. Otorite son alan adında başlamalı, sonra taşınmamalı.
2. **AI tarayıcı politikası:** GPTBot/ClaudeBot/PerplexityBot/Google-Extended'a izin (öneri) mi, aramaya izin verip eğitime kapatmak mı?
3. **Veri kümesi lisansı:** `/stats` + `/api/stats` atıflanabilir bir veri kümesi olarak yayınlanabilir mi (ör. CC BY 4.0)? `Dataset` şeması ve aylık çalışma için gerekli.
4. **TR varlık sayfaları:** çevir, İngilizce + TR kabuk olarak tut veya `noindex` yap? Birini seç.
5. **Kapıyı geçmeyen modeller:** sonsuza kadar `noindex` mi, ≥ 6 spec olanlar (bugün 25) dizine mi?
6. **Analitik:** Vercel Analytics mi Plausible mı; property kime ait?

---

## 15. Bitiş tanımı

- [ ] Özel alan adı canlı; tek kanonik host; `*.vercel.app` ona 308.
- [ ] Her rota tipinin EN ve TR'de benzersiz, veriden türeyen başlığı ve açıklaması var.
- [ ] Her dizine uygun sayfada kendine canonical ve karşılıklı `en`/`tr`/`x-default` var.
- [ ] Her dizine uygun sayfada OG görseli ve Twitter card var.
- [ ] `robots.txt` `/api/`'yi yasaklıyor, sitemap'i listeliyor ve AI tarayıcı politikasını yazıyor.
- [ ] Sitemap tüm dizine uygun URL'leri, sorgu dizesi olmadan, `lastModified` ile ve `noindex` URL'siz içeriyor.
- [ ] Bilinmeyen model/haber/kategori URL'leri `noindex` ile 404 dönüyor.
- [ ] `/` ve locale'siz yollar 308 dönüyor.
- [ ] Sorguyla filtrelenmiş sayfalar `noindex,follow` ve çıplak rotaya canonical; `page` kendine canonical.
- [ ] Model dizin yüklemi: `qualityPassed && (specCount ≥ 4 || summary ≥ 200)`; birim testli.
- [ ] `SoftwareApplication`, `NewsArticle`, `ItemList`, `BreadcrumbList`, `WebSite`, `Organization` JSON-LD'leri doğrulanıyor.
- [ ] RSS öğeleri `/n/{id}`'ye bağlanıyor, `<source>` ve `rel="self"` taşıyor.
- [ ] HTML ISR önbellekli; tek `no-store` yüzeyi `/api`.
- [ ] Kart doldurma her ingest'te çalışıyor; kapıyı geçen modellerin ≥ %80'inde özet var.
- [ ] Kategori sayfalarında 150–250 kelime çevrilmiş giriş + SSS var.
- [ ] Yedi rehber yayınlandı; VRAM hesaplayıcı yalnızca gerçek GGUF dosya boyutlarını okuyup model sayfalarına bağlanıyorsa yayınlandı (§7.5).
- [ ] Her dizine uygun sayfa içerik rubriğinde ≥ 8/12 alıyor; < 6 sayfalar `noindex`.
- [ ] IndexNow anahtarı sunuluyor ve her yayında değişen model/haber URL'leri pingleniyor.
- [ ] §2.1'deki rakip/SERP varsayımları P2 öncesi yeniden kontrol edildi ve sonuç §17'ye yazıldı.
- [ ] Alan adı taşıma runbook'u uygulandı; eski host ≥ 12 ay 308; hiçbir yerde karışık hostlu canonical yok.
- [ ] `docs/en/SEO-LOG.md` haftada bir satırla beş GSC/log sayısını taşıyor.
- [ ] GSC ve Bing property'leri doğrulandı; sitemap gönderildi; analitik olayları kaydediyor.
- [ ] `npm run seo-audit` CI'da geçiyor ve bozuk başlık/canonical/404/sitemap'te düşüyor.
- [ ] `/`, `/models`, `/c/*`, `/m/*`, `/news`, `/glossary/*`, `/stats` üzerinde Lighthouse SEO 100.
- [ ] CrUX'ta p75 LCP < 2,5 sn, INP < 200 ms, CLS < 0,1.

---

## 15.1 Uygulama günlüğü — P0 (2026-10-21)

Tamamlananlar:

- `src/lib/seo.ts` — canonical/alternate üreticileri, `specCount`/`isIndexableModel`/`isIndexableNews`, model/haber başlık ve açıklama üreticileri, liste yüzeyleri için `listMetadata`.
- `[locale]/layout.tsx` — `metadataBase`, başlık şablonu, varsayılan açıklama, OG/Twitter varsayılanları, robots direktifleri, env'den GSC/Bing doğrulaması.
- Ön sayfa, `/models`, `/c/*`, `/m/*`, `/n/*`, `/news`, `/research`, `/glossary`, `/glossary/*`, `/stats` ve `/compare` üzerinde `generateMetadata`.
- Her dizine uygun rotada canonical + `en`/`tr`/`x-default`. Filtreli görünümler `noindex, follow` ve çıplak rotaya canonical; yalnızca `?page=N` `/models` ve `/c/*` üzerinde kendine canonical.
- Bilinmeyen model/haber/kategori için `notFound()`; 3/3 probda gerçek 404. Next 16.4.0 HTML gövdesinde hâlâ kendi yerleşik 404 kabuğunu çiziyor (iç içe `not-found.tsx` dosyaları derleniyor ama kabuk tarafından kullanılmıyor); durum ve `noindex` doğru, gövde takip işi.
- `/` ve locale'siz yollar için `308`, `Vary: Accept-Language` ile — CDN TR yönlendirmesini EN okura sunamasın.
- Sitemap: **1 342 URL** (32 çekirdek + 30 sözlük + 860 model + 420 haber), sorgu dizesi yok, `noindex` URL yok, gerçek `lastModified`, `x-default` ve snapshot'ta varsa görsel kayıtları.
- `robots.txt`: `Disallow: /api/`, sitemap, açık AI tarayıcı izin listesi.
- Sitemap taramasının bulduğu gizli 500 düzeltildi: `getNewsItem` ham satırı döndürüyordu; `organization` alanı nesne olan 40 makalenin detay sayfası (`{_id, name, fullname, avatar}`) çöküyordu — iki locale'de **80 URL**. Detay yolu artık listenin kullandığı `normalizeNews` korumasını kullanıyor.

Doğrulama, üretim derlemesi ve kanonik host yerel sunucuya eşlenerek:

| Kontrol | Sonuç |
|---|---|
| 200 dönen sitemap URL'si | **1 342 / 1 342** |
| `noindex` taşıyan sitemap URL'si | **0** |
| Canonical uyuşmazlığı | **0** |
| `en`/`tr`/`x-default` eksik sayfa | **0** |
| Locale başına benzersiz başlık | **671 / 671**, 0 kopya, 0 boş |
| 404 probu | **3 / 3** |
| Yönlendirme probu | **2 / 2** 308, `Vary: Accept-Language` |
| Filtreli görünüm | `noindex, follow`, canonical `/en/models` |
| İnce model | `noindex` ve sitemap'te yok |
| `typecheck` / `lint` / `test` | geçti / geçti / **176 geçti** |

Plandan sapmalar:

- **Dört değil tek sitemap.** Next 16, `generateSitemaps` çocuklarını `/sitemap/{id}.xml` altında üretiyor ama `/sitemap.xml` indeksi üretmiyor; 1 342 URL 50 000 sınırının çok altında, bölme P1'e veya hacme kalıyor.
- **Yerleşik 404 gövdesi.** Durum, `noindex` ve tarama davranışı doğru; markalı 404, iç içe `not-found` HTML kabuğunda çizilene kadar bekliyor.
- **Hesaplar hâlâ sahibin işi.** GSC/Bing property'leri ve analitik oluşturulmadı; doğrulama env değişkenleri ve olay planı hazır.
- **Özel alan adı hâlâ NXDOMAIN.** P0'ın otorite yarısı, sahip alan adını bağlayana kadar tamamlanamaz.

---

## 16. Ek A — uygulama haritası

| Dosya | Değişiklik | Faz |
|---|---|---|
| `src/lib/seo.ts` (yeni) | `BASE`, `canonical()`, `languages()`, başlık/açıklama üreticileri, `specCount()`, `isIndexableModel()`, `isIndexableNews()`, JSON-LD üreticileri | P0–P1 |
| `src/app/[locale]/layout.tsx` | `metadataBase`, varsayılanlar, `Organization` + `WebSite` JSON-LD | P0 |
| `src/app/[locale]/page.tsx`, `models`, `c/[category]`, `news`, `research`, `stats`, `glossary`, `glossary/[slug]` | title/description/canonical/alternates/OG ile `generateMetadata` | P0 |
| `src/app/[locale]/m/[slug]/page.tsx` | metadata, 404, `SoftwareApplication` + `BreadcrumbList`, veriden türeyen bölümler, benzer modeller | P0/P2 |
| `src/app/[locale]/n/[id]/page.tsx` | metadata, 404, `NewsArticle` + `BreadcrumbList`, ilgili bağlantılar | P0/P1 |
| `src/app/[locale]/c/[category]/page.tsx` | kategori doğrulama → 404, giriş metni, `ItemList` | P0/P2 |
| `src/app/[locale]/glossary/[slug]/page.tsx` | metadata, `dateModified`, ilgili bağlantılar | P0/P2 |
| `src/app/sitemap.ts` | `generateSitemaps` bölünmesi, yüklemler, `lastModified`, `images`, `x-default` | P0–P1 |
| `src/app/robots.ts` | `/api/` yasağı, sitemap, AI tarayıcı kuralları | P0 |
| `src/middleware.ts` | `/` ve locale'siz yollar için 308; statik dosya muafiyetlerini koru | P0 |
| `src/lib/store.ts` | önbellekli snapshot fetch; sayfa verisinden `no-store`'u kaldır | P1 |
| `src/lib/ingest.ts` | detay doldurmadan önce kart bütçesini ayır; haber için `modelSlug` çöz | P2 |
| `src/lib/rss.ts`, `src/app/feed.rss/route.ts` | iç bağlantılar, `<source>`, `rel="self"`, enclosure, `alternates.types` | P1 |
| `src/app/[locale]/opengraph-image.tsx` + `m/[slug]`, `n/[id]`, `glossary/[slug]` | commit edilmiş TTF ile 1200×630 `ImageResponse` (Türkçe glifler) | P2 |
| `src/app/[locale]/not-found.tsx` (yeni) | arama + üst bağlantılarla faydalı 404 | P0 |
| `scripts/seo-audit.ts` (yeni), `package.json`, `.github/workflows/seo.yml` (yeni) | 10 maddelik denetim + CI | P1 |
| `tests/seo.test.ts` (yeni) | yüklemler, başlık/açıklama üreticileri, canonical/hreflang çiftleri | P1 |
| `docs/en/SEO-LOG.md`, `docs/tr/SEO-LOG.md` (yeni) | haftalık beş sayı günlüğü | P1 |
| `docs/en/REDIRECTS.md`, `docs/tr/REDIRECTS.md` (yeni) | budanan/birleştirilen sayfalar için redirect haritası | P3 |

## 17. Ek B — revizyon günlüğü

| Sürüm | Tarih | Değişiklik |
|---|---|---|
| v1 | 2026-10-20 | Ölçülmüş başlangıç, rota/dizin matrisi, metadata şartnamesi, yapısal veri, sitemap/robots/RSS, içerik derinliği, fazlar ve doğrulama. |
| v2 | 2026-10-20 | Rakip/SERP kanıtı (§2.1), sorgu portföyü (§2.2), gerçekçi SERP özellikleri (§2.3), taşıma runbook'u (§3.5), rubrik (§7.7), bağlantı matrisi (§8.1), enstrümantasyon/dizinleme/log incelemesi (§10.4–10.6), 90 günlük takvim (§11.5), bağlantı kazanımı (§11.6), budama (§11.7), uygulama haritası (§16) eklendi. Düzeltmeler: Software App zengin sonucu puanlama olmadan ulaşılamaz; FAQ/HowTo işaretlemesi kaldıraç değil; genel VRAM hesaplayıcı koşullu. |
| v2.1 | 2026-10-21 | P0 uygulandı; §15.1 doğrulamayı, gizli 500 hatasını ve üç sapmayı (tek sitemap, yerleşik 404 kabuğu, sahip hesapları) kaydediyor. |

Sonraki revizyon §2.1'deki arama anlık görüntüsünü kayıtlı bir SERP denetimiyle (tarih, sorgu, ilk 10 URL, özellik tipi) değiştirmeli ve göreceli KPI'ları ilk dört haftalık GSC verisiyle yenilemeli.
