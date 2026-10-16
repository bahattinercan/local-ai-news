# Tasarım Sistemi ve Redesign Planı — OpenWeight Radar

> İngilizce kaynak: [docs/en/DESIGN.md](../en/DESIGN.md)
> Durum: **uygulandı (Faz 0–7), 2026-10-14'te doğrulandı.** Aşağıdaki tüm sayılar 2026-10-14'te canlı dev sunucusu (`localhost:3101`) ve servis edilen snapshot (`data/feed.json`, 915 model / 104 haber) üzerinden ölçüldü.

---

## 1. Ölçülmüş teşhis (mevcut arayüz neden "basit" görünüyor)

| Ölçüm | Değer | Komut / formül |
|---|---|---|
| `--surface` vs `--bg` kontrastı | **1.15:1** | `#141821`'in `#0b0e14` üzerindeki WCAG luminans oranı |
| `--border` vs `--surface` kontrastı | **1.33:1** | `#232a36` / `#141821` |
| `/tr` sayfa yüksekliği @1440px | **5596 px**, 60 kart | CDP `document.documentElement.scrollHeight` |
| `/tr` sayfa yüksekliği @360px | **18030 px** (~20 ekran) | aynı |
| Yatay taşma | 360/390/768/1280/1440'da 0 px | `scrollWidth - innerWidth` |
| Metin kontrastı | body 14.69:1, muted 7.81:1 | WCAG oranı, geçiyor |
| Navigasyon kapsamı | `TabBar` **sadece kategorileri** basıyor | `src/components/TabBar.tsx` — `nav.news`, `nav.stats`, `nav.compare` sözlüklerde var ama hiç render edilmiyor |
| `/favicon.ico` | **200 ama `text/html`** | `curl -I` — ikon olarak uygulama HTML'i dönüyor |
| Stats `days` parametresi | sayfa okuyor, **UI kontrolü yok** | `src/app/[locale]/stats/page.tsx` |
| Footer / atıf | **yok** | layout'ta footer elemanı yok |

Sonuç: düzlük bir zevk meselesi değil, **1.15:1 yüzey ayrımı + hiyerarşi eksikliği + sahipsiz sayfalar**. "Modern" görünen bir şey koymadan önce token ve yapı düzeltilmeli.

---

## 2. Veri gerçekliği (her görsel özellik için eşik)

| Alan | Servis edilen snapshot'ta kapsama | Tasarım sonucu |
|---|---|---|
| `sampleImages` | **8 / 915 (%0.9)** | Resim-öncelikli kart ölü. Kart **veri-öncelikli**; thumbnail yalnızca varsa, yoksa author glyph'i. |
| Haber `thumbnail` | **101 / 104 (%97)** | Haber sayfası resim-öncelikli olabilir. |
| `downloads > 0` | 712 / 915 (%78) | Popülerlik barı kullanılabilir. |
| `likes > 0` | 350 / 915 (%38) | Like gösterilir ama birincil metrik olmaz. |
| `runners` | 608 / 915 (%66) | Runner chip'leri varsa. |
| `storageBytes` | 272 / 915 (%30) | Varsa gösterilir. |
| `quantizations` | 198 / 915 (%22) | Sadece detay sayfası. |
| `vramEstGb` | 74 / 915 (%8) | Detay + karşılaştırma; kart metriği olarak kullanılmaz. |
| `license` | 259 / 915 (%28) | Null ise hiç gösterilmez. |
| `trendingScore` | **0 / 915 (hepsi null)** | **Trending arayüzü yok.** Filtre barındaki `sort=trending` seçeneği **no-op** (tüm değerler null). Ya kaldırılır ya da okuma anında skor türetilir (`likes + downloads / yaş`) — Faz 2 ikincisini yapıyor. "Şu an sıcak" = aktif pencerede indirme sayısı. |
| `firstSeenAt` distinct gün | **2** (2026-10-13, 2026-10-14) | Zaman-serisi grafiği eşiği: trend grafiği yalnızca ≥ 3 distinct gün varsa render edilir; yoksa sadece kategori bar'ları. |

**Sayısal eşik:** backing alanı %50'nin altında kapsamasına sahip her görsel öğe açık bir fallback durumuna sahip olmalı ve fallback *varsayılan* durumdur, istisna değil.

---

## 3. Kesinleşen kararlar

