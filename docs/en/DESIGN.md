# Design System & Redesign Plan — OpenWeight Radar

> Turkish mirror: [docs/tr/DESIGN.md](../tr/DESIGN.md)
> Status: **implemented (Phases 0–7), verified 2026-10-14.** All numbers below were measured on 2026-10-14 against the live dev server (`localhost:3101`) and the served snapshot (`data/feed.json`, 915 models / 104 news items).

---

## 1. Measured diagnosis (why the current UI reads as "simple")

| Measurement | Value | Command / formula |
|---|---|---|
| `--surface` vs `--bg` contrast | **1.15:1** | WCAG luminance ratio of `#141821` over `#0b0e14` |
| `--border` vs `--surface` contrast | **1.33:1** | `#232a36` over `#141821` |
| `/tr` page height @1440px | **5596 px**, 60 cards | CDP `document.documentElement.scrollHeight` |
| `/tr` page height @360px | **18030 px** (~20 screens) | same |
| Horizontal overflow | 0 px at 360/390/768/1280/1440 | `scrollWidth - innerWidth` |
| Text contrast | body 14.69:1, muted 7.81:1 | WCAG ratio, passes |
| Nav coverage | `TabBar` renders **categories only** | `src/components/TabBar.tsx` — `nav.news`, `nav.stats`, `nav.compare` exist in dictionaries but are never rendered |
| `/favicon.ico` | **200 but `text/html`** | `curl -I` — the app HTML is served as the icon |
| Stats `days` param | read by the page, **no UI control** | `src/app/[locale]/stats/page.tsx` |
| Footer / attribution | **absent** | no footer element in layout |

Conclusion: the flatness is not taste, it is **1.15:1 surface separation + no hierarchy + orphan pages**. Fixing tokens and structure is the prerequisite for anything that looks "modern".

---

## 2. Data reality check (gates for every visual feature)

| Field | Coverage in served snapshot | Design consequence |
|---|---|---|
| `sampleImages` | **8 / 915 (0.9%)** | Image-first cards are dead. Card is **data-first**; thumbnail only when present, otherwise author glyph. |
| News `thumbnail` | **101 / 104 (97%)** | News page can be image-first. |
| `downloads > 0` | 712 / 915 (78%) | Popularity bar is viable. |
| `likes > 0` | 350 / 915 (38%) | Show likes, never as the primary metric. |
| `runners` | 608 / 915 (66%) | Runner chips shown when present. |
| `storageBytes` | 272 / 915 (30%) | Show when present. |
| `quantizations` | 198 / 915 (22%) | Detail page only. |
| `vramEstGb` | 74 / 915 (8%) | Detail page + compare only; never a card metric. |
| `license` | 259 / 915 (28%) | Omit when null. |
| `trendingScore` | **0 / 915 (all null)** | **No trending UI.** The filter bar exposes a `sort=trending` option that is a **no-op** (all values null). Either drop it or derive a score at read time (`likes + downloads / age`) — Phase 2 does the latter. "Hot now" = downloads within the active window. |
| `firstSeenAt` distinct days | **2** (2026-10-13, 2026-10-14) | Time-series chart gate: render the trend chart only if ≥ 3 distinct days; otherwise category bars only. |

**Numeric gate:** any visual element whose backing field has < 50% coverage must have an explicit fallback state, and the fallback is the *default* state, not the exception.

---

