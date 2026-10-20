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
| Design system & redesign plan | [en/DESIGN.md](en/DESIGN.md) | [tr/DESIGN.md](tr/DESIGN.md) |
| Design v2 — clarity + modernisation plan (measured audit, 2026-10-16) | [en/DESIGN-V2.md](en/DESIGN-V2.md) | [tr/DESIGN-V2.md](tr/DESIGN-V2.md) |
| Design v3 — "Basın Baskısı": retro broadsheet front page (implemented, measured 2026-10-18) | [en/DESIGN-V3.md](en/DESIGN-V3.md) | [tr/DESIGN-V3.md](tr/DESIGN-V3.md) |
| News & AI-detail expansion plan | [en/NEWS-PLAN.md](en/NEWS-PLAN.md) | [tr/NEWS-PLAN.md](tr/NEWS-PLAN.md) |
| Compare page v1 — the pair sheet (implemented, measured 2026-10-20) | [en/COMPARE-PLAN.md](en/COMPARE-PLAN.md) | [tr/COMPARE-PLAN.md](tr/COMPARE-PLAN.md) |
| Stats page v2 — "the Data Desk" (plan, measured 2026-10-20) | [en/STATS-PLAN.md](en/STATS-PLAN.md) | [tr/STATS-PLAN.md](tr/STATS-PLAN.md) |
| Glossary v2 plan (measured, 2026-10-20) | [en/GLOSSARY-PLAN.md](en/GLOSSARY-PLAN.md) | [tr/GLOSSARY-PLAN.md](tr/GLOSSARY-PLAN.md) |
| SEO plan v2 — crawlability, index policy, competitor map, content depth (plan, measured 2026-10-20) | [en/SEO-PLAN.md](en/SEO-PLAN.md) | [tr/SEO-PLAN.md](tr/SEO-PLAN.md) |
| Data storage (no Neon) | [en/DATA-STORAGE.md](en/DATA-STORAGE.md) | [tr/DATA-STORAGE.md](tr/DATA-STORAGE.md) |

## Conventions / Kurallar

- **Code, comments, commit messages, JSON keys, test names: English.**
- **Kod, yorumlar, commit mesajları, JSON key'leri, test adları: İngilizce.**
- Commits follow Conventional Commits, English subject + body.
  `feat(classify): add coding-category regex rules`
- UI strings live only in `src/i18n/en.json` and `src/i18n/tr.json`, never in source code.
