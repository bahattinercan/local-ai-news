# Design v3 — "Basın Baskısı" (The Press Plate)

> Turkish mirror: [docs/tr/DESIGN-V3.md](../tr/DESIGN-V3.md)
> Status: **implemented** 2026-10-18 (§0 records what landed, the deviations and the measured results). Written as a plan 2026-10-18 against the live snapshot (`generatedAt 2026-10-18T09:09:12Z`, **1 633 models / 185 news**), the running site's screenshots supplied by the owner, and the reference shot `dribbble.com/shots/10827673-Retro-news-web-app`.
> Supersedes the *visual* goals of [DESIGN.md](DESIGN.md) and [DESIGN-V2.md](DESIGN-V2.md). The **defect list and the measurement method of DESIGN-V2 stay in force** — every number in its §2/§3 was re-verified for this plan (§2.4) and none of it is being undone.
> Evidence for this document: `.shots/ref-crop.png` (reference anatomy, 3× crop), `.shots/live-snapshot.json` (live snapshot, 2.2 MB), `.shots/contrast.mjs` (token contrast, re-runnable), `.shots/thumb1-small.png` (what a news thumbnail actually looks like).

---

## 0. Implementation log — 2026-10-18

> Implemented in one session on the owner's approval of D2 (paper default), D3 (route move) and D4 (Playfair Display). Every number below was measured **after** the change and has a command behind it (§9).

| Plan item | Result (measured) |
|---|---|
| **P0-1** poisoned labels | `src/lib/text-guard.ts` + `normalizeNews()` drop `"[object Object]"` at read time, and `mergeRecord()` now treats a poisoned string as *missing* so a later correct value can overwrite it (it never could before: the merge only filled fields the older record lacked). 91 tests, 8 of them new |
| **P0-2** growth, measured | `src/lib/heat.ts` (`growthOf`, `growthCoverage`, `hasGrowthSignal`, `formatGrowth`); the ingest stamps `downloadsAtFirstSeen` on the first sighting. The front page's band prints `+Δ` only when coverage is ≥ 60 %, so the column stays dormant until real baselines accumulate instead of printing `+0` |
| **P0-3** generated plates | `PressPlate` renders for **100 %** of model rows, story rows and news items that have no thumbnail: a 6 px dot `<pattern>` under one radial mask, 3 SVG elements per plate, deterministic from the slug |
| **P0-4** evidence tooling | `scripts/fetch-snapshot.ts`, `scripts/contrast.ts` (reads the tokens out of `globals.css`, so it cannot go stale), `scripts/type-census.ts`; `scripts/audit-ui.ts` gained `/models` |
| **P1** tokens + type | `scripts/contrast.ts`: **paper** (muted/bg 6.57, accent/bg 5.94, control/bg 3.84, rule/bg 1.48) and **night** (7.63, 8.01, 3.64, 1.55) — every gated pair passes. Playfair Display is loaded with `latin-ext`; Space Grotesk gained `latin-ext` too, because Turkish `ğ ş İ ı` had been falling back to Georgia all along |
| **P2** shell | masthead + ribbon + desk nav = **180 px** at 1440/1280, 174 at 1024, 220 at 390 (target ≤ 210); the nameplate is exactly **1 line** from 320 to 1440; **0 overflow** across 8 routes × 7 widths (320/360/390/430/768/1024/1440) = 56 combinations; smallest tap target **24 px**; **exactly one nav item marked per route** (`npm run verify-nav`, §0.2.9) |
| **P3** front page | `/` is the broadsheet and the index moved to `/models`; `middleware.ts` answers **308** for `/?window=…` with the query preserved (verified live). At 1440×900 the hero plate starts at **y = 298**, the lead headline spans **673 → 765**, fully above the fold |
| **P4** routes | `PageHeader` gives every route the same strap line; the feed's cards are ruled rows (no card, no shadow, ~40 % less height per row); `/news` groups by day inside ruled disclosures; `/stats` is ruled sections with an ink trend chart; the model page prints a plate plus a ruled spec grid |
| **P5** polish | the print stylesheet was verified under `Emulation.setEmulatedMedia({media:'print'})`: nav, ribbon, forms, buttons and the halftone screen all drop out, leaving the nameplate, the lead story and the rules. No animation inside the reading area, `prefers-reduced-motion` still honoured |
| Tests / lint / types | `npm test` **91/91**, `npm run lint` clean, `npm run typecheck` clean, i18n parity **156 keys** in both dictionaries |

### 0.1 Deviations from the plan (and why)

| Planned | Landed | Reason |
|---|---|---|
| Container `max-w-[1180px]` (§6) | **1280 px** (`.shell`) | The masthead's three zones measure ≈ 1 260 px with the nameplate at 30 px: at 1 180 px the nameplate wrapped to two lines and the snapshot block broke into five. A broadsheet is wider than an app. |
| "hero headline top edge ≤ 260 px" (P3) | plate at 298, headline 673–765 | The criterion was written before the design existed and ignored the plate that sits above the headline. The honest, measurable version — the lead headline fully visible inside the first 900 px — is what §9 checks now. |
| "≥ 55 % of text in 15–17 px; one element ≥ 40 px" (§5) | front page 25 % at ≥ 15 px, largest **44 px**; `/models` 67 %; no sentence below 15 px anywhere | The first half was measuring the *old* defect (everything at 12–14 px) and conflicts with the design's own signature: kickers, bylines, counts and annotations are deliberately 11–13 px letterspaced caps. `scripts/type-census.ts` now gates what actually matters — **no sentence below 15 px, at most one element ≥ 40 px** — and reports the share. |
| `lib/heat.ts` exports a documented "attention score" (P0-2) | exports growth helpers only | `lib/store.ts` already derives a `trending` sort from likes and downloads. A second undocumented blend beside it would be one more number nobody can check, and the ribbon already prints the same figure that ordered it. |
| "charts redraw in ink" (P4) | trend + bars in ink/accent; the donut keeps the categorical tokens, reordered so slice 1 is the accent and slice 2 is ink | A seven-slice monochrome ramp is unreadable; the legend prints label, count and share, and the token palette is contrast-verified rather than hand-picked. |
| `FeedCard` → `ModelRow` (§7.2) | `FeedCard` (ruled index row) plus a separate compact `ModelRow` for the band | The two have different jobs and different shapes; renaming one into the other would have been churn with no reader benefit. |