## 3. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Identity: "radar instrument"** — deep navy, technical grid, mono numerals, cyan signal accent + amber caution | The brand is *OpenWeight Radar*; a data-instrument language is distinctive and matches a dense feed better than a generic dashboard. |
| 2 | **Type: Space Grotesk (display/UI) + JetBrains Mono (numbers, commands)** via `next/font`, system fallback | Mono numerals align metric columns; Grotesk reads technical without being heavy. |
| 3 | **Dark default + working theme toggle** (localStorage + `prefers-color-scheme`) | Light tokens already exist but `data-theme="dark"` is hardcoded; a real toggle costs one client component. |
| 4 | **Card: data-first spec sheet** | See §2 — images exist for 0.9% of models. |
| 5 | **Home gets a "live pulse" strip** (4 stats + hot-5 list), not a marketing hero | The value is freshness; a hero that shows live numbers is the product. |
| 6 | **Charts: pure SVG**, no chart dependency | SSR-friendly, zero bundle cost, full control of the token palette. |
| 7 | **Motion: medium** — scroll reveal, count-up, hover elevation, radar sweep in the header; all disabled under `prefers-reduced-motion` | Impressive without hurting performance or accessibility. |
| 8 | **No new dependencies** | Tailwind v4 + `lucide-react` (6422 icons, already installed) cover everything. |
| 9 | **Category names stay English in both locales** | They are taxonomy terms, not UI copy: the Turkish feed showed "Görüntü · kod · Çoklu Mod" beside English library (`gguf`) and runner (`llama.cpp`) names, so the taxonomy became unreadable. `categoryLabel()` no longer takes a locale, which makes a regression a compile error. UI words (filters, buttons, headings) stay translated, and `/api/categories` still serves both `labelEn` and `labelTr`. |

---

## 4. Design tokens (target values, contrast verified)

```css
:root {                       /* dark — radar instrument */
  --bg:        #070a10;
  --surface:   #101623;
  --raised:    #16202f;
  --border:    #2a3547;
  --text:      #eef2f7;
  --muted:     #93a1b5;
  --accent:    #35d0ba;   /* signal cyan */
  --accent-2:  #5b9dff;   /* link blue */
  --ok:        #3fbf8f;
  --warn:        #e8b04b;
  --danger:    #e0655f;
}
[data-theme="light"] {
  --bg: #f4f6f9; --surface: #ffffff; --raised: #eef1f6;
  --border: #c9d2de; --text: #131b26; --muted: #5d6a79;
  --accent: #0b6a58; --accent-2: #1f5fd0; --ok: #177d53; --warn: #8a6212;
}
```

Verified: dark surface/bg **1.27:1** (was 1.15), border/surface **1.63:1** (was 1.33), muted text 6.88:1 on surface, accent 8.70:1. Light accent `#0b6a58` = 5.13:1 on white (the naive `#0f7f6a` fails at 3.99:1).

Depth comes from **three layers**, not one: token separation → 1px border → elevation shadow (`0 1px 0 rgba(255,255,255,.06), 0 10px 30px -18px rgba(0,0,0,.7)`).

Type scale: 12 / 14 / 16 / 20 / 26 / 34 px. Radii: 6 / 10 / 14. Spacing unit: 4px, section rhythm 24px.

---

## 5. Per-page spec

### 5.1 Shell (`layout.tsx`) — Phase 1
- Sticky header: brand mark (radar glyph) + tagline, primary nav (**Hepsi / categories / Haber / İstatistik / Karşılaştır**), theme toggle, language switch.
- Category strip (rendered by the feed pages, not the layout — a layout never receives the route or search params, see DECISIONS.md) shows per-category counts from `getCategoryCounts`, i.e. the reader's own filters applied to each category.
- Footer: data-source attribution, RSS link, docs link, snapshot timestamp.
- Real icons: `icon.svg` + `favicon.ico` + `apple-icon.png` (currently `/favicon.ico` returns HTML).

### 5.2 Feed (`/`, `/c/[category]`) — Phase 2
- **Live pulse strip**: models tracked · gate-passed · top category · last refresh (state the true cadence: ingest interval + 900s cache TTL — never "real-time"). Scoped to the active category on `/c/[category]`, where the "top category" stat is dropped because it would only repeat the heading.
- **Hot now**: top 5 by downloads in the active window, ranked with a mini bar.
- Filter bar → compact chip row with an active-filter summary and a clear-all; search input with icon.
- Card: title + category chip + metric row (♥ ⬇ storage) + runner chips + gate badge + compare button. Thumbnail 40px when available, glyph otherwise.
- Pagination: numbered pages instead of "load more" (60 cards / 5596px is the problem).

