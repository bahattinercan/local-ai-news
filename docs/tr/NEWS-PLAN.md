# Haber ve AI-detay genişletme planı (TR)

> İngilizce kaynak: [docs/en/NEWS-PLAN.md](../en/NEWS-PLAN.md)
> Durum: **plan, 2026-10-15'te canlı veriyle doğrulandı.** Aşağıdaki her sayı ölçüldü, varsayılmadı. Komutlar §7'de.

Kapsam: site *local AI haberlerini* göstersin (bugün arXiv benzeri bir araştırma akışı gösteriyor) ve *AI detayına* erişim sağlasın. [PLAN.md](PLAN.md) kilitli karar 3'ü ("yalnızca Hugging Face") revize ettiği için mutlaka bir [DECISIONS.md](DECISIONS.md) kaydıyla birlikte inmelidir.

---

## 1. Ölçülmüş başlangıç noktası

Canlı snapshot (private Vercel Blob, `generatedAt 2026-10-15T20:54Z`): **1062 model + 154 haber**.

### 1.1 Haber sayfası bir local-AI haber sayfası değil

| Ölçüm | Değer |
|---|---|
| türe göre haber | `paper` 150, `release` 4 |
| local/runtime terimi geçen (llama.cpp, gguf, vram, quantiz…) | eski snapshot'ta **28 / 104 (%27)** |
| `summary` var | 154 / 154 (%100) |
| `summary` uzunluğu | min 25, medyan **1526**, max 1917 → 150 / 154 kartın 280 karakterlik sınırını aşıyor |
| `url`, `thumbnail`, `upvotes` | %100, %98, %96 |
| `organization` | 120 / 154 (%78) |
| `modelSlug`, `categoryKey` | **7 / 154 (%5)** ← haberden modele bağlantı neredeyse hiç kurulmuyor |

Yani HF `daily_papers` ağırlıklı ve `modelSlug` bir "ilgili model" bloğu kurmak için fazla seyrek.

### 1.2 Model detay verisi zayıf, bir kısmı hiç geri doldurulamaz

| Alan | Kapsama (1062 model) | Kapıyı geçen 388 içinde |
|---|---|---|
| `paramsTotal` | 77 (%7) | 76 (**%20**) |
| `paramDtypes` | 77 (%7) | — |
| `vramEstGb` | 76 (%7) | — |
| `quantizations` | 225 (%21) | — |
| `storageBytes` | 311 (%29) | — |
| `runners` | 709 (%67) | — |
| `sampleImages` | 9 (%1) | — |
| `spaces` | 21 (%2) | — |

**`paramsTotal` neden yalnızca %7:** değer detay endpoint'indeki `safetensors.parameters`'tan geliyor; GGUF repolarında bu yok. Kütüphaneye göre kırılım: `libraryName=gguf` → 46 model, `paramsTotal` **%0**, ama `quantizations` %70. Yerel çıkarım için en önemli modeller, tam da parametre sayısı olmayanlar.

**Detay sorguları sınırlı ve hiç tekrarlanmıyor.** Son CI koşusu: `gate passed: 407`, `detail lookups: 300`, `requests used: 319 / 400` → 107 kapı-geçen model hiç detay almadı. `src/lib/ingest.ts:157`'de bilinen model zenginleştirmeden **önce** atlanıyor (`if (seen.has(normalized.externalId)) continue;`), yani o modeller sonraki koşularda da asla zenginleşmeyecek. Depolama detayı biriktirmiyor, yalnızca satır biriktiriyor.

**Çekilip atılan veri:** `src/lib/sources/hf.ts:202-207` `siblings` (dosya listesi), `cardData` (model kartı) ve `usedStorage` alanlarını ayrıştırıyor, ama `ClassifiedModel` (`src/lib/model.ts`) bunlar için alan tanımlamıyor.

### 1.3 Çürütüldü: parametreyi dosya boyutundan türetmek

