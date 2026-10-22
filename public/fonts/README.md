# Card fonts

The four `opengraph-image.tsx` routes draw with the raw TTFs in this directory
(`src/lib/og.tsx` reads them with `readFile`; nothing is fetched at request time).

| File | Family | Weight | Used for |
|---|---|---|---|
| `PlayfairDisplay-Bold.ttf` | Playfair Display | 700 | the nameplate (the site's serif, `src/app/fonts.ts`) |
| `SpaceGrotesk-Regular.ttf` | Space Grotesk | 400 | decks, labels, footer |
| `SpaceGrotesk-Bold.ttf` | Space Grotesk | 700 | headlines, fact values |

Both families are licensed under the **SIL Open Font License 1.1**; the full
texts are `OFL-PlayfairDisplay.txt` and `OFL-SpaceGrotesk.txt` beside them.

## Why these files and not `next/font`

`next/font/google` hands React a CSS class/font object. Satori (`@vercel/og`)
needs the font binary as an `ArrayBuffer`, so the card routes read TTFs from
disk. The `.woff`/`.woff2` files Google serves to browsers are not usable
either: Satori accepts `ttf`, `otf` and `woff`, and a `woff2` subset would drop
the `latin-ext` block that Turkish needs.

## Provenance

- Upstream: <https://github.com/google/fonts/tree/main/ofl/spacegrotesk> and
  <https://github.com/google/fonts/tree/main/ofl/playfairdisplay> (both variable
  fonts, `SpaceGrotesk[wght].ttf` and `PlayfairDisplay[wght].ttf`, retrieved
  2026-10-22).
- The committed files are **static instances** of those variable fonts at the
  weights named above, produced with `fontTools.varLib.instancer` (wght axis
  pinned, no outline, metric or name-table edits). The variable files themselves
  cannot be used: `@vercel/og` fails on the `fvar` table
  (`Cannot read properties of undefined (reading '256')` in `parseFvarAxis`), and
  a pinned instance is what Google's own static download ships.
- Coverage check: `tests/og.test.ts` parses each file's `cmap` and asserts it
  contains `ı İ ş Ş ğ Ğ ü Ü ö Ö ç Ç`. A latin-only subset would fail that test
  instead of silently rendering boxes on a Turkish card.