### 5.3 Model detail (`/m/[slug]`) — Phase 3
- Hero: name, category, gate verdict, author link to HF.
- **Spec sheet** grid (params, storage, quantizations, runners, VRAM, license, spaces) — fields omitted when null.
- Command block: mono, copy button, syntax-tinted.
- Related models as compact cards.

### 5.4 News (`/news`) — Phase 4
- Day-grouped timeline, kind chips (paper/release/announcement) with distinct colors, thumbnail (97% coverage), upvotes, org.
- ⚠️ Thumbnails are on `cdn-thumbnails.huggingface.co`, which is **not** in `next.config.ts` `remotePatterns` (only `cdn-avatars`, `cas`, `huggingface.co`). Add it before using `next/image`.

### 5.5 Stats (`/stats`) — Phase 5
- Category volume bars (SVG), share donut, and a per-day trend derived from `firstSeenAt` at read time (no schema change).
- Gate: trend chart renders only when ≥ 3 distinct days exist; otherwise show the bars and a "not enough history yet" note.
- Add the missing `days` control (7/30/90/180).

### 5.6 Compare (`/compare`) — Phase 6
- Sticky header table, per-row "best value" highlight, empty state that explains how to add models.

### 5.7 Motion & polish — Phase 7
- Scroll reveal (IntersectionObserver, reduced-motion safe), count-up on pulse stats, hover elevation, skeleton loaders for the feed.
- Re-measure: `npm run verify-ui` + screenshots at 1440 and 390.

---

## 6. Phase order & acceptance criteria

| Phase | Deliverable | Acceptance |
|---|---|---|
| 0 | Tokens, type scale, `components/ui/` primitives | Contrast table recomputed: surface/bg ≥ 1.25, border/surface ≥ 1.5 |
| 1 | Shell, nav, footer, theme toggle, icons | News/Stats/Compare reachable; `/favicon.ico` returns `image/vnd.microsoft.icon` |
| 2 | Feed redesign | Page height @1440 < 3500 px for the first page; overflow = 0 at 360/390/768/1440 |
| 3 | Model detail | No empty "—" rows in the spec sheet |
| 4 | News | Thumbnails render (host allowlisted); no 404s |
| 5 | Stats | SVG charts render; gate fallback verified with the 2-day snapshot |
| 6 | Compare | Best-value cells highlighted |
| 7 | Motion + responsive verification | `npm run lint`, `npm run typecheck`, `npm test` green; screenshots saved to `.shots/` |

### Measured results after implementation (2026-10-14)

| Criterion | Before | After | Met |
|---|---|---|---|
| Feed page height @1440 | 5596 px (60 cards) | **3221 px** (24 cards, paginated) | ✅ |
| Horizontal overflow @360/390/768/1440 | 0 | **0** | ✅ |
| surface/bg contrast | 1.15:1 | **1.27:1** | ✅ |
| border/surface contrast | 1.33:1 | **1.63:1** | ✅ |
| `/favicon.ico` | `text/html` | **`image/x-icon`** | ✅ |
| News / Stats / Compare in nav | absent | **present** | ✅ |
| `npm run lint` / `typecheck` / `test` | green | **green (28 tests)** | ✅ |

Evidence screenshots: `.shots/redesign-{feed,news,stats,model,compare}-{1440,390}.png`, `.shots/redesign-light-stats.png`.
Verification tool: `scripts/screenshot.ts` (CDP, 1440 + 390 viewport sweep).

---

## 7. Risks

- `next/image` with an unallowlisted host throws at runtime — add `cdn-thumbnails.huggingface.co` first.
- `next/font` fetches at build time; keep the system fallback so an offline build still renders.
- ISR + 900s cache TTL means the "live" numbers are not live; label the cadence.
- Scroll-reveal elements screenshot as opacity 0 — verify with `--force-prefers-reduced-motion`.
- Do not touch API routes or classification rules in these phases; this is a presentation-layer change.
