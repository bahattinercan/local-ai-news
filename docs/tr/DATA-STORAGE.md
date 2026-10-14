# Neon'un kaldırılması — veri depolama planı (TR)

Durum: **karar verildi — seçenek C (Vercel Blob)**. Uygulama sürüyor.

## 1. Amaç

Sitede hiçbir yerde Postgres/Neon olmayacak. Her şey tek bir JSON snapshot'ından
okunacak. Çalışmaya devam etmesi gerekenler: feed, kategori sekmeleri, model
detayı, haberler, istatistik, karşılaştırma, RSS, sitemap — ve haber akışı
zamanlanmış olarak güncellenmeye devam edecek.

Mevcut durum: `src/lib/db/store.ts` iki yol içeriyor (Drizzle ile Neon ve
`data/feed.json` fallback'ı). 456 KB snapshot, 343 model, 51 haber satırı.

## 2. Snapshot nerede duracak — asıl karar

| Seçenek | Güncelleme sıklığı | Ek servis | Her günclemede rebuild | Maliyet | Risk |
|---|---|---|---|---|---|
| **A. `data/feed.json`'ı `main`'e commit'lemek** | herhangi | yok | **evet** | 0 | günde 144 build, Vercel Hobby aylık ~1000 build limitini patlatır |
| **B. Actions `data` branch'ine/release asset'a yazar, app ISR ile çeker** | 10 dk | yok | hayır | 0 | GitHub raw rate limit, cold-start gecikmesi |
| **C. Vercel Blob** | 10 dk | Vercel token | hayır | free tier | Vercel projesi gerekir |
| **D. Cloudflare R2 / KV** | 10 dk | CF hesabı | hayır | free tier | başka bir hesap |

**Öneri: B**, repo'daki snapshot fallback olarak kalsın ki site hiçbir zaman
boş görünmesin. Gerekçe: sıfır ücretli servis, rebuild fırtınası yok, ingest job
zaten GitHub Actions'ta çalışıyor (karar 6) ve kendi çıktısını yayımlayabilir.

Sıklık: ingest her 10 dakikada, her run'da yayımlanır; uygulama `revalidate: 900`
ve in-memory TTL ile cache'ler, yani saatte en fazla ~4 kez çeker.

## 3. Kod değişiklikleri

**Silinecek**
- `src/lib/db/client.ts`, `src/lib/db/schema.ts`
- `drizzle.config.ts`, `drizzle/` (üretilen migration)
- deps: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- script'ler: `db:generate`, `db:migrate`

**Yeniden yazılacak**
- `src/lib/db/store.ts` → `src/lib/store.ts`: snapshot loader (yerel dosya +
  remote fetch), in-memory cache, tüm sorgu/sıralama/filtre mantığı JS'te.
  `isDbConfigured()` ve tüm DB dalları kaldırılacak.
- `EmptyState.SnapshotNotice` → düz bir "veriler {time} yenilendi" satırı.
- `api/ingest/run` → sadece lokal/dev için kalır; read-only filesystem'larda
  Actions workflow'a yönlendiren `501` döner.

**Eklenecek**
- `data/overrides.json` — manuel kategori override'ları (`category_overrides`
  tablosunun yerini alır). `classify/rules.ts` okur.
- `scripts/publish-snapshot.ts` — `data/feed.json`'ı yazar ve yükler.

## 4. Değişiklik sonrası ingest akışı

```
cron-job.org → workflow_dispatch → Actions
  → npm run ingest            (HF bütçesi: 92 istek)
  → npm run classify-check    (regresyon kapısı)
  → data/feed.json'ı data branch'ine / release asset'a yayımla
  → app ISR ile 15 dk içinde alır
```

Veri güncellemesi uygulama rebuild'ı tetiklemez.

## 5. Büyüme sınırları (artık kodda, veritabanında değil)

- snapshot 2000 model / 1000 haber satırında sınırlanır, eskiler atılır
- 90 günlük pencere; daha eskisi yazım anında prune edilir
- payload bugün 456 KB; ~1 MB'ı geçerse `models.json` + `news.json` olarak
  bölünür ya da kullanılmayan alanlar (`sampleImages`, `paramDtypes`) kırpılır

## 6. Doğrulama

1. `grep -rn DATABASE_URL src scripts docs` → sonuç yok.
2. `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` temiz.
3. `curl localhost:3101/api/feed` hiçbir env değişkeni olmadan çalışıyor.
4. Cold ve warm yüklenme `scripts/audit-ui.ts` ile ölçülür.
5. RSS ve sitemap hâlâ 200.

## 7. Güncellenecek dokümanlar

- `docs/{en,tr}/DECISIONS.md`: karar 2 (Neon) geri alındı; gerekçe ve geri dönüş
  koşulu yazılacak ("ilişkisel sorgu ya da kullanıcı bazlı durum gerekirse DB
  geri gelir").
- `README.md`: Neon satırı kaldırılacak.
- `docs/{en,tr}/PLAN.md`: tarihsel plan olarak kalır, bu dosyaya link eklenir.

## 8. İş sırası

1. §2'de karar (senin girişimin gerekiyor).
2. DB kodu + deps silinir, store yeniden yazılır (≈1 dosya).
3. Yayımlama adımı workflow'a bağlanır.
4. Dokümanlar ve `.env.example` güncellenir.
5. Doğrulama listesi çalıştırılır.

Tahmin: tek bir oturum. Banner dışında UI'da hiçbir şey değişmez.