| # | Karar | Gerekçe |
|---|---|---|
| 1 | **Kimlik: "radar enstrümanı"** — derin lacivert, teknik grid, mono rakamlar, cyan sinyal aksanı + amber uyarı | Marka *OpenWeight Radar*; veri yoğunluğu yüksek bir feed için enstrüman dili jenerik dashboard'tan ayırır. |
| 2 | **Tipografi: Space Grotesk (display/UI) + JetBrains Mono (rakam/komut)**, `next/font` ile, sistem fallback'i | Mono rakamlar metrik sütunlarını hizalar; Grotesk ağır olmadan teknik okunur. |
| 3 | **Dark varsayılan + çalışan tema toggle'ı** (localStorage + `prefers-color-scheme`) | Light token'lar tanımlı ama `data-theme="dark"` hardcoded; gerçek toggle bir client component maliyeti. |
| 4 | **Kart: veri-öncelikli spec sheet** | §2 — görseller modellerin %0.9'unda var. |
| 5 | **Ana sayfaya "live pulse" şeridi** (4 stat + hot-5), pazarlama hero'su değil | Değer tazelik; canlı sayı gösteren hero ürünün kendisidir. |
| 6 | **Grafikler: pure SVG**, chart bağımlılığı yok | SSR dostu, sıfır bundle maliyeti, palet tam kontrol. |
| 7 | **Motion: orta** — scroll reveal, count-up, hover derinliği, header'da radar sweep; `prefers-reduced-motion`'da hepsi kapalı | Etkileyici ama performans/erişilebilirliği düşürmez. |
| 8 | **Yeni dependency yok** | Tailwind v4 + `lucide-react` (6422 ikon, kurulu) her şeyi karşılıyor. |
| 9 | **Kategori adları iki dilde de İngilizce kalır** | Bunlar taksonomi terimleri, arayüz metni değil: Türkçe feed'de "Görüntü · kod · Çoklu Mod" İngilizce kütüphane (`gguf`) ve runner (`llama.cpp`) adlarının yanında durunca taksonomi okunamaz hale geliyordu. `categoryLabel()` artık locale parametresi almıyor, böylece geri dönüş bir derleme hatası olur. Arayüz kelimeleri (filtreler, butonlar, başlıklar) çevrilmeye devam eder; `/api/categories` hâlâ hem `labelEn` hem `labelTr` sunar. |

---

## 4. Tasarım token'ları (hedef değerler, kontrast doğrulandı)

```css
:root {                       /* dark — radar enstrümanı */
  --bg:        #070a10;
  --surface:   #101623;
  --raised:    #16202f;
  --border:    #2a3547;
  --text:      #eef2f7;
  --muted:     #93a1b5;
  --accent:    #35d0ba;   /* sinyal cyan */
  --accent-2:  #5b9dff;   /* link mavisi */
  --ok:        #3fbf8f;
  --warn:      #e8b04b;
  --danger:    #e0655f;
}
[data-theme="light"] {
  --bg: #f4f6f9; --surface: #ffffff; --raised: #eef1f6;
  --border: #c9d2de; --text: #131b26; --muted: #5d6a79;
  --accent: #0b6a58; --accent-2: #1f5fd0; --ok: #177d53; --warn: #8a6212;
}
```

Doğrulanan: dark surface/bg **1.27:1** (eskiden 1.15), border/surface **1.63:1** (eskiden 1.33), muted metin surface üzerinde 6.88:1, accent 8.70:1. Light accent `#0b6a58` beyazda 5.13:1 (naif `#0f7f6a` 3.99:1 ile düşüyor).

Derinlik **üç katmandan** gelir: token ayrımı → 1px border → elevation gölgesi (`0 1px 0 rgba(255,255,255,.06), 0 10px 30px -18px rgba(0,0,0,.7)`).

Tipografi ölçeği: 12 / 14 / 16 / 20 / 26 / 34 px. Radius: 6 / 10 / 14. Spacing ünitesi: 4px, bölüm ritmi 24px.

---

## 5. Sayfa bazlı spec