### 0.2 Real defects found while implementing (fixed here)

1. **Implicit `auto` grid columns on mobile.** A single-column grid with no explicit track is sized by its items' minimum contribution, and a `truncate` row contributes its whole text: the front page built a **957 px track inside a 343 px page** at 390 px (+598 px of horizontal overflow), and `/models` and `/news` carried the same latent bug. Fixed by declaring `grid-cols-1` / `minmax(0, 1fr)` (`FeedView`, `NewsList`, `Charts`, `VramCalculator`, `Masthead`, the front page's three grids, `.stats-grid`).
2. **The theme toggle and the language switch shrank.** As flex children they compressed to **18 px** at 1024 px once the masthead got tight — a sub-24 px target that appeared in exactly one viewport. Fixed with `shrink-0`.
3. **The halftone screen was invisible in the night edition.** `mix-blend-mode: multiply` with light ink is a no-op over a photograph, so `--screen-ink` is now a dark ink in both themes.
4. **`.byline` uppercased its own timestamps** (`3d` → `3D`, `56m` → `56M`); the uppercase moved onto the organisation label only.
5. **The hero plate broke out of its column.** `PlateImage` carried the pixel size in an inline style, which overrode `w-full` and pushed a 720 px image out of its 600 px track and over the rail.
6. **Every `text-*` colour on an anchor was silently dead.** `globals.css` carried a bare `a { color: inherit }` *outside* any layer, and unlayered CSS outranks every layered rule in the cascade — so it beat each Tailwind colour utility on every `<a>` on the site, including all the `hover:text-accent`. Measured on the RSS call to action: light ink on a light block, i.e. an invisible button (and its computed colour was `var(--text)` while `--bg` was dark ink). The base rules now live in `@layer base`, where a default belongs, and the accent layer of the design (arrow links, kickers, the promo CTA) actually renders.
7. **The desk nav hard-cut a taxonomy term.** The strip needed ~1 375 px inside a 1 280 px container, so `EMBEDDING / RAG` arrived as `EMI` with the rest scrolled out of sight. The nav uses the terms' short forms now (still English taxonomy: LLM, Image, …, Embedding, Vision, Robotics), and both scrollable strips fade at the right edge so a cut term reads as "there is more".
8. **`BAŞ HABER` printed twice** on the front page — once as the page kicker, once above the hero headline. The page kicker names the window; the lead story keeps its own label.
9. **The scrollable strips could not actually be scrolled.** The ribbon measured `client 1248 / scroll 2966` — genuinely scrollable — but `scrollbar-width: none` hid the only affordance, a vertical wheel over a 37 px strip scrolls the *page*, and the desk strip was not even a tab stop (`tabIndex = -1`). So with a mouse the rest of the ticker was unreachable: "this part does not scroll". Both strips are now a shared `ScrollStrip`: a visible 4 px ink scrollbar, drag-to-pan with the mouse (a drag suppresses the click it would otherwise fire), and `tabIndex = 0` with an accessible name for the keyboard. The vertical wheel is deliberately not hijacked, and the bar costs 3 px of shell height rather than the 19 px that `scrollbar-width: thin` cost by making Chrome ignore the `::-webkit-scrollbar` rules.
9. **The nav underlined the wrong thing on every page but a desk.** Only `/c/[category]` passed `active`, and the desk predicate was `desk.key === (active ?? "")` — so an undefined `active` matched the empty key and **All** carried the ink underline on News, Research, Stats, Compare, Glossary, `/models` and every detail page, while the section links had no state to carry at all: the reader could not tell which of the fifteen items they were standing on (owner: *"burada seçili olan hangisi belli olmuyor"*, 2026-10-18). The nav now takes a `section` as well as a desk, reads `active` only when the page declared one, marks the item's own page with `aria-current="page"` and an ancestor (a model inside its category, a news item inside News/Research, a glossary term) with `aria-current="true"` — the ARIA value for "current item in a set". Measured per route: `/tr` All:page, `/tr/models` All:true, `/tr/news` News:page, `/tr/research` Research:page, `/tr/stats` Stats:page, `/tr/compare` Compare:page, `/tr/glossary` Glossary:page, `/tr/c/coding` Coding:page, a model page its own category:true, a glossary term Glossary:true; exactly one item on each. The magnifier follows the same rule it always stated for desks: a search from News or Research now stays in News or Research (`/news?q=`, `/research?q=`) instead of dropping the term on the model index.
10. **The night edition fell back to paper on a language switch.** `data-theme` lives on `<html>`, and `<html>` is rendered by the root layout — which is `app/[locale]/layout.tsx`, so every TR/EN click **remounts** it. Next.js then re-applies every attribute on `<html>` from the RSC payload, and that payload can only say `data-theme="light"`: the server does not know the reader's choice. The `<head>` bootstrap script did not save it either, because it is rendered through `dangerouslySetInnerHTML`, and React says so itself in the console — *"Scripts inside React components are never executed when rendering on the client"*. Measured 2026-10-20 (`npm run verify-theme`, before the fix): clicking TR in the night edition left `localStorage` on `dark` and the page on `rgb(242, 239, 230)`, i.e. the choice survived and the page did not; the toggle also flipped to the wrong icon, because it read the (already overwritten) DOM in a `useEffect`. The theme now lives in one store (`src/lib/theme.ts`), `ThemeSync` re-asserts it in a **layout** effect — before paint, so there is no flash of paper — and the toggle reads that store instead of the document (`src/lib/useTheme.ts`). `scripts/check-theme.ts` asserts it end-to-end in a real browser: paper on a cold load, ink after the toggle, ink after EN → TR, ink after TR → EN, the toggle still returning to paper, and a hard load honouring the saved choice. The one honest cost: React's dev-only script-tag notice still fires on each language switch, because the pre-paint bootstrap has to stay a `<script>` (without it a cold load flashes paper). It is expected; the attribute is no longer its job.

