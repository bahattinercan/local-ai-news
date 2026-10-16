# Design v2 — "make it obvious, then make it modern"

> Turkish mirror: [docs/tr/DESIGN-V2.md](../tr/DESIGN-V2.md)
> Status: **partly implemented** — §3 D1–D7 and the algorithmic fixes in §0 landed on 2026-10-16 (`0689da8` + one implementation session); §4 and §5 are open. Audited 2026-10-16 18:00–18:25, re-measured 20:05–20:40 (+03) against `npm run dev` on `http://localhost:3000` with the served snapshot (`generatedAt 2026-10-16T15:35Z`, 1284 models / 209 news).
> Supersedes the verification claims in [DESIGN.md](DESIGN.md) §1 and §6 (see §2.3).
> ⚠️ The pre-fix measurements in §2.2 and §3 were taken while another session was editing the tree (`src/components/{FeedView,FilterBar,PulseStrip,TabBar}.tsx`, `src/lib/{query,store}.ts`, mtimes 18:07–18:09); that session committed its work as `0689da8` at 19:07. §0 records what has since been fixed, with the post-fix numbers.

---

## 0. Implementation log — 2026-10-16 (post-audit)

| Item | Status | Evidence (before → after) |
|---|---|---|
| **D1** feed grid track 753 px | **fixed** (`0689da8`) | feed document at a 360/390 px viewport: **769 → 345/375 px** (`min-w-0` on the grid item + `min-w-0 line-clamp-2` on the card title) |
| **D2** verifier false pass | **fixed** (`0689da8`) | `check-overflow.ts` now uses desktop metrics, waits for the emulated width, skips clipped decorations and exits non-zero: 44 route×width combinations → **0 overflow** |
| Page beyond the last page | **fixed** | `?page=999` rendered an empty grid headed "Page 999" → clamps to **page 19** (449/24), 17 cards, `aria-current="page"` on 19; `/api/feed?page=999` → `{page:19,total:449,pages:19}` |
| `/stats` disagreed with the feed | **fixed** | `/stats` counted every tracked row (Audio **244**) while the Audio tab said **17** → `/stats` now filters with the feed's gate (Audio **17**, Coding 98 …), `?gate=all` still shows the raw volume (Audio 244) and the page has a gate control + a distinct `h2` |
| Run-command correctness | **fixed** | `llama-cli -hf repo --quant Q4_K_M` (no such flag) → `llama-cli -hf repo:Q4_K_M`; `ollama pull <model name>` → `ollama run hf.co/<repo>[:quant]`; the quant is picked from the GGUF schemes, not `quantizations[0]` (`AWQ`, `I8`, `U32` were being selected) |
| Snapshot without `news` | **fixed** | `snapshot.news.map` threw out of every news surface → degrades to an empty list |
| "Models tracked" label | **fixed** | the number is window-scoped (7d **1281**, 24h **369**) → label "New models in window" + a "last 7 days" hint |
| **D3** light theme failed AA | **fixed** | muted/bg **4.02 → 4.54**, muted/surface **4.30 → 5.00**, accent/bg **4.80 → 5.69**, surface/bg 1.07 → 1.10, border/surface 1.42 → 1.49 (see §6) |
| **D4** header 2–3 rows | **fixed** | 1440 **103 → 65 px**, 390 **143 → 57**, 360 **179 → 57**; below `sm` the five links move into a `<details>` overflow menu (no JavaScript) |
| **D5** nothing explains the site on a phone | **fixed** | the tagline was `display:none` below 768 px and the `h1` said "All" → the feed and category pages open with a descriptive `h1` (20 px on phones, 30 px ≥640) plus a one-line statement; the language switch keeps the current page instead of jumping home |
| **D6** one heading on the whole feed | **fixed** | feed headings **1 → 4** (`h1` + "Window summary" + "Hot now" + "Models"); `/stats` h1 and h2 are no longer identical |
| **D7** tap targets | **fixed** | 83 → **0** targets below the WCAG 2.2 AA minimum (24×24) at 1440 and 390; form controls, nav and pagination are 44 px |
| **C3** type scale | **partial** | the largest type went 24 → 30 px, but 466 of 500 text elements are still ≤14 px: the card and type-scale pass is §4/§5 work |
| First screen (`firstCardY` @1440×900) | **regressed, accepted for now** | 756 → **882 px**: 44 px targets, the category strip and the new outline cost ~126 px. §5 M2/M3 (progressive filters + hero-metric pulse card) must bring it back under 560 |
| **D8** donut legend, chart height | open | the trend chart now renders 3 points (3 distinct `firstSeenAt` days) and the ≥3-day gate works; the donut still has no legend |
| **D9** `/news` raw release text | open | live snapshot: 209 items (community 25, runtime 30, paper 150, release 4), 151 with a thumbnail |
| **D10** no client-side navigation | open | still 21 plain `<a href>` internal links |
| `/icon.svg`, `/apple-icon.png` | **fixed** | the locale redirect turned both into 307 → `/en/icon.svg` → **404** while the layout advertised them (both now answer `200` with `image/svg+xml` / `image/png`) |
| News pagination beyond the last page | **fixed** | same class as the feed bug: `/tr/news?page=999` → empty page 999 → clamps to page 2 (23 items), `/tr/research?page=999` → page 3 |
| **Ingest merge base** | **fixed** | the ingest job merged into the repo copy (`actions/checkout`'s `data/feed.json`) instead of the published snapshot, and then overwrote the Blob — so every run rebuilt "repo baseline + this run's newest pages" and dropped what earlier runs had found once it left the listing window. The served snapshot contains models first seen on **13/14/16 October and none on the 15th**, although the job ran that day. `mergeSnapshotBases()` now unions the published snapshot with the repo copy (earliest `firstSeenAt` wins, a newer record fills fields the older one lacks) and degrades to the old behaviour when the store is unreachable. Current bases happen to agree (repo 915 ⊆ published 1284), so nothing lost was recoverable |

---

### 0.1 Phase 2 (clarity) — landed in the same session

| Plan item | Result (measured @1440×900, and 390 where noted) |
|---|---|
| **C3** type scale | `text-xs` 12 → **13 px**, `text-sm` 14 → **15 px**, `text-2xl` 24 → **30**, `text-3xl` → **38** — one `@theme` block, so the whole UI moved up a step. Text in the 15–17 px band: **284/402 (71 %)**; ≤ 14 px: **466 (93 %) → 112 (28 %)**; those 112 are micro-labels, tab counts and chips |
| **M3** card | Rows that could only ever print a placeholder are gone (params 6.5 % coverage, storage 29.8 %, runners 70.3 %, license 27.4 %, likes 38.3 %); `downloads` is now the one metric with weight (accent + first), the popularity bar has an accessible name instead of `role="presentation"`, and the avatar went 88 → **44 px** (56 px more width for the title) |
| **M2** filters | Window + Sort + Search + Apply stay visible; Gate/Runner/Size/License and the saved-filters control moved into a `More filters` disclosure (with an active count) measured at **104 px** collapsed |
| **M4/M6** shell | Category strip is one scrollable row at every width (**83 → 60 px**, hidden scrollbar) and the radar texture is clipped in its own layer so the hot-list panel can escape the card |
| Hot list | Moved into a `<details>`: the pulse card went **287 → 148 px** and the panel opens as a 34 rem overlay (`elementFromPoint` confirms it is hit-testable, i.e. not clipped) |
| **First screen** | firstCardY **882 → 585 px** at 1440×900 (was 756 before this whole pass, target 560) and **1562 → 949** at 390. The h1 dropped from 38 px to 30 px because the TR title wrapped to two lines at 38 |
| Re-verified | 70 route×width combinations (320/360/390/430/768/1024/1440) → 0 overflow; 0 targets below 24×24 at 1440 and 390; npm test 73/73, lint, typecheck |
| Still open | donut legend (D8), `/news` raw release text (D9), `next/link` (D10), the remaining 25 px of first-screen headroom |

---

## 1. Answer to "bu ne böyle, ne olduğu belli değil"

Three measured reasons, in the order a first-time visitor hits them.

**1. On a phone the site is not a phone layout.** The feed's card grid inflates to a **753 px** track regardless of viewport. At a 390 px phone the document is **769 px wide**, the browser's layout viewport is inflated to match (`window.innerWidth = 769` while `visualViewport.width = 390`), and **49 % of every card sits off-screen**. It is not a styling opinion: the grid track is 752.812 px wide inside a 313 px container (§3, D1).

**2. The page never says what it is.** The only sentence that explains the product lives in the header tagline, and that tagline is `display: none` below 768 px. The largest type on the site is 24 px; **484 of 517 text elements (94 %) are ≤ 14 px**; the feed contains **exactly one heading**, `h1 "Hepsi"` ("All"). Nothing defines "quality gate", "hot now", "runner" or "~2.5 GB VRAM" anywhere.

**3. Nothing has priority.** On the median card **4 of 6 rows carry a placeholder** (params 8.2 % coverage, VRAM chip 8.1 %, license chip 28.3 %, storage 29.7 %, likes 38.3 %, runners 66.4 %), and every row is the same 12 px muted text, with an unlabeled 1.5 px bar underneath whose 4 % floor reads as a rendering artefact. A card with no data looks exactly like a card full of data.

So the fix order is **layout defects → clarity and hierarchy → interaction polish**. A new palette is *not* on the critical path: the dark tokens already pass contrast (§6). The "radar instrument" identity is worth keeping; what is missing is a reason for the eye to move.

---

## 2. Method and evidence

### 2.1 Commands (re-runnable)

```bash
npm run dev                                   # :3000
chrome --headless=new --remote-debugging-port=9222 --force-prefers-reduced-motion \
       --user-data-dir="$TEMP/cdp-owr" about:blank
# viewport sweep (desktop metrics + mobile emulation), section profile, contrast, tap targets:
node scripts/measure-ui.ts http://localhost:3000/tr    # legacy, see 2.3
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 360
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 768
```

Raw evidence from this run: `.shots/audit-v2-measurements.json`, screenshots `.shots/audit-v2-*.png`
(`-feed-1440-dark`, `-feed-1440-light`, `-feed-phone-emulated-390`, `-feed-390-desktop-metrics`, `-stats-1440`, `-news-1440`, `-compare-en-1440`, plus `-top` crops).

### 2.2 Measured baseline — **pre-fix** (2026-10-16 18:20). See §0 for post-fix numbers.

| Measurement | Value | How |
|---|---|---|
| Feed document width @390 phone | **769 px** (clientWidth 390) | `Emulation.setDeviceMetricsOverride {width:390,mobile:true,dsf:2}` → `documentElement.scrollWidth` |
| Feed card width @390 phone | **753 px** (also observed 417 px on a lighter page) | `document.querySelector('article').getBoundingClientRect().width` |
| Feed grid track width | **752.812 px** for a 313 px container | `getComputedStyle(grid).gridTemplateColumns` |
| Same with `min-width:0` injected on the grid item | track **313 px**, document **345 px** | inline `<style>` + re-measure |
| Document overflow @360 / @390 (desktop metrics) | **+409 px / +379 px** | `scrollWidth - innerWidth` |
| Document overflow @768 | **+5 px** (TR) / **+8 px** (EN) | `check-overflow.ts … 768` |
| Header height | **103 px @1440** (2 rows), 143 px @390, **179 px @360**, sticky | `header.getBoundingClientRect().height` |
| First model card top @1440×900 | **y = 756** → 84 % of the first screen is chrome | `article` rect + `scrollY` |
| Type census, /tr @1440 | 12 px × **395**, 14 px × 89, 16 px × 28, 24 px × 5 → **94 % ≤ 14 px**, max 24 px | computed `font-size` per own-text element (n = 517) |
| Headings on /tr | **1** (`h1 "Hepsi"`), zero `h2`/`h3` in `main` | `querySelectorAll('h1,h2,h3')` |
| Tap targets < 44 px | **73 / 89** @1440; language switch anchors are **14 × 16 px** | rect of `a,button,select,input,summary` |
| Tagline visibility @390 | `display: none` | `getComputedStyle(span).display` |
| Dark contrast | muted/bg **8.72**, muted/surface 6.88, surface/bg 1.27, raised/surface **1.16**, border/surface 1.63, accent/bg 11.03 | WCAG L2 over the CSS token hexes |
| **Light contrast** | muted/bg **4.02 ✗**, muted/surface **4.30 ✗**, surface/bg **1.07**, raised/surface 1.11, border/surface 1.42, accent/bg 4.80 | same, `data-theme="light"` |
| Internal links using `next/link` | **0** (21 plain `<a href>`) | `grep -rn "next/link" src` |
| `/stats` trend chart | drawn with **2 data points** in a 640×160 viewBox stretched to ~1100 px; donut has no legend | screenshot + `firstSeenAt` distinct days = 2 |
| `/news` item text | avg summary **1464 chars**, sliced at 280 mid-URL; thumbnails exist only for `paper` items | snapshot + `NewsCard.tsx` |
| `/compare` with no ids | page height **844 px** = exactly one empty viewport | `documentElement.scrollHeight` |

### 2.3 Corrections to DESIGN.md

- DESIGN.md §6 reports "Horizontal overflow 0 px at 360/390/768/1280/1440 ✅". That is a **false pass**. `scripts/check-overflow.ts` and `scripts/audit-ui.ts` emulated small widths with `mobile: true`, which makes Chrome inflate the layout viewport to the content width: `window.innerWidth` becomes **769**, `scrollWidth` is 769, and `scrollWidth - innerWidth` is therefore 0. The verifier must compare `scrollWidth` against the **emulated** width, or set `Emulation.setPageScaleFactor(1)` and use desktop metrics for the layout check.
- The offender lists in those scripts are also clip-blind: `div[sweep] right=935` is reported although the card's `overflow: hidden` clips it and it contributes **0** to `scrollWidth`. The real +5 px at 768 is the card track from D1. Do not chase the sweep.
- `scripts/measure-ui.ts` never set a viewport override at all, so `npm run verify-ui` only measured whatever window size Chrome happened to have.
- DESIGN.md §2 says "`paramsTotal` …" is not listed; the field is used in every card but has **8.2 %** coverage (75/915), so 92 % of cards print "params unknown" (§7).

---

## 3. P0 — defects (user-visible breakage, all measured)

> **Status 2026-10-16 20:40: D1–D7 fixed (§0), D8/D9/D10 open.** The measurements below are the pre-fix baseline and are kept as the diagnosis.

### D1 — Feed grid track inflates to 753 px; every phone layout is broken
- **Symptom:** at 360/390/430 the feed document is 417–769 px wide, cards overflow the screen, media queries and `100%` resolve against an inflated viewport, and the page can be panned sideways into empty space.
- **Cause:** the grid children in `FeedView.tsx` (`div.fade-up`) are grid items with the default `min-width: auto`, so the single-column track is sized by the widest item's min-content. Inside the card, the title row `div.flex.items-start.justify-between.gap-2` has **no `min-w-0`**, the title `<a>` uses `break-words` (`overflow-wrap: break-word`, which does **not** reduce min-content — `body` sets `anywhere`, which would), and the sibling gate `Chip` is `whitespace-nowrap`. Culprit card on the measured page: `ISishikaa/acquisition_generator_AS_grape_wildguardmix_qwen3b` (45 unbreakable characters) → **752.812 px** track for all 24 cards.
- **Fix:** (a) `min-w-0` on the grid item in `FeedView.tsx`; (b) `min-w-0` + `line-clamp-2` (not `break-words`) on the card title in `FeedCard.tsx`; (c) `shrink-0` only on the chip, never on the title; (d) same audit for `NewsCard.tsx`, `PulseStrip.tsx` (`hot-row`) and the compare table.
- **Verified fix:** injecting `min-width:0` on the item drops the track 752.812 → **313 px** and the document 769 → **345 px** at a 360 px viewport.
- **Acceptance:** at 360/390/430/768 every route satisfies `documentElement.scrollWidth ≤ clientWidth`, and every `article` is ≤ `clientWidth − 32`.

### D2 — The overflow reporter cannot be trusted
- **Symptom / evidence:** two traps, §2.3. `check-overflow.ts` reports 0 overflow at 360 while desktop metrics at 360 show **+409 px**; its offender list names clipped decorations instead of the real cause.
- **Fix:** `mobile: false` (or a pinned page scale) + compare against the emulated width; assert a page marker before measuring, because `next dev` recompiles on save and several of my runs measured the *previous* route (a mobile pass returned `innerWidth 1440`).
- **Acceptance:** `npm run verify-ui` **fails on today's code** and prints a per-route table for 360/390/430/768/1024/1440. A verifier that cannot fail is not a verifier.

### D3 — Light theme fails WCAG AA and has no depth
- **Evidence:** muted/bg **4.02:1** and muted/surface **4.30:1** (AA needs 4.5 for body text); surface/bg **1.07**, raised/surface 1.11, border/surface 1.42. Every card on the light background looks like the same white plane.
- **Fix:** token values in §6 (muted `#525f6e` → 4.72/5.00; bg `#eff2f7` → surface/bg 1.10; border `#c3cddc` → 1.49) plus shadow-based depth, since a white surface on a near-white page cannot give separation by fill alone.
- **Acceptance:** recomputed contrast table: muted ≥ 4.5:1 on **both** surfaces, text ≥ 7:1, accent ≥ 4.5:1, surface/bg ≥ 1.08, border/surface ≥ 1.45, in **both** themes.

### D4 — The header is a 2–3 row sticky block
- **Evidence:** 103 px at 1440 (brand row + nav row; `nav` sits at `y=56`), 143 px at 390, **179 px at 360** — and it is `position: sticky`, so on a 360×800 phone **22 % of the viewport is permanently chrome**.
- **Cause:** `Header.tsx` puts brand + tagline + 4 labeled nav pills + language switch + theme toggle in one `flex-wrap` inside `max-w-6xl`.
- **Fix:** one row on every width (brand + hamburger/overflow on <768, tagline moves into the page); icon+label pills become icon-only with accessible names on <1024; language + theme collapse into one 44 px cluster.
- **Acceptance:** header ≤ 64 px at ≥768, ≤ 56 px at <768, no wrapping at 320–1440, measured at 320/360/390/768/1024/1440.

### D5 — Silence about what the product is
- **Evidence:** the tagline is `hidden md:block` → `display: none` at 390; the page `h1` is "Hepsi"/"All"; the browser tab title is the only full description; `/stats` `h1` and its card label repeat each other ("Volume by category" twice).
- **Fix:** an explicit entry statement per page type (§8, C1), a real `h1` per page, and the tagline rendered *in the page body*, never only in the sticky header.
- **Acceptance:** at 390 the first screen contains a descriptive `h1` (≥ 30 px) plus one sentence naming the product, the freshness and the default filter.

### D6 — No document outline
- **Evidence:** the feed has **1** heading; "Multimodal", "İzlenen model", "Kategori bazlı hacim" and every stat label are `<span>`/`<div>`. Next.js announces `document.title → h1 → pathname` (see `node_modules/next/dist/docs/03-architecture/accessibility.md`), so a screen reader announces "All".
- **Fix:** real `h1`/`h2` hierarchy per route (§8); section wrappers become `<section aria-labelledby>`; keep exactly one `h1`.
- **Acceptance:** every route has one `h1` whose text describes the route, ≥ 2 `h2`s, and a heading order with no skipped level.

### D7 — Tap targets below the minimum
- **Evidence:** 73 of 89 interactive elements are < 44 px @1440; language anchors are 14 × 16 px; the theme toggle is 38 × 30 px.
- **Fix:** one shared control primitive with `min-h-11` (44 px) or WCAG 2.2 AA target-size spacing; the category strip and filter controls included.
- **Acceptance:** 0 targets < 44 px, or every smaller one has ≥ 8 px of non-overlapping spacing (measured, not eyeballed).

### D8 — `/stats` spends its largest area on two data points
- **Evidence:** the daily trend card renders a 640×160 SVG stretched to ~1100 px with **2** distinct `firstSeenAt` days; `stats.noHistory` exists in the dictionary but the gate is not applied; the donut has no labels or legend, only colours.
- **Fix:** enforce the ≥ 3 distinct days gate before rendering the trend; cap chart height (~200 px) and fill the space with the top-N table; add a donut legend with label + value + share.
- **Acceptance:** with a 2-day snapshot the trend card is absent and the "not enough history yet" note is shown; the donut has a legend with ≥ 6 readable labels.

### D9 — `/news` renders raw release notes
- **Evidence:** items average **1464 characters** of unformatted release text, sliced at 280 characters mid-URL; the media slot is a 64 px box that is a placeholder for every `runtime` item (thumbnails exist only on `paper` items), so the page reads as a wall of monospace-ish prose.
- **Fix:** derive the display title from the first line, strip/linkify URLs and `@`-mentions, clamp the summary to 2 lines with an expandable "more", show the source badge instead of an empty media slot when the field is absent.
- **Acceptance:** no item shows a raw URL mid-string; media/slot exists only when `thumbnail` is present; the page's first screen shows ≥ 3 scannable headlines.

### D10 — No client-side navigation
- **Evidence:** **0** uses of `next/link`; 21 internal `<a href>` across 12 files → every click is a full document reload (no prefetch, no route announcement, no scroll restoration, default white flash in light mode).
- **Fix:** `next/link` for all internal hrefs (`hrefFor` returns plain strings, so the change is mechanical); keep `<a target="_blank">` for external.
- **Acceptance:** clicking a card, a tab or a nav item performs a client transition (no full reload) and the route announcer fires.

---

## 4. P1 — Clarity (what is this site?)

### C1 — An entry statement on every page type
Feed / category / news / stats / compare / glossary each open with: `h1` (route-specific, ≥ 30 px), one sentence stating what is tracked and how fresh it is, and three small definitions the UI depends on ("Quality gate: X of Y models pass", "Window: last 7 days", "Updated: every 30 min"). Nothing may exist **only** in the sticky header.

### C2 — One primary number per screen
`PulseStrip` currently shows four equal-weight 24 px stats plus a 5-row list. Keep **one** hero metric (models added inside the window, with a delta and sparkline if the data allows), demote the other three to 14 px secondary stats, and move "Hot now" behind the hero metric instead of beside it.

### C3 — A type scale with actual spread
Today: 24 px max, 94 % ≤ 14 px. Target scale **12 / 13 / 15 / 17 / 20 / 24 / 30 / 38** with role rules — micro-label 12, secondary 13, body 15, card title 17, section heading 20–24, page `h1` 30–38, hero number 38. Acceptance: ≥ 60 % of text elements sit in 15–17 px, and no page exceeds one 38 px element.

### C4 — Stop speaking in jargon
"Quality gate", "Runner", "Snapshot", "~2.5 GB VRAM", "2d" are unexplained in both locales. Either rename to self-explanatory labels or attach a one-line `<details>`/tooltip per term, in `en.json` + `tr.json`.

### C5 — Empty and loading states that teach
`/tr/compare` with no ids renders a blank viewport (measured height 844 px). Make it explain the flow ("add models from the feed via **Compare**, or paste two slugs") with a copy-ready example. Same for the zero-result feed and for the `gateForced` notice.

---

## 5. P2 — Modernisation

| # | Change | Why it reads as "modern" |
|---|---|---|
| M1 | `next/link` for internal navigation + prefetch (D10) | Instant navigation is the single largest perceived-speed win, and it costs nothing visually |
| M2 | Filter bar → progressive disclosure: Window + Sort + Search always visible, "Filters (n)" disclosure for Gate/Runner/Size/License | Today 8 controls occupy a full row before any content; the first card starts at y=756 of 900 |
| M3 | Card v2: 17 px 2-line title, one labelled primary metric, real bar with a legend, secondary metrics in one 13 px row, chips only when the field exists, 40 px avatar instead of 88 px | Removes placeholder rows (4 of 6 today) and gives the title 48 px more width |
| M4 | Category strip: horizontally scrollable segmented control < 1024, unmistakable active state, counts only where they add information | 10 equal-weight pills in 2 rows cost 100 px of every screen and imply nothing about selection |
| M5 | Sticky-chrome budget: one 56 px mobile header row, scrolling category strip | Returns 87–123 px of vertical space on phones |
| M6 | Restrict the radar sweep + grid texture to the hero only; keep reveal/count-up under `prefers-reduced-motion` | Four decorative layers inside one 287 px card compete with the numerals |
| M7 | Ship the light theme only with the §6 tokens | A real second theme is a modern signal; today's light mode is unusable |
| M8 | One spacing scale (4/8/12/16/24/32/48), one container, one radius scale; explicit `line-clamp` everywhere text can be long | Consistent rhythm + no clipped text is most of what "polished" means |

---

## 6. Tokens v2 (contrast computed, not estimated)

```css
:root {                    /* dark — radar instrument */
  --bg:#0a0e15; --surface:#161f2e; --raised:#212c40; --border:#33415a;
  --text:#f2f5f9; --muted:#a7b4c6;
  --accent:#3ddbc4; --accent-2:#6aa8ff; --ok:#4ecfa0; --warn:#f0bd5f; --danger:#f07a72;
}
:root[data-theme="light"] {
  --bg:#eff2f7; --surface:#ffffff; --raised:#e7ecf4; --border:#c3cddc;
  --text:#0f1620; --muted:#525f6e;
  --accent:#0a5b4c; --accent-2:#1c56c4; --ok:#0f6b47; --warn:#7d5a10; --danger:#9c2d27;
}
```

| Pair | dark before | dark now | light before | light now | Target |
|---|---|---|---|---|---|
| muted / bg | 8.72 | **9.44** | **4.02 ✗** | **4.54** | ≥ 4.5 |
| muted / surface | 6.88 | **7.27** | **4.30 ✗** | **5.00** | ≥ 4.5 |
| surface / bg | 1.27 | **1.30** | 1.07 | **1.10** | ≥ 1.08 (light) / ≥ 1.25 (dark) |
| raised / surface | **1.16** | **1.24** | 1.11 | **1.15** | ≥ 1.15 |
| border / surface | 1.63 | **1.74** | 1.42 | **1.49** | ≥ 1.45 |
| text / bg | 17.79 | **16.34** | 13.55 | **14.15** | ≥ 7 |
| accent / bg | 11.03 | **10.85** | 4.80 | **5.69** | ≥ 4.5 |
| accent-filled button label | — | **10.69** (on `#071014`) | — | **6.26** (white on accent) | ≥ 4.5 |

All values above are read back from the live page (`getComputedStyle(document.documentElement)` tokens → WCAG relative luminance), not from a spreadsheet: the earlier draft of this table quoted muted/surface 7.72, which was computed against a surface value that the final token set no longer uses.

Depth is a three-layer decision, unchanged in principle: token separation → 1 px border → elevation shadow. In light mode the surface/bg ceiling (≈1.10) means borders + shadows do the work.

---

## 7. Data gates (served snapshot, 2026-10-16T15:35Z — 1284 models / 209 news)

Measured with `npx tsx` against `loadSnapshot()` (the Blob snapshot the site actually serves), not against the repo fallback `data/feed.json`, which is a day older (915 models):

| Field | Coverage | UI rule |
|---|---|---|
| `sampleImages` | **13/1284 (1.0 %)** | Never reserve space for a thumbnail in the card; monogram is the default, not the exception |
| `paramsTotal` | **84/1284 (6.5 %)** | Must not be a permanent card row (93 % would read "params unknown") |
| `vramEstGb` | 84/1284 (6.5 %) | Detail page + compare only (as DESIGN.md says) |
| `quantizations` | 253/1284 (19.7 %) | Detail page only; GGUF schemes feed `runCommand` |
| `spaces` | 24/1284 (1.9 %) | Detail page only, hidden when empty |
| `license` | 352/1284 (27.4 %) | Chip only when non-null (already correct) |
| `storageBytes` | 382/1284 (29.8 %) | Chip when present |
| `likes` / `downloads` | 1284/1284 (100 %) | Downloads is the primary metric; likes never is |
| `runners` | 903/1284 (70.3 %) | Show only when non-empty; no "—" row |
| `libraryName` | 1000/1284 (77.9 %) | Secondary row, hide when null |
| `files` | 172/1284 (13.4 %) | Detail page only |
| `trendingScore` | **0/1284 (all null)** | `derivedTrending()` is the read-time substitute |
| `qualityPassed` | 449/1284 (35.0 %) | The default feed filter, and the `/stats` default since §0 |
| `gated` | 3/1284 (0.2 %) | Never in the feed (`excludeGated`) |
| `firstSeenAt` distinct days | **3** (13/14/16 Oct) | The trend chart renders (gate is ≥ 3 days); it would show the "not enough history" note on a 2-day snapshot |
| news `thumbnail` | 151/209 (72 %) | Gate the media slot per item, not per page |

---

## 8. Page-by-page spec

| Route | `h1` | Content order (post-plan) | Mobile behaviour |
|---|---|---|---|
| `/` and `/c/[category]` | "New open-weight models — last 7 days" / category name + one-line definition | statement → hero metric (1 number) → 3 secondary stats → hot-5 (collapsed on phones) → filters (2 visible + disclosure) → card grid → pagination | 1 column, cards full-bleed inside `px-4`, category strip scrolls horizontally, hot-5 collapses to a `<details>` |
| `/m/[slug]` | model id (2-line clamp) + author | verdict banner → spec sheet (only non-null rows) → run command with copy → related | spec sheet becomes a definition list, no horizontal table |
| `/news`, `/research` | "Local AI news — last 7 days" | day-grouped timeline, 1-line title + 2-line summary + kind badge, media only when present | day groups `<details open>` for the newest only |
| `/stats` | "Volume by category — last 30 days" (+ the missing window control inline) | window control → category bars → share donut **with legend** → trend **only if ≥ 3 days** | single column, bars full width, donut ≤ 160 px |
| `/compare` | "Compare models" | sticky header row (one column per model) → per-row best-value highlight → remove/add affordances | horizontal scroll container with a visible scrollbar + sticky first column; teaching empty state (C5) |
| `/glossary`, `/glossary/[slug]` | term | term → definition → formula/example → related terms | already fits (measured 0 overflow) |

---

## 9. Phases and acceptance criteria

| Phase | Scope | Acceptance (all re-runnable) |
|---|---|---|
| **0. Harness** | D2: fix `check-overflow.ts`/`audit-ui.ts`/`measure-ui.ts` (desktop metrics or pinned page scale, page marker before measuring, clip-aware offender list) | `npm run verify-ui` **fails** on today's code, printing per-route overflow for 360/390/430/768/1024/1440; evidence written to `.shots/` |
| **1. Layout & a11y defects** | D1, D3, D4, D5, D6, D7 | overflow = 0 on every route at every width; contrast table passes (both themes); header ≤ 64 px (≥768) / ≤ 56 px (<768); one descriptive `h1` + ≥ 2 `h2` per route; 0 targets < 44 px |
| **2. Clarity** | C1–C5 | `h1` ≥ 30 px on every route; ≥ 60 % of text at 15–17 px; the product statement is visible at 390; no unexplained jargon key remains in `en.json`/`tr.json` |
| **3. Interaction** | M1, M2, M3 | card click is a client transition; first card at y ≤ 560 @1440×900 (from 756); no placeholder rows on a median card |
| **4. Shell & theme** | M4, M5, M6, M7, M8 | 100 % of routes fit at 320 px; category strip is one scrollable row < 1024; light theme ships only with the §6 tokens; one spacing scale in use |
| **5. Per-page polish** | `/news`, `/research`, `/stats`, `/compare`, `/glossary`, `/m/[slug]` per §8 | D8/D9 acceptance met; screenshots at 390 + 1440 per route in `.shots/` |

Every phase: `npm run lint`, `npm run typecheck`, `npm test` green; one PR per phase; a screenshot pair per touched route.

**Status:** Phase 0 done (`0689da8`, 44 route×width combinations → 0 overflow, non-zero exit proven with a 900 px fixture) · Phase 1 done for D1–D7 (§0) · Phases 2–5 open. Phase 1 left one accepted regression: `firstCardY` at 1440×900 went 756 → 882 px, which Phase 3 (M2/M3) has to pay back.

---

## 10. Verification harness requirements

1. Sweep 320/360/390/430/768/1024/1440 with **desktop metrics** for layout (`mobile:false`) *and* a second mobile-emulation pass that records `window.innerWidth` vs `visualViewport.width` — the mismatch is itself the failure signal.
2. Assert a page marker (e.g. the `h1` text) before measuring; abort if the route did not load (this run measured a stale page twice because `next dev` was recompiling).
3. Contrast: compute from the CSS token values for **both** themes and both surfaces; store the table in the repo.
4. Tap targets: list every target < 44 px with its rect, not just a count.
5. Outline: dump the `h1–h3` sequence per route and fail on a missing/duplicate `h1` or a skipped level.
6. Keep `.shots/*.png` evidence; delete scratch scripts (this audit left `owr-audit*.mjs`, `probe*.mjs` in `$TEMP` on purpose — they must not land in the repo, and the stray `tmp-audit.ts` already in the tree must be removed with Phase 0).

---

## 11. Risks and non-goals

- **Concurrent editing:** resolved — the other session committed as `0689da8`; the tree is clean again and this plan's §0 records what it fixed.
- **44 px controls cost first-screen height:** the E1 acceptance (0 targets < 24 px, primary controls 44 px) moved the first model card from y=756 to y=882 at 1440×900. Reclaiming it needs the filter/pulse redesign, not smaller targets.
- **Token ripple:** `ui/Charts.tsx` (donut palette, bar/trend colours) and `globals.css` background gradients hard-code `rgba(53,208,186,…)` — update them together with `--accent`, or charts will drift from the theme.
- **`min-w-0` can trim the desktop card:** verify the 1440 card stays 554 px and the 2-line title still fits.
- **Light mode is fill-poor:** at a 1.10 surface/bg ceiling, separation must come from borders and shadows — plan the light treatment explicitly instead of inheriting the dark shadow.
- **`next/link` migration:** keep `target="_blank" rel="noopener"` on external links, and keep `hrefFor(locale, …)` as the single href builder.
- **Non-goals:** no new dependencies, no palette from scratch, no chart library, no data-model/API/route changes, no changes to classification rules or the ingest pipeline.