GGUF boşluğu için akla gelen çözüm — `paramsTotal ≈ storageBytes / bytesPerParam(kuantizasyon)`, mevcut `BYTES_PER_PARAM` tablosuyla (`src/lib/runner/vram.ts`) — **çalışmıyor**. Her iki değeri de olan 51 modelde test edildi:

| Sonuç | Sayı |
|---|---|
| beyan edilen `paramsTotal`'ın ±%30'u içinde | **23 / 51 (%45)** |
| en kötü sapma | **108×** (`muhammad-taqi512/SLORA-LTX`: türetilen 208 GB, beyan 1.92 B) |

Sebep: `usedStorage` repodaki **tüm** dosyaları sayıyor (çoklu kuantizasyon, LoRA adaptörleri, optimizer state), ana ağırlıkları değil. Karar: **bu türetmeye dayanan VRAM hesaplayıcı yayınlanmaz.** Hesaplayıcı yalnızca gerçek `paramsTotal` olan yerde görünür, ya da kullanıcı parametreyi elle girer.

### 1.4 Gerçekten çalışan kaynaklar (canlı test)

| Aday | HTTP | Öğe | Kullanılabilir |
|---|---|---|---|
| `r/LocalLLaMA/.rss` | ilk istek 200, **seri isteklerde 429** | 25 | evet, cooldown ile |
| `ggml-org/llama.cpp/releases.atom` | 200 | 10 | evet |
| `ollama/ollama/releases.atom` | 200 | 10 | evet |
| `vllm-project/vllm/releases.atom` | 200 | 10 | evet |
| HN Algolia `search_by_date` | 200 (JSON) | konu araması | opsiyonel |
| `simonwillison.net/atom/everything/` | 200 | 30 | opsiyonel |
| `huggingface.co/blog` | 200, **HTML** | 0 | feed yok |
| `lmstudio.ai/changelog` | 200, **HTML** | 0 | feed yok |

Reddit tarayıcı `User-Agent` + `Accept` başlıklarını istiyor; iki saniye arayla üç ardışık istek de **429** döndü. Bu yüzden 200 dışı her yanıt "mevcut öğeleri koru" olarak ele alınmalı, "akışı boşalt" değil.

---

## 2. Kod yolunun dayattığı kısıtlar

Planı değiştirdiği için kodu okuyarak doğrulandı:

1. **Yeni `kind` değerleri okuyucu için güvenli.** `isUsable()` (`src/lib/store.ts:72`) yalnızca `models`'in boş olmayan bir dizi olduğunu kontrol ediyor; `news` veya `kind`'ı doğrulamıyor. Yani `runtime` / `community` yayınlamak çalışan uygulamanın snapshot'ı reddetmesine yol açmaz.
2. **Yeni `kind` değerleri arayüz ve sorgu ayrıştırıcı için güvenli değil.** `t()` anahtar yoksa anahtarın kendisini döndürüyor (`dict[key] ?? key`), yani eksik sözlük kaydı ekranda birebir `news.runtime` yazısını gösterir. `newsQuerySchema.kind` bir `z.enum(["paper","release","announcement"])` (`src/lib/query.ts:67`), yani enum genişletilene kadar `?kind=runtime` zod hatası fırlatır.
3. **`externalId` dedupe anahtarı** ve zaten önekle isimlendirilmiş (`paper.id`, `release:<model>`). Yeni kaynaklar da uymalı: `reddit:<id>`, `gh:<owner/repo>:<tag>`.
4. **`MAX_SNAPSHOT_NEWS = 1000`** (`src/lib/ingest.ts:210`), bugün 154 satır → ~846 satır boşluk. Sınır değişikliği gerekmiyor.
5. **`sources-check` CI'da ingest'ten önce çalışıyor ve Hugging Face'e sabitlenmiş.** `scripts/verify-sources.ts` sabit dört kontrol için doğrudan `HfClient` çağırıyor ve devre dışı olanları sabit yazıyor. Buraya bağlanmayan yeni bir adaptör, CI sağlık raporunda sessizce yer almaz.
6. **`registry.ts` genel, veri çekme değil.** `SourceDefinition` (key/baseUrl/tier/enabled/note) yeni kaynaklara uyuyor, ama çeken her şey `hf.ts` içinde. Yeni kaynaklar kendi adaptör modülünü gerektirir.

