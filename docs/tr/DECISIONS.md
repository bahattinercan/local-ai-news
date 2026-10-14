# Karar kaydı (TR)

## Sabit kararlar (13 Ekim 2026)

1. Next.js App Router + TypeScript.
2. Neon Postgres.
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
- **Snapshot fallback:** `DATABASE_URL` yoksa uygulama `data/feed.json` okur. DB olmadan yerel geliştirme çalışsın diye.
- **Rate limit:** IP başına in-memory harita. Vercel'de bu fonksiyan instance'ı başınadır, global değildir — v1 için kabul edilebilir; kötüye kullanım çıkarsa Upstash/Redis'e taşınır.
- **VRAM tahmini:** ağırlıklar + KV cache yaklaşımı (`BYTES_PER_PARAM` × param sayısı + 4096 token'da milyar param başına 0.15 GB). UI'da `~` ile gösterilir.
- **Avatarlar:** `/api/users/{name}` ve `/api/organizations/{name}` token'sız error döndürüyor; avatarlar yalnızca trending yanıtından, monogram fallback ile.

## Henüz yapılmadı (F6 kalanı)

Admin override paneli, e-posta özeti, yerel Ollama entegrasyonu (`localhost:11434/api/tags`), harici haber kaynakları (karar 3'ü deler).