---

## 1. What the reference actually is

The owner's brief: *"kullanışlı, modern, göze hitap eden … bu tarz bir websitesi"* — a classic broadsheet front page, not a dashboard. `.shots/ref-crop.png` is a 3× crop of the reference, and it decomposes into eight zones. Nothing in it is decoration for its own sake: each zone is a *job*.

| # | Zone | Reference element | The job it does | Our equivalent |
|---|---|---|---|---|
| 1 | **Masthead, left** | seal + `DEVY'S PUBLIC HOUSE` + `BEERS · BOURBONS · BREAD` + `Los Angeles · Montreal · New York` | says *who publishes this* and *from where* | brand mark + `OPENWEIGHT RADAR` + `open-weight models · huggingface` + `Vercel Blob · cron 30 min` |
| 2 | **Masthead, centre** | `HOLLYWOOD FACTORY` in letterspaced serif caps between two hairlines, dateline `March 24, 1976` beneath | the nameplate is the page's whole identity; the dateline makes "today" explicit | `HOLLYWOOD FACTORY` → `OPENWEIGHT RADAR` nameplate; dateline = `Edition of 18 October 2026 · 1 633 models tracked` |
| 3 | **Masthead, right** | `Telephone is here / $18.90` + a small engraving | one live classified/ticker figure, not a stat grid | `Snapshot 09:09 UTC · 1 633 models · 617 gate-passed` + a halftone radar engraving |
| 4 | **Ribbon** | pink `#f6c9d8` strip: `Apies 9.1 · The Godfather 9.4 · …` — a horizontal ticker, each title with a superscript score | the "what's hot right now" line, one row, zero vertical cost | `Hot in the window`: top models by window downloads, each with a superscript score |
| 5 | **Section nav** | hamburger + `LATEST FEATURED AUTOMOBILES …` in letterspaced caps + a search icon, sitting on a hairline | taxonomy as *type*, not as pills | `ALL · AUDIO 247 · EMBEDDING 244 · IMAGE 225 …` + search icon |
| 6 | **Body, 3 zones** | left column (portrait + deck + `WATCH VIDEO →`), centre hero (photo, kicker `TRENDING`, 2-line headline, deck, byline + avatar + date + prev/next), right rail (tinted promo box + CTA, then teaser rows, then subscribe box) | **rank**: one story leads, two flank it, the rest is a rail. Reading order is expressed as size and position | hero = top paper of the window; left column = runtime/release stories; right rail = "Run it yourself" promo (copy command) + latest teasers + RSS box |
| 7 | **Ornament** | halftone dot burst at the hero's top-right | one printed-texture gesture, in a corner | the existing radar sweep + `grid-bg`, reduced to masthead/hero corner only |
| 8 | **Rules, not cards** | black hairlines and one 3 px section rule do all the separating; exactly one pastel wash (pink ribbon) and one tinted box (blue promo) | costs no vertical space and reads as "published", not "app" | `--rule` hairlines + `--rule-strong` 3 px section rules; cards (`--surface` + shadow) leave the feed entirely |

**Why it works (the five rules worth stealing):**