---

## 3. Sayısal eşikler

| # | Eşik | Eşik tutmazsa fallback |
|---|---|---|
| G1 | Parametre/VRAM arayüzü yalnızca `paramsTotal != null` olan yerde (bugün kapı-geçenlerin %20'si) | Spec satırı hiç gösterilmez, `—` olarak gösterilmez; hesaplayıcının erişilebilir kalması için elle "parametre sayısı gir" alanı sunulur |
| G2 | Parametre **asla** `storageBytes`'tan türetilmez (çürütüldü, %45 doğruluk) | İleride istenirse yeniden ölçülür ve etkinleştirmeden önce ±%30 içinde ≥ %90 şartı aranır |
| G3 | Haber öğesinde "ilgili model" bloğu `modelSlug` gerektirir (%5 kapsama) | Blok tamamen atlanır; boş bölüm render edilmez |
| G4 | Yeni kaynak ancak `sources-check` onun için 200 ve items > 0 raporlarsa devreye girer | `registry.ts`'te `enabled: false` kalır, ölçülen hata `note`'a yazılır |
| G5 | Reddit ingest'i 429'a dayanıklı olmalı | 200 dışı her yanıtta o kaynağın önceki öğeleri korunur ve hata sağlık raporuna yazılır; asla boş kaynak yayınlanmaz |

---

## 4. Fazlar

### Faz 0 — Sağlık kontrolü ve şema altyapısı (ön koşul)
- `scripts/verify-sources.ts`: sabit HF listesi yerine registry tabanlı döngü, kaynak başına `check()` çağrısı → `enabled: true` "CI'da kontrol ediliyor" anlamına gelsin.
- `src/lib/sources/registry.ts`: `SourceDefinition`'a `check` metadata'sı eklenir; her yeni kaynak G4 geçene kadar `enabled: false` kalır.
- `src/lib/query.ts`: `newsQuerySchema.kind` genişletilir; `src/i18n/dictionaries/{en,tr}.json`: `news.runtime`, `news.community` eklenir (kısıt 2).
- Kabul: `npm run sources-check --dry` hâlâ geçer; typecheck/lint/test yeşil.

### Faz 1 — Model detayları (A1), G1/G2 ile sınırlı
- `src/lib/model.ts`: opsiyonel `siblings?: string[]`, `cardData?: Record<string, unknown>`, `usedStorage?: number | null`.
- `src/lib/ingest.ts`: `normalizeModel` bunları korusun; `siblings` eksik olan satırları zenginleştiren bir **geri doldurma geçişi** eklensin — `seen`'e değil alanın varlığına bakarak (bkz. §1.2). `maxDetailLookups` 300'den bütçe tavanına doğru yükseltilsin: son koşu 319/400 kullandı, yani ~370 karşılanabilir.
- Model sayfası: kuantizasyon dosya tablosu (ad + boyut), model kartı metadata'sı (base model, etiketler, lisans detayı), gerçek disk boyutu.
- VRAM hesaplayıcı: yalnızca `paramsTotal` varsa render edilir, yoksa elle parametre girişi (G1).
- Kabul: spec sheet hiç `—` satırı basmaz; dosya tablosu zenginleştirilmiş her modelde görünür.

### Faz 2 — Gerçek local-AI haberleri (B1 + C1 + D1)
- Yeni adaptör `src/lib/sources/feeds.ts` (RSS 2.0 + Atom; bu dört feed için `<item>`/`<entry>` ayrıştırmak yeterli, yeni bağımlılık gerekmez — alternatif `fast-xml-parser`; uygulama anında karar verilir).
- Kaynaklar, değer sırasına göre: `r/LocalLLaMA`, `llama.cpp`, `ollama`, `vLLM`.
- `kind`: `runtime` (runtime sürümleri) ve `community` (Reddit) eklenir. `paper` ve `release` aynen kalır.
- Yeni `externalId` önekleri: `reddit:`, `gh:`.
- 200 dışı → önceki öğeler korunur (G5); sağlık raporuna yazılır.
- Arayüz: yeni tür renkleri; enum genişletildikten sonra haber sayfası filtresi zaten çalışır (Faz 0).
- Kabul: `/news` en az 3 farklı tür gösterir; zorlanmış 429 akışı değiştirmez.

### Faz 3 — Haber detay sayfası (A3)
- `/{locale}/n/[id]` rotası, saklanan `summary` ile (medyan 1526 karakter, yani dışarı linklemek yerine gerçek bir sayfa hak ediyor).
- Kaynak atfı + orijinale link; tam metin yeniden yayınlanmaz (D1).
- İlgili model bloğu yalnızca `modelSlug` varsa (G3).
- Kabul: 154 haberin her biri çalışan kaynak linkiyle bir detay sayfası render eder.

### Faz 4 — Opsiyonel: kavram sözlüğü (A2)
İki dilli açıklayıcı sayfalar (quantization, VRAM, MoE, LoRA, context window, GGUF vs safetensors). İçerik yazımı ve iki dilde bakım gerektirir; bilinçli olarak en sonda.

---

## 5. Sıra ve geri dönüş

Faz sırası önemli: **Faz 0, Faz 2 ile birlikte inmeli**, çünkü enum ve sözlük anahtarları yokken yayınlanan yeni bir `kind`, arayüzde birebir `news.runtime` olarak görünür (kısıt 2). Faz 1 bağımsızdır ve önce inebilir.

Doküman yükümlülüğü: `PLAN.md`'deki kilitli karar 3 revize edilir (EN + TR) ve gerekçe `DECISIONS.md`'ye yazılır (EN + TR).

---

## 6. Riskler

- Reddit, "community" haberleri için tek hata noktası ve seri isteklerde rate-limit veriyor. Bonus kaynak olarak kalmalı, tek kaynak olmamalı.
- Reddit içeriği kullanıcı üretimi: yalnızca başlık + kısa özet + link saklanmalı, atıf korunmalı.
- Faz 1'in geri doldurması, hâlihazırda 319/400 kullanan bir ingest koşusuna istek ekliyor. `maxRequests` yükseltilmeden detay tavanını yükseltmek `budgetExhausted`'a yol açabilir; bu durum koşuyu kategori ortasında bitiriyor.
- Kaynak eklemek haber tablosunu `MAX_SNAPSHOT_NEWS = 1000`'e doğru büyütür; 4 kaynak × koşu başına 10-25 yeni öğe ile bu uzak bir risk, ama budama kuralı (`publishedAt`'e göre sırala, 1000'i kes) planda belirtilmeli.
- Snapshot şema değişiklikleri geriye dönük uyumlu kalmalı: deploy edilmiş uygulama, CI'ın üzerine yazdığı aynı Blob'u okuyor.

## 7. Bu ölçümleri yeniden üretme

```bash
# canlı snapshot (private blob; token .env'den gelir, hiç ekrana basılmaz)
TOKEN=$(tr -d '\r' < .env | grep '^BLOB_READ_WRITE_TOKEN=' | cut -d'=' -f2-)
URL=$(tr -d '\r' < .env | grep '^SNAPSHOT_URL=' | cut -d'=' -f2-)
curl -s -H "Authorization: Bearer $TOKEN" "$URL" -o .shots/live-snapshot.json

# CI ingest raporu (gate passed / detail lookups / budget)
gh run view --log | grep -E "gate passed|detail lookups|requests used"

# kaynak sağlığı
npm run sources-check        # canlı   (çevrimdışı fixture için --dry)
```
