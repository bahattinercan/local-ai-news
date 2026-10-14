# Documentation index / Dokümantasyon indeksi

**Product name:** OpenWeight Radar (openweightradar.com) — see §2 of the plan. Repo folder stays `local-ai-news`.

Every document exists in two mirrored languages. **EN is the source of truth; TR is the mirror.** Adding a doc in one language requires the other.

Her doküman iki dilde eşleşir. **EN kaynaktır, TR eşdeğerdir.** Bir dilde doküman eklemek diğerini gerektirir.

| Document | EN | TR |
|---|---|---|
| Plan | [en/PLAN.md](en/PLAN.md) | [tr/PLAN.md](tr/PLAN.md) |
| Source inventory | en/SOURCES.md | tr/SOURCES.md |
| Category rules | en/CATEGORIES.md | tr/CATEGORIES.md |
| Decisions log | [en/DECISIONS.md](en/DECISIONS.md) | [tr/DECISIONS.md](tr/DECISIONS.md) |
| Data storage (no Neon) | [en/DATA-STORAGE.md](en/DATA-STORAGE.md) | [tr/DATA-STORAGE.md](tr/DATA-STORAGE.md) |

## Conventions / Kurallar

- **Code, comments, commit messages, JSON keys, test names: English.**
- **Kod, yorumlar, commit mesajları, JSON key'leri, test adları: İngilizce.**
- Commits follow Conventional Commits, English subject + body.
  `feat(classify): add coding-category regex rules`
- UI strings live only in `src/i18n/en.json` and `src/i18n/tr.json`, never in source code.