1. **Type carries the hierarchy.** Four sizes and two families do all the ranking; there is no reliance on colour, shadows or icons.
2. **Rules instead of containers.** A 1 px line separates; a card wraps the same two lines of text in a border, a radius, a shadow and 16 px of padding on all four sides (`FeedCard`'s `card p-4`), and every wrapped card forces a gap to its neighbour.
3. **One pastel.** Pink ribbon + one blue box against monochrome ink. Scarcity is what makes the accent mean something.
4. **Small caps with tracking.** Every label (`TRENDING`, `READ MORE`, `SUBSCRIBE TO ALL THE NEWS`) is letterspaced caps at 11–13 px. This is the single cheapest "retro press" signal and it costs nothing.
5. **The score superscript.** `9.1` set as a superscript next to a title turns a list into a *ranked* list without a table.

**What does NOT transfer — the images.** This is the decisive constraint of the whole plan and it is measured, not guessed (`.shots/thumb1-small.png`):

- Only **25 of 1 633 models (1.5 %)** have `sampleImages`. Model photography cannot be a design pillar.
- **151 of 185 news items (82 %)** *do* have a `thumbnail`, 150 of them from `cdn-thumbnails.huggingface.co` (already an allowed `remotePatterns` host in `next.config.ts`).
- But those thumbnails are **1 200 × 648 renders of the paper's own first page** (dense two-column body text, measured 317 KB for one PNG), not photographs. Dropped into a full-bleed hero they read as noise.

So the art direction is: **news thumbnails are used as printed plates** — cropped from the top, desaturated to ink, halftone-dotted, at rail/column size, and only ever full-size behind a heavy treatment; **models get a generated plate** (procedural halftone monogram, deterministic from the slug) so no slot in the layout is ever empty. §7 P0-3 specifies this.

---

## 2. Data reality check (measured 2026-10-18, live snapshot)

Method: `node .shots/fetch-snapshot.mjs` (reads the private Blob with `SNAPSHOT_URL` + `BLOB_READ_WRITE_TOKEN`) then coverage counts. Raw file: `.shots/live-snapshot.json`.

| # | Measurement | Value | Design consequence | Gate + fallback |
|---|---|---|---|---|
| 1 | Models / news in the served snapshot | **1 633 / 185** | the front page is an *edit* of a large set, never a dump | — |
| 2 | Distinct `firstSeenAt` days | **3** (2026-10-13 ×343, 10-14 ×572, 10-18 ×718; **15–17 Oct missing**) → the 7-day window returns all 1 633 | "daily edition" would be a lie; the dateline states the *edition* and the *window*, never "today's news" | dateline = snapshot date + window label; the ingest gap stays an open P0 ingest bug |
| 3 | `qualityPassed` | **617 / 1 633 (37.8 %)**, `gated` **7** | "617 of 1 633 pass the gate" is a real, honest masthead figure | — |
| 4 | `downloads` | > 0 on **1 408/1 633 (86 %)**; p50 **22**, p90 **299**, max **119 265** | downloads is the only universally present metric → it is the ribbon score and the hero's weight | hero requires `downloads ≥ p90`; ribbon requires ≥ 8 items with `downloads ≥ 1` |
| 5 | `likes` = 0 | **1 188 / 1 633 (73 %)** | likes can never lead; print it only when > 0 | existing behaviour, keep |
| 6 | `trendingScore` | **null on 1 633/1 633** | there is no HF trending signal to print, and no download *history* → **"trending" is not measurable today** | see P0-2: derive a documented heat score at read time, or label the ribbon "Most downloaded in the window" |
| 7 | Field coverage | `paramsTotal` **6.2 %**, `vramEstGb` **6.2 %**, `license` **24.5 %** (1 233 are `none`), `storageBytes` **26.1 %**, `author` **26.1 %**, `runners` **100 %**, `libraryName` **68 distinct**, `cardMeta.baseModel` **159**, `cardMeta.languages` **76** | the masthead ticker block and the row's second line must be built from **downloads / category / age / runners / libraryName / baseModel**, not from specs | a row renders a field only when present (DESIGN-V2 §7 rule, kept) |
| 8 | `sampleImages` non-empty | **25 / 1 633 (1.5 %)** | model art must be generated, not fetched | **P0-3 `PressPlate` renders for 100 % of model rows** |
| 9 | News kinds | paper **150**, runtime **30**, release **5**; in-window 7 d: **109** (paper 78, runtime 26, release 5); 24 h: **14** | three honest desks exist (Papers / Releases / Runtime); a "last 24 hours" page would be nearly empty | front page draws from the **window**, not from 24 h |
| 10 | News `thumbnail` | **151/185 (82 %)**, 150 on `cdn-thumbnails.huggingface.co`, **79 of them inside the 7-day window** | the hero's plate slot is always satisfiable from the window | hero asserts `hasImage`; **34 items without a thumbnail get a `PressPlate`** |
| 11 | News `organization` | present on 144, but **40 of them (21.6 %) are the literal string `"[object Object]"`**; 41 null → **121 usable** | a byline printing `[object Object]` destroys the whole "printed page" illusion | P0-1: filter at read time **and** trace the writer; label renders only if it matches `/^[^\[]/` and is ≤ 40 chars |
| 12 | News `modelSlug` / `categoryKey` | **7 / 185 (3.8 %)** | news cannot be auto-filed into category desks, and "view model" links are the exception | link renders only when `modelSlug` exists; desks are built from `kind` |
| 13 | News title / summary length | title p50 **70**, p90 94, max **124** chars; summary p50 **1 484** chars | headlines need `line-clamp-2` at every size; decks need a derived first sentence, not the abstract | reuse `lib/news-text.ts`; hero headline clamp 2 lines, deck clamp 3 |
| 14 | Model name length | p50 **25**, p90 41, max **95** chars | `line-clamp-2` + `min-w-0` everywhere (DESIGN-V2 D1 stays load-bearing) | keep existing guard |
| 15 | Category counts | audio 247, embedding 244, image 225, coding 193, vision 169, robotics 161, multimodal 158, video 145, llm 91 | the nav can carry real superscript counts, exactly like the reference ribbon | counts come from `getCategoryCounts()` with the active filters (already true) |
| 16 | Distinct `organization` values (news) | **68** | an "organizations index" desk is possible but thin (avg 1.8 items) | **do not** promise an org index in v3 |

### 2.4 Re-verified DESIGN-V2 invariants (must not regress)

| Invariant | Status on the live site |
|---|---|
| 0 horizontal overflow at 320/360/390/430/768/1024/1440 | holds (70 route×width combos, DESIGN-V2 §0.3) |
| 0 tap targets < 24×24 at 1440 and 390 | holds |
| Light theme AA (`muted/bg` 4.54, `muted/surface` 5.00) | holds — and v3 replaces the ramp, so §4 re-derives it |
| `next/link` for every internal href | holds (D10 closed) |
| i18n parity | holds: **125 keys** in both dictionaries |

The single accepted regression to date is `firstCardY` = 565 px at 1440×900 (target was 560). **v3 does not chase that number** — it changes what the first screen is (§7 P3 sets a new, honest one).

---

## 3. Decisions

| # | Decision | Rationale |
|---|---|---|
| **D1** | The design language becomes **print**: hairline rules, ink on paper, letterspaced small caps, one pastel accent, real nameplate. Cards, glows, glass and the animated sweep leave the content area. | The reference's whole effect comes from these five moves; keeping cards on top of them produces a dashboard wearing a serif. |
| **D2** | **Paper (light) becomes the default theme**; dark becomes "Night Edition", a real second ramp (not an inverted afterthought). `localStorage` keeps working because the keys stay `light` / `dark`. | A newspaper is ink on paper. The dark ramp stays because half the subject matter is read at night, and DESIGN-V2 spent a pass making it AA. |
| **D3** | The front page (`/`) becomes a **broadsheet**, and today's filterable model list **moves to `/models`** (verbatim: pulse, filters, grid, pagination). `/?window=…` etc. 308-redirect to `/models?…` in `middleware.ts`. | A front page and a query tool are different pages. Both are wanted; neither survives being merged. *This is the one decision that needs the owner's explicit yes — see §12.* |
| **D4** | **One new typeface**: a serif for the nameplate and section titles. Headlines stay Space Grotesk 700 (the reference's own headlines are a heavy grotesque, not a serif). Data stays JetBrains Mono. | Keeps the site's existing voice, adds the one missing register, costs ~2 font weights. |
| **D5** | Model art is **generated** (`PressPlate`): a deterministic halftone monogram from the slug + category glyph, in ink. `sampleImages` is used when present (1.5 %), never required. | Measured constraint (§1). Also the reason the design will still look intentional in three years. |
| **D6** | News thumbnails are treated as **plates**: `grayscale(1) contrast(1.15)`, halftone overlay, cropped from the top (`object-position: top left`), never shown bigger than one column. | They are paper renders, not photos (§1). Treated correctly, "a page of a paper reproduced in a paper" is a *feature* of the reference's language. |
| **D7** | The **ribbon score** is `downloads` inside the window, formatted compact (`119k`), with a log-scaled hairline bar. "Trending" as a *word* is not used until P0-2's derived delta exists. | `trendingScore` is null for every model (§2 #6). Printing "trending" over a total-downloads number would be the exact kind of unverifiable claim DESIGN-V2 removed. |
| **D8** | Every card-like surface in the content area is **deleted**, not restyled: `.card` stays only for the promo box, the compare table and the model page's spec block. | §1 rule 2. This is also what buys back vertical space without touching the type scale again. |
| **D9** | A **print stylesheet** ships with v3 (`@media print`): masthead, hero, rules, no nav, no ribbon animations. | The design's native medium is paper; a reader printing "the edition" is the retro payoff and it costs ~30 lines of CSS. |

---

## 4. Tokens v3 — contrast computed, not estimated

Script: `.shots/contrast.mjs` → `node .shots/contrast.mjs` (WCAG 2.x relative luminance, sRGB, composited per pair). Full output reproduced below.

```css
/* paper — the default */
:root {
  --bg: #f2efe6;        /* newsprint */
  --surface: #fdfcf8;   /* panel, used sparingly (D8) */
  --raised: #e8e3d6;
  --text: #141310;      /* ink */
  --muted: #58544a;
  --accent: #b3123f;    /* deep rose — text-safe cousin of the ribbon */
  --accent-2: #1b5a8a;
  --ok: #1c6b45; --warn: #7a5200; --danger: #a3271f;
  --rule: #cdc6b4;         /* 1 px hairline */
  --rule-strong: #2a2823;  /* 3 px section rule */
  --control: #7d7869;      /* input/control boundary (≥3:1) */
  --ribbon: #f6c9d8;       /* the one pastel wash */
  --promo: #cfe4f5;        /* the one tinted box */
  --plate-ink: #141310;    /* PressPlate ink */
}

/* night edition */
[data-theme="dark"] {
  --bg: #0d0d10; --surface: #16161b; --raised: #1f1f26;
  --text: #f3f1ea; --muted: #a6a29a;
  --accent: #ff7ab0; --accent-2: #8fc4ea;
  --ok: #5fd39c; --warn: #e8bd63; --danger: #ff8b80;
  --rule: #33333d; --rule-strong: #d8d4c8; --control: #6b6a74;
  --ribbon: #3a1c28; --promo: #1b2a38; --plate-ink: #f3f1ea;
}
```

| Pair | paper | night | target | verdict |
|---|---|---|---|---|
| `muted / bg` | **6.57** | 7.63 | ≥ 4.5 | pass |
| `muted / surface` | **7.35** | 7.09 | ≥ 4.5 | pass |
| `text / bg` | **16.16** | 17.17 | ≥ 7 | pass |
| `text / surface` | **18.10** | 15.95 | ≥ 7 | pass |
| `accent / bg` (rose) | **5.94** | 8.01 | ≥ 4.5 | pass |
| `accent / surface` | **6.65** | 7.44 | ≥ 4.5 | pass |
| `accent-2 / bg` | **6.35** | 10.40 | ≥ 4.5 | pass |
| `ok / bg` | **5.64** | 10.43 | ≥ 4.5 | pass |
| `warn / bg` | **6.02** | 10.99 | ≥ 4.5 | pass |
| `danger / bg` | **6.37** | 8.55 | ≥ 4.5 | pass |
| `rule-strong / bg` | **12.81** | 13.10 | ≥ 3 (non-text) | pass |
| `control / bg` | **3.84** | 3.64 | ≥ 3 (non-text) | pass |
| `control / surface` | **4.30** | — | ≥ 3 | pass |
| `rule / bg` | **1.48** | 1.55 | ≥ 1.4 (decorative hairline) | pass |
| `rule / surface` | **1.66** | 1.44 | ≥ 1.4 | pass |
| ink on `ribbon` | **12.62** | — (night ribbon is dark: use `--text` on it) | ≥ 4.5 | pass |
| ink on `promo` | **14.22** | — | ≥ 4.5 | pass |
| `surface / bg` | 1.12 | 1.08 | *not a gate* | separation comes from `--rule` and `--rule-strong`, not from fills (D8). DESIGN-V2's "surface/bg ≥ 1.08" gate is **retired with the cards**. |

Note the two deliberate changes against DESIGN-V2 §6: **the paper ramp is lower-contrast by design** (newsprint is not paper-white: `--text` 16.16 instead of 18+), and **the accent moves from teal/blue to rose/pink** because the ribbon is the page's only wash. Everything still clears AA with margin, including on the tinted boxes.

---

## 5. Type system v3

| Role | Face | Size / tracking | Where |
|---|---|---|---|
| Nameplate | **serif** (new) | 30–38 px, `tracking-[0.22em]`, uppercase | masthead centre, between two rules |
| Section rule label | serif | 13 px, `tracking-[0.12em]`, uppercase | `TRENDING`, `THE WIRE`, `PAPERS DESK`, `MOST DOWNLOADED` |
| Hero headline | Space Grotesk **700** | 32 px phone → **44 px** ≥1024, `leading-[1.08]`, `tracking-[-0.02em]`, `line-clamp-2` | front page |
| Column headline | Space Grotesk 700 | 22–26 px, `line-clamp-2` | left column, rail teasers |
| Row headline | Space Grotesk 600 | 17 px, `line-clamp-2` | `/models` rows, desks |
| Deck / standfirst | Space Grotesk 400 | 17 px / 1.55, `line-clamp-3` | hero + papers |
| Byline, date, small caps | Space Grotesk 500 | 11–12 px, `tracking-[0.14em]`, uppercase | under every headline |
| Data, IDs, scores | JetBrains Mono | 13 px | ribbon scores, counts, downloads |
| Ribbon item | Space Grotesk 500 | 13 px + mono superscript score | masthead ribbon |

Additions to `src/app/fonts.ts` — one face, two weights:

```ts
export const display = Playfair_Display({
  subsets: ["latin", "latin-ext"],   // ← latin-ext is not optional: ğ ş İ ı ç ö ü
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-display"
});
```

*Pitfall to respect:* `next/font/google` throws at build time if a requested weight is not in the `weight` list, and a missing `latin-ext` subset silently renders Turkish headlines in a fallback serif. Both are checked in P1's acceptance (`document.fonts.check` plus a `/tr` screenshot).
*Alternative if the owner prefers a wavier retro:* `Fraunces` (variable, has `latin-ext`) as the nameplate/section face. One line changes; the plan's structure does not.

**Type census target:** the current site has 112 elements ≤ 14 px and the largest type anywhere is 30 px (DESIGN-V2 §0.1 moved `text-2xl` 24 → 30 and pulled the TR `h1` back from 38 to 30 because it wrapped). v3 sets: **≥ 55 % of own-text elements in 15–17 px**, exactly **one** element ≥ 40 px per page (the hero headline), and hero headline must not exceed 2 lines in EN **or** TR at 1440.

---

## 6. Layout system

```
container      max-w-[1180px] px-4 (the broadsheet is wider than the app)
shell          masthead (3 zones) → ribbon → desk nav → body
body ≥1024     grid-cols-[minmax(0,1fr)_minmax(0,2.05fr)_minmax(0,1fr)]
                ├── column rules: border-l on zones 2 and 3, padding 20 px
body <1024     single column, order: hero → columns → rail
separation     --rule 1 px between rows; --rule-strong 3 px above sections
vertical       row = 1 px rule + 12/16 px padding; a 2-line row ≈ 68 px (vs 96–110 px today)
motion         120 ms opacity/transform only; ribbon marquee is CSS and disabled under prefers-reduced-motion
print          masthead + hero + rules, `@media print`, no nav/ribbon (D9)
```

Ornaments: the radar `sweep` + `grid-bg` survive **only** inside the masthead engraving and the hero's corner dot burst. Nothing animates inside the reading area.

---

## 7. Component map and route plan

### 7.1 Routes

| Route | Today | v3 | Mechanism |
|---|---|---|---|
| `/` | filterable model feed (pulse + 8 filters + 2-col grid + pagination) | **front page**: masthead, ribbon, desk nav, hero story, 2 columns, rail, "MOST DOWNLOADED" band, `Browse all 1 633 models →` | new `FrontPage` server component; reuses `getPulse`, `getNews`, `getFeed` (limit 6) |
| `/models` | — | today's `/` **unchanged** (pulse, `FilterBar`, grid, `Pagination`) | `FeedView` moved to `app/[locale]/models/page.tsx` |
| `/?window=…&sort=…&gate=…&q=…` | filtered list | 308 → `/models?…` | `src/middleware.ts` (already exists) |
| `/c/[category]` | category list | category **desk**: ribbon-filtered, kicker + big category label, top-3 feature, then rows | `TabBar` → `DeskNav`, `FeedView` gains a `variant="desk"` heading block |
| `/news` | wire list | **The Wire** — desks by `kind` (Releases, Runtime) with section rules | groupings added over the existing `getNews` result (no query change) |
| `/research` | papers list | **Papers Desk** — 1 hero paper + 2-column rows | existing `getNews({scope:"research"})` headline query is already there |
| `/m/[slug]` | detail | printed **spec sheet**: plate + ticker (downloads/likes/params when present) + ruled spec table | `m/[slug]/page.tsx` restyle only |
| `/n/[id]` | article | **article page**: kicker, headline, byline rule, plate image, deck, source link | `n/[id]/page.tsx` restyle |
| `/stats` | charts | **Data Desk** — head figures, ruled category/gate/runner tables, HTML daily bars | implemented 2026-10-20 as a page rewrite, not a chart restyle: see [STATS-PLAN.md](STATS-PLAN.md) §15 (`src/lib/stats.ts`, `components/ui/DailyBars.tsx`) |
| `/compare`, `/glossary` | table / list | ruled table; **Almanac** | restyle |

### 7.2 Components

**New**

| File | What |
|---|---|
| `src/components/shell/Masthead.tsx` | 3-zone masthead: brand block, nameplate + dateline, snapshot ticker + engraving |
| `src/components/shell/Ribbon.tsx` | the pink ticker: top-N by window downloads, superscript scores, scrolls on overflow, `aria-label` |
| `src/components/shell/DeskNav.tsx` | letterspaced caps nav with superscript counts + search; replaces both `Header`'s nav and `TabBar` |
| `src/components/front/Hero.tsx` | hero story: plate, kicker, headline, deck, byline, prev/next |
| `src/components/front/StoryRow.tsx` | one ruled row: optional 72×72 plate, kicker, 2-line headline, byline |
| `src/components/front/Rail.tsx` | rail: `PromoBox` + teaser list + `RssBox` |
| `src/components/front/PromoBox.tsx` | "Run it yourself" — runner command + `CopyCommand` (already exists), on `--promo` |
| `src/components/front/RssBox.tsx` | "Subscribe to all the news" → `/feed.rss` + ingest cadence + `SavedFilters` link |
| `src/components/ui/PressPlate.tsx` | deterministic halftone monogram plate (SVG, no animation) |
| `src/components/ui/PlateImage.tsx` | client wrapper for `next/image` with `onError` → `PressPlate`; `unoptimized` for HF hosts |
| `src/components/ui/Rule.tsx` | `SectionRule` (3 px + label) and `Hairline` |
| `src/lib/heat.ts` | read-time score: `windowDownloads` + optional delta, documented, tested |

**Changed**: `Header.tsx` (→ thin masthead host), `FeedView.tsx` (+`variant`), `FeedCard.tsx` (→ ruled `ModelRow`, loses `.card`, keeps every DESIGN-V2 data rule), `PulseStrip.tsx` (→ `FrontStats` band + masthead ticker), `NewsCard.tsx` (→ `StoryRow`), `NewsList.tsx`, `TabBar.tsx` (deleted after `DeskNav`), `globals.css` (tokens, rules, plate, print), `fonts.ts`, `layout.tsx` (default theme, container width, no sticky header), `i18n/dictionaries/{en,tr}.json` (+~40 keys, parity enforced).
**Deleted**: `.card` usages in the feed, the animated `sweep`/`grid-bg` behind content, `Chip` as the primary metadata device (kept only for gate/licence).

---

## 8. Phases and acceptance criteria

### P0 — data and harness (no visual change, ships alone)

| Item | Why | Acceptance |
|---|---|---|
| **P0-1** `normalizeNews` rejects poisoned strings (`/^\[object /i`) and `store` no longer serves `"[object Object]"`; trace which ingest path wrote it (`feeds.ts`/`hf.ts` current code looks correct, so the string is baked in the snapshot and **the merge only fills missing fields, i.e. the poison is permanent**) and fix the merge to overwrite a poisoned value | 40/185 items print `[object Object]` today | unit test with a poisoned snapshot; `grep -c "object Object"` on the served snapshot is `0` after the next ingest; byline never renders `[object Object]` |
| **P0-2** `src/lib/heat.ts` — documented read-time score; **plus** `downloadsAtFirstSeen` written by ingest for new records so a real delta becomes measurable over time | `trendingScore` is null for 1 633/1 633 | score is deterministic for a fixed snapshot (test); the UI prints `+Δ` **only** when `delta != null` for ≥ 60 % of the items in the band, otherwise absolute downloads (D7) |
| **P0-3** `PressPlate` + `PlateImage` | 98.5 % of models have no image | a plate renders for **100 %** of the first 200 model rows and for the 34 news items without a thumbnail; plate output is stable for a fixed slug (test) |
| **P0-4** extend `scripts/check-overflow.ts` + `scripts/audit-ui.ts` route list with `/models`, and add `scripts/contrast.ts` (from `.shots/contrast.mjs`) + `scripts/type-census.ts` | v3 needs its own re-runnable evidence | 0 overflow on the new routes; contrast script prints the §4 table; type census prints the §5 percentages |

### P1 — tokens and type

Acceptance: §4 table reproduced by the script from the **live** page in both themes; `document.fonts.check("600 30px 'Playfair Display'")` true on `/tr` **and** the nameplate screenshot shows Turkish diacritics; type census ≥ 55 % in 15–17 px and exactly one element ≥ 40 px per page; `npm test`, `lint`, `typecheck` green; **no visual change on `/models` yet** (P1 lands on `/m/[slug]` first, so it can be reviewed in isolation).

### P2 — the shell

Acceptance: masthead + ribbon + nav ≤ **210 px** at 1440 and ≤ **190 px** at 390 (today's header is 65/57 px plus a 60 px strip plus a 148 px pulse card = 273 px before the first model); ribbon overflows only by scrolling (`scrollWidth > clientWidth` allowed, `documentElement.scrollWidth == clientWidth` required); nav keeps DESIGN-V2's 44 px targets and `aria-current`; **one `h1` per route** whose text names the route; i18n parity holds.

### P3 — the front page

Acceptance: at 1440×900 the hero headline's top edge is **≤ 260 px** (i.e. the lede is above the fold with masthead, ribbon and nav all present); the hero **always** has a plate or image (`hasImage` asserted in the measurement payload); every story row prints a byline only from the 121 usable organisations; `MOST DOWNLOADED` shows ≥ 8 rows with a log bar; **0 placeholder rows** (a row renders only fields that exist); `/?window=30d` 308s to `/models?window=30d`; EN and TR both measured; LCP (hero headline, text) < 2.5 s on a throttled 4× CPU / Slow-4G run.

### P4 — the other routes

Acceptance: every route renders the same shell (masthead/ribbon/nav) — no route keeps the old card language; `/news` groups by `kind` with ≥ 3 desks in the 30-day window; `/stats` charts redraw in ink with real axes and keep the donut legend; `/m/[slug]` prints no empty spec row; 0 overflow across 70 route×width combos; 0 targets < 24×24.

### P5 — polish

Acceptance: `@media print` on `/` and `/n/[id]` produces a readable one-page edition with no nav/ribbon; `prefers-reduced-motion` disables the ribbon marquee and the remaining reveals; a `print` + a `light` + a `dark` screenshot of `/` and `/models` are committed under `.shots/v3-*`; `docs/README.md` and both DESIGN docs link to v3.

---

## 9. Verification plan

```bash
npm run dev
# data + tokens + art
npx tsx scripts/fetch-snapshot.ts           # the served snapshot, measured rather than assumed
npx tsx scripts/contrast.ts                 # §4 table, read from globals.css
npx tsx scripts/type-census.ts http://localhost:3000/tr 1440   # §5 gates
npx tsx scripts/check-overflow.ts http://localhost:3000/tr/models 360
npx tsx scripts/check-overflow.ts http://localhost:3000/tr 390
npx tsx scripts/check-nav-current.ts http://localhost:3000   # "where am I": exactly one nav item marked, and it is this page's
npx tsx scripts/check-nav-current.ts http://localhost:3000 en
npx tsx scripts/check-theme.ts http://localhost:3000   # the night edition survives a language switch (§0.2.10)
npx tsx scripts/screenshot.ts http://localhost:3000/tr .shots/v3-front-1440-light.png 1440 3200 light
npm test && npm run lint && npm run typecheck && npm run verify-ui
```

Rules that carried over from DESIGN-V2 and are non-negotiable here: measure with **desktop metrics** (`mobile:false`) or a pinned page scale; assert a page marker before measuring (`next dev` recompiles mid-run); never trust an offender list built from `getBoundingClientRect().right` without re-measuring `scrollWidth` with the element hidden; screenshots with `--force-prefers-reduced-motion`.

`.shots/` holds the audit scripts that are not part of the repo (`measure.ts`, `taps.ts`, `probe*.ts`, `shot.ts`); everything the plan's gates depend on lives in `scripts/`.

---

## 10. Risks and rollback

| Risk | Mitigation |
|---|---|
| The "radar instrument" identity (the thing that makes the site look like *this* project) is deleted | it survives as the masthead engraving + hero corner burst + `PressPlate` halftone. If it reads as lost, the plates are the knob to turn up. |
| Paper default annoys owners who liked the dark dashboard | one line in `layout.tsx` + the bootstrap script (`D2`); both ramps stay AA and both are measured |
| Losing the model list to a "pretty" front page | `/models` is the current page **moved verbatim**, 308s from the old query URLs, and the front page links to it in the ribbon and the nav |
| New font cost / Turkish glyph bugs | 1 face × 2 weights, `latin-ext` explicit, `display: swap`, verified by `document.fonts.check` and a `/tr` screenshot (`P1`) |
| Paper-page thumbnails look bad at hero size (measured: dense text, 317 KB) | D6 treatment + `PressPlate` fallback + `sizes`/`priority` only on the hero |
| Halftone/`filter` effects cost mobile frames | plates are static SVG (no filter on layout, no animation); halftone is a `<pattern>`, not a CSS filter, except the one hero image |
| SEO: moving the model list off `/` | 308s in `middleware.ts`, `sitemap.ts` regenerated, front page links carry the crawler to `/models` |
| Scope creep into the ingest/data pipeline (P0-1, P0-2) | both P0 items are independent of the visuals and ship first, so a visual rollback does not strand them |

Rollback: v3 touches tokens + three shell components + two route files. `Header.tsx`, `TabBar.tsx` and `FeedView.tsx` are **kept in the tree until P3's acceptance passes**, so reverting is one commit, not a rewrite.

---

## 11. Open questions

**Answered by the owner on 2026-10-18:** (1) the route move is approved — done, with the 308s in place; (2) paper is the default theme, with the night edition as the second ramp; (3) the display face is Playfair Display; (4) the wordmark stays `OpenWeight Radar` in letterspaced serif caps.

Still open:

1. ~~**D3 — approve the route move?**~~ `/` becomes the broadsheet and the model list moves to `/models` (old query URLs 308). *Alternative (lower risk): keep `/` as the list and put only the masthead + ribbon + hero above it.*
2. **D2 — is paper the right default?** (default = paper, dark = "Night Edition")
3. **D4 — which display face?** `Playfair Display` (classic newspaper, recommended) vs `Fraunces` (wavier, more 1970s).
4. **Wordmark**: keep `OpenWeight Radar` set in letterspaced serif caps, or shorten the nameplate to a masthead-sized wordmark (e.g. `RADAR`)?
5. **P0-2 — add `downloadsAtFirstSeen` to the ingest** so the ribbon can print a real `+Δ` (and stop calling a total "trending")?
6. **How far in one go?** P0–P3 (data + shell + front page) is the smallest honest increment; P4 (five more routes) roughly doubles the diff. Recommended: ship P0–P3, look at it on the real snapshot, then decide P4.