### 5.1 Shell (`layout.tsx`) — Faz 1
- Yapışkan header: brand mark (radar glyph) + tagline, ana nav (**Hepsi / kategoriler / Haber / İstatistik / Karşılaştır**), tema toggle, dil değişimi.
- Kategori sekmeleri, kategori sayılarıyla (`getCategoryCounts`, yani feed'in kendi filtreleri — bkz. DECISIONS.md "Filter query handling") kaydırılabilir segmented control'e dönüşür.
- Footer: veri kaynağı atfı, RSS linki, docs linki, snapshot zamanı.
- Gerçek ikonlar: `icon.svg` + `favicon.ico` + `apple-icon.png` (şu an `/favicon.ico` HTML dönüyor).

### 5.2 Feed (`/`, `/c/[category]`) — Faz 2
- **Live pulse şeridi**: izlenen model · kapıyı geçen · önde çıkan kategori · son yenileme (gerçek periyodu yaz: ingest aralığı + 900s cache TTL — asla "real-time" deme). `/c/[category]` sayfasında aktif kategoriye daraltılır ve "önde çıkan kategori" stat'ı kaldırılır, çünkü yalnızca başlığı tekrarlardı.
- **Şu an sıcak**: aktif pencerede indirmeye göre top 5, mini bar ile rank'lı.
- Filtre barı → kompakt chip sırası + aktif filtre özeti + "temizle"; aramada ikon.
- Kart: başlık + kategori chip'i + metrik satırı (♥ ⬇ storage) + runner chip'leri + gate rozeti + karşılaştır butonu. Varsa 40px thumbnail, yoksa glyph.
- Pagination: "daha fazla" yerine sayfalı numaralar (60 kart / 5596px asıl sorun budur).

### 5.3 Model detay (`/m/[slug]`) — Faz 3
- Hero: isim, kategori, kapı kararı, HF'ye giden author linki.
- **Spec sheet** grid (param, storage, quantization, runner, VRAM, lisans, spaces) — null alanlar hiç satır kaplamaz.
- Komut bloğu: mono, kopyala butonu, syntax tint'li.
- İlgili modeller kompakt kart olarak.

### 5.4 Haber (`/news`) — Faz 4
- Gün gruplu timeline, tür chip'leri (paper/release/announcement) renk kodlu, thumbnail (%97 kapsama), upvote, organizasyon.
- ⚠️ Thumbnail'ler `cdn-thumbnails.huggingface.co`'da ve bu host `next.config.ts` `remotePatterns` listesinde **değil** (sadece `cdn-avatars`, `cas`, `huggingface.co`). `next/image` kullanmadan önce eklenmeli.

### 5.5 İstatistik (`/stats`) — Faz 5
- Kategori hacim bar'ları (SVG), share donut'u, `firstSeenAt`'tan okuma anında türetilen günlük trend (schema değişikliği yok).
- Eşik: trend grafiği yalnızca ≥ 3 distinct gün varsa render edilir; yoksa bar'lar + "henüz yeterli geçmiş yok" notu.
- Eksik `days` kontrolü eklenir (7/30/90/180).

### 5.6 Karşılaştırma (`/compare`) — Faz 6
- Yapışkan başlıklı tablo, satır bazında "en iyi değer" vurgusu, boş durumun nasıl model eklendiğini açıklaması.

### 5.7 Motion ve cila — Faz 7
- Scroll reveal (IntersectionObserver, reduced-motion güvenli), pulse stat'larında count-up, hover derinliği, feed için skeleton loader.
- Yeniden ölç: `npm run verify-ui` + 1440 ve 390 screenshot'ları.

---

## 6. Faz sırası ve kabul kriterleri

| Faz | Çıktı | Kabul |
|---|---|---|
| 0 | Token'lar, tipografi ölçeği, `components/ui/` primitifleri | Kontrast tablosu yeniden hesaplanır: surface/bg ≥ 1.25, border/surface ≥ 1.5 |
| 1 | Shell, nav, footer, tema toggle, ikonlar | Haber/İstatistik/Karşılaştır erişilebilir; `/favicon.ico` `image/vnd.microsoft.icon` döner |
| 2 | Feed redesign | İlk sayfa yüksekliği @1440 < 3500 px; 360/390/768/1440'da taşma 0 |
| 3 | Model detay | Spec sheet'te boş "—" satırı kalmaz |
| 4 | Haber | Thumbnail'ler render olur (host allowlist); 404 yok |
| 5 | İstatistik | SVG grafikler render olur; 2 günlük snapshot ile fallback eşiği doğrulanır |
| 6 | Karşılaştırma | En iyi değer hücreleri vurgulanır |
| 7 | Motion + responsive doğrulama | `npm run lint`, `npm run typecheck`, `npm test` yeşil; screenshot'lar `.shots/`'a kaydedilir |

### Uygulama sonrası ölçülen sonuçlar (2026-10-14)

| Kriter | Önce | Sonra | Karşılandı |
|---|---|---|---|
| Feed sayfa yüksekliği @1440 | 5596 px (60 kart) | **3221 px** (24 kart, sayfalı) | ✅ |
| Yatay taşma @360/390/768/1440 | 0 | **0** | ✅ |
| surface/bg kontrastı | 1.15:1 | **1.27:1** | ✅ |
| border/surface kontrastı | 1.33:1 | **1.63:1** | ✅ |
| `/favicon.ico` | `text/html` | **`image/x-icon`** | ✅ |
| Haber / İstatistik / Karşılaştır nav'da | yok | **var** | ✅ |
| `npm run lint` / `typecheck` / `test` | yeşil | **yeşil (28 test)** | ✅ |

Kanıt screenshot'ları: `.shots/redesign-{feed,news,stats,model,compare}-{1440,390}.png`, `.shots/redesign-light-stats.png`.
Doğrulama aracı: `scripts/screenshot.ts` (CDP, 1440 + 390 viewport taraması).

---

## 7. Riskler

- Allowlist dışı host ile `next/image` runtime'da patlar — önce `cdn-thumbnails.huggingface.co` eklenmeli.
- `next/font` build anında indirir; offline build render edebilsin diye sistem fallback'i korunmalı.
- ISR + 900s cache TTL nedeniyle "canlı" sayılar canlı değildir; periyot belirtilmeli.
- Scroll-reveal elemanları screenshot'ta opacity 0 çıkar — `--force-prefers-reduced-motion` ile doğrula.
- Bu fazlarda API route'ları ve sınıflandırma kurallarına dokunulmaz; değişiklik sunum katmanındadır.
