/**
 * The four Open Graph cards, in one module.
 *
 * docs/en/SEO-PLAN.md §4.4 asks for four `opengraph-image.tsx` routes and §16
 * lists them by segment. Four files that each build their own colours and
 * type scale would drift the first time the palette moves, so the palette, the
 * type scale, the font loading and the card component live here and the route
 * files are thin: read the snapshot row, pick the text, render.
 *
 * Two rules this module keeps:
 *
 * 1. **The text selection is pure.** `ogModelCard`, `ogNewsCard`,
 *    `ogGlossaryCard` and `ogSiteCard` take snapshot data and return the exact
 *    strings a card prints. Tests pin them (`tests/og.test.ts`) because
 *    `ImageResponse` cannot run in a unit test — Satori needs a WASM resvg.
 * 2. **The font is a committed file, read from disk.** `next/font/google`
 *    returns CSS objects Satori cannot consume, so the card reads TTFs from
 *    `public/fonts/` with `readFile` — never `fetch`, so the route works in
 *    CI with no network and on any runtime with a filesystem. See
 *    `public/fonts/README.md` for provenance and licence (OFL 1.1).
 *
 * Colours are the paper/ink tokens of docs/en/DESIGN-V3.md §4, copied here
 * rather than read from CSS: an image is not in the DOM, and the card must stay
 * paper-toned even when the reader's theme is the night edition.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CSSProperties, ReactElement } from "react";
import { formatCount, formatEditionDate } from "@/lib/format";
import { getGlossaryEntry, GLOSSARY_CATEGORIES, glossaryText, type GlossaryEntry } from "@/lib/glossary";
import type { ClassifiedModel } from "@/lib/model";
import { newsText, truncateAtWord } from "@/lib/news-text";
import { formatParams } from "@/lib/runner/vram";
import { categoryWord, SITE_NAME, SITE_URL } from "@/lib/seo";
import type { SnapshotNews } from "@/lib/store";
import { dictionary, pickLocale, t, type Locale } from "@/i18n";

/* --------------------------------------------------------------- the frame -- */

/** Every card is the same size; the four routes re-export this object. */
export const OG_SIZE: { width: number; height: number } = { width: 1200, height: 630 };

/** Satori emits PNG through resvg; `ImageResponse` sets no other type. */
export const OG_CONTENT_TYPE = "image/png";

/** docs/en/DESIGN-V3.md §4 — paper ramp, ink, one rose accent. */
export const OG_PALETTE = {
  paper: "#f2efe6",
  surface: "#fdfcf8",
  ink: "#141310",
  muted: "#58544a",
  accent: "#b3123f",
  rule: "#cdc6b4",
  ruleStrong: "#2a2823"
} as const;

/** The host a reader sees under the card, e.g. `openweightradar.com`. */
export const OG_HOST = SITE_URL.replace(/^https?:\/\//, "").replace(/\/+$/, "");

/* -------------------------------------------------------------- the fonts -- */

export interface OgFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700;
  style: "normal";
}

/**
 * Read once per process, not per request: the files cannot change under a
 * running deployment, and `ImageResponse` only needs the buffers.
 *
 * `process.cwd()` is the project root for both `next dev` and `next start`; the
 * paths are literal so a bundler can trace them into a serverless function.
 */
let fontsPromise: Promise<OgFont[]> | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function readFont(file: string, weight: 400 | 700): Promise<OgFont> {
  const data = toArrayBuffer(await readFile(join(process.cwd(), "public", "fonts", file)));
  return {
    /* These must match the `fontFamily` values used below, and are the family
       names the committed files carry internally. */
    name: file.startsWith("Playfair") ? "Playfair Display" : "Space Grotesk",
    data,
    weight,
    style: "normal"
  };
}

export function loadOgFonts(): Promise<OgFont[]> {
  fontsPromise ??= Promise.all([
    readFont("PlayfairDisplay-Bold.ttf", 700),
    readFont("SpaceGrotesk-Regular.ttf", 400),
    readFont("SpaceGrotesk-Bold.ttf", 700)
  ]);
  return fontsPromise;
}

/* ------------------------------------------------------------ card shape -- */

export interface OgFact {
  label: string;
  value: string;
}

/**
 * Everything a card prints, already decided. The component below only styles it,
 * so a test can assert the text without rendering a PNG.
 */
export interface OgCard {
  /** Top-right masthead label: the host on the site card, the segment name elsewhere. */
  masthead: string;
  /** Letterspaced strap above the headline: the desk, the kind, the edition. */
  kicker: string;
  /** The headline: entity name, term, cleaned news title or the brand. */
  title: string;
  /** One supporting line — author, standfirst, definition. `null` when absent. */
  deck: string | null;
  /** At most three label/value columns; empty means the card prints none. */
  facts: OgFact[];
  /** Bottom line, always `site · tagline`. */
  footer: string;
}

/** Long entity names are cut at a word boundary; the card never prints a hard cut. */
const MODEL_TITLE_MAX = 42;
const NEWS_TITLE_MAX = 64;
const NEWS_DECK_MAX = 120;
const GLOSSARY_TITLE_MAX = 38;
const GLOSSARY_DECK_MAX = 150;

function footer(locale: Locale): string {
  const dict = dictionary(locale);
  return `${SITE_NAME} · ${t(dict, "tagline")}`;
}

/**
 * The unknown-slug card. A shared file convention can be requested directly, so
 * `/en/m/does-not-exist/opengraph-image` must answer a picture rather than a
 * 500. It prints the nameplate, the brand and the tagline — all from the
 * dictionary, so the fallback needs no new copy — and no entity row at all,
 * which is the honest thing to show when the entity does not exist.
 *
 * The masthead word (`MODEL`, `NEWS`, `GLOSSARY`) is the segment name the site
 * itself uses for these desks: taxonomy, not UI copy (DESIGN.md decision 9), and
 * the dictionaries are outside this change's ownership.
 */
function genericCard(kind: string, locale: Locale): OgCard {
  const dict = dictionary(locale);
  return {
    masthead: kind,
    kicker: "",
    title: SITE_NAME,
    deck: t(dict, "tagline"),
    facts: [],
    footer: SITE_NAME
  };
}

/* ------------------------------------------------------------- site card -- */

export interface SiteCardInput {
  /** Snapshot `generatedAt` — the edition the numbers come from. */
  generatedAt: string | null;
  tracked: number;
  passed: number;
  locale?: Locale | string | null;
}

/**
 * `src/app/[locale]/opengraph-image.tsx`: the nameplate, the tagline, the
 * edition and the two counts the masthead prints (docs/en/SEO-PLAN.md §4.4).
 */
export function ogSiteCard(input: SiteCardInput): OgCard {
  const locale = pickLocale(input.locale);
  const dict = dictionary(locale);
  const edition = formatEditionDate(input.generatedAt, locale);
  return {
    masthead: OG_HOST,
    kicker: edition ? t(dict, "stats.dateline", { when: edition }) : "",
    title: SITE_NAME,
    deck: t(dict, "tagline"),
    facts: [
      { label: t(dict, "stats.trackedCol"), value: formatCount(input.tracked, locale) },
      { label: t(dict, "stats.passedCol"), value: formatCount(input.passed, locale) }
    ],
    /* The deck is already the tagline here, so the footer stays the brand. */
    footer: SITE_NAME
  };
}

/* ------------------------------------------------------------ model card -- */

/** `someone/Cheddar-2.0` → `Cheddar-2.0`; the card prints the repo name, not the owner twice. */
function repoName(model: ClassifiedModel): string {
  const slash = model.externalId.indexOf("/");
  return slash > 0 ? model.externalId.slice(slash + 1) : model.externalId;
}

/**
 * `src/app/[locale]/m/[slug]/opengraph-image.tsx`: model name, author, category
 * and up to three facts the snapshot actually reports — params, licence, VRAM
 * estimate, then the first quantizations. A fact whose field is null is absent,
 * never printed as `—` or `unknown` (§4.2's rule for descriptions, applied to
 * the image so the card cannot advertise a spec the page does not show).
 */
export function ogModelCard(model: ClassifiedModel | null, localeInput?: Locale | string | null): OgCard {
  const locale = pickLocale(localeInput);
  const dict = dictionary(locale);
  /* "Model" is the same word in both locales; it is the segment name, not copy. */
  if (!model) return genericCard("MODEL", locale);

  /* `categoryWord` is the one-word taxonomy term used in titles; `categoryLabel`
     returns the desk name ("Language / LLM"), which is too long for a kicker. */
  const category = categoryWord(model.primaryCategory, locale);
  const facts: OgFact[] = [];
  if (model.paramsTotal) facts.push({ label: t(dict, "card.params"), value: formatParams(model.paramsTotal) });
  const license = model.licenseName ?? model.license;
  if (license) facts.push({ label: t(dict, "card.license"), value: license });
  if (model.vramEstGb) facts.push({ label: t(dict, "card.vram"), value: `~${model.vramEstGb} GB` });
  /* Three columns read as a spec strip; a fourth turns the row into a paragraph. */
  if (facts.length < 3 && model.quantizations.length > 0) {
    facts.push({
      label: t(dict, "detail.quantizations"),
      value: model.quantizations.slice(0, 2).join(" · ")
    });
  }

  const author = model.author?.trim() || model.externalId.split("/")[0] || null;

  return {
    masthead: "MODEL",
    kicker: `MODEL · ${category}`,
    title: truncateAtWord(repoName(model) || model.name, MODEL_TITLE_MAX),
    deck: author,
    facts: facts.slice(0, 3),
    footer: footer(locale)
  };
}

/* ------------------------------------------------------------- news card -- */

function newsKindLabel(item: SnapshotNews, locale: Locale): string {
  return t(dictionary(locale), `news.${item.kind}`);
}

/** The source `newsText` cannot give: the organisation, else the linked host. */
function newsSource(item: SnapshotNews): string | null {
  const organization = item.organization?.trim();
  if (organization) return organization;
  try {
    return new URL(item.url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * `src/app/[locale]/n/[id]/opengraph-image.tsx`: the cleaned headline, the
 * source and the date. `newsText` is the same cleaner the page and the metadata
 * use, so a card can never print the raw commit subject or a bare URL that the
 * page itself strips (docs/en/NEWS-PLAN.md §6).
 */
export function ogNewsCard(item: SnapshotNews | null, localeInput?: Locale | string | null): OgCard {
  const locale = pickLocale(localeInput);
  const dict = dictionary(locale);
  if (!item) return genericCard(t(dict, "news.title"), locale);

  const { title, body, buildTag } = newsText(item, { titleMax: 110, bodyMax: 200 });
  const headline = truncateAtWord(title || buildTag || t(dict, "news.untitled"), NEWS_TITLE_MAX);
  const source = newsSource(item);
  const date = formatEditionDate(item.publishedAt, locale);

  const facts: OgFact[] = [];
  if (source) facts.push({ label: t(dict, "news.source"), value: source });
  if (date) facts.push({ label: t(dict, "news.kind"), value: newsKindLabel(item, locale) });

  return {
    masthead: t(dict, "news.title"),
    kicker: [newsKindLabel(item, locale), date].filter(Boolean).join(" · "),
    title: headline,
    /* A two-word residual ("minimax-h3 · transformers") is a tag, not a deck. */
    deck: body.length >= 60 ? truncateAtWord(body, NEWS_DECK_MAX) : null,
    facts,
    footer: footer(locale)
  };
}

/* --------------------------------------------------------- glossary card -- */

/**
 * `src/app/[locale]/glossary/[slug]/opengraph-image.tsx`: the term, its summary
 * and the desk it belongs to. The term is a proper noun in both locales, so the
 * slug lookup is locale-free (`getGlossaryEntry`) and only the summary switches
 * language.
 */
export function ogGlossaryCard(entry: GlossaryEntry | null, localeInput?: Locale | string | null): OgCard {
  const locale = pickLocale(localeInput);
  const dict = dictionary(locale);
  if (!entry) return genericCard(t(dict, "nav.glossary"), locale);

  const text = glossaryText(entry, locale);
  const category = GLOSSARY_CATEGORIES[entry.category][locale];

  return {
    masthead: t(dict, "nav.glossary"),
    kicker: `${t(dict, "glossary.title").toUpperCase()} · ${category}`,
    title: truncateAtWord(text.term, GLOSSARY_TITLE_MAX),
    deck: truncateAtWord(text.summary, GLOSSARY_DECK_MAX),
    facts: [],
    footer: footer(locale)
  };
}

/** Route-side lookup, so a route file stays one line of data access. */
export function ogGlossaryCardBySlug(slug: string, locale?: Locale | string | null): OgCard {
  return ogGlossaryCard(getGlossaryEntry(slug) ?? null, locale);
}

/* ------------------------------------------------------------ the picture -- */

const NAME_FONT = "Playfair Display";
const TEXT_FONT = "Space Grotesk";

const root: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: OG_PALETTE.paper,
  color: OG_PALETTE.ink,
  padding: "46px 64px 40px",
  fontFamily: TEXT_FONT
};

/** Letterspaced small caps — the masthead and every label on the page share it. */
const strap: CSSProperties = {
  fontSize: 17,
  letterSpacing: "0.18em",
  textTransform: "uppercase"
};

export interface OgCardViewProps {
  card: OgCard;
}

/**
 * The broadsheet card: nameplate between rules, a kicker, one headline, an
 * optional deck, a ruled spec strip and a footer. Satori supports flexbox and a
 * subset of CSS only (§ `ImageResponse` docs), so there is no grid here.
 */
export function OgCardView({ card }: OgCardViewProps): ReactElement {
  return (
    <div style={root}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            fontFamily: NAME_FONT,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: "0.14em",
            textTransform: "uppercase"
          }}
        >
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", ...strap, fontSize: 15, color: OG_PALETTE.muted }}>
          {card.masthead}
        </div>
      </div>

      <div style={{ display: "flex", borderTop: `3px solid ${OG_PALETTE.ruleStrong}`, marginTop: 14 }} />

      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", paddingTop: 26, paddingBottom: 22 }}>
        {card.kicker ? (
          <div style={{ display: "flex", ...strap, color: OG_PALETTE.accent, marginBottom: 16 }}>{card.kicker}</div>
        ) : null}
        <div
          style={{
            display: "flex",
            fontFamily: TEXT_FONT,
            fontWeight: 700,
            fontSize: card.title.length > 40 ? 60 : 74,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            lineClamp: 2
          }}
        >
          {card.title}
        </div>
        {card.deck ? (
          <div
            style={{
              display: "flex",
              fontSize: 27,
              lineHeight: 1.35,
              color: OG_PALETTE.muted,
              marginTop: 18,
              lineClamp: 3
            }}
          >
            {card.deck}
          </div>
        ) : null}
      </div>

      {card.facts.length > 0 ? (
        <div style={{ display: "flex", borderTop: `1px solid ${OG_PALETTE.rule}`, paddingTop: 20, gap: 54 }}>
          {card.facts.map((fact) => (
            <div key={fact.label} style={{ display: "flex", flexDirection: "column", maxWidth: 380 }}>
              <div style={{ display: "flex", ...strap, fontSize: 14, color: OG_PALETTE.muted }}>{fact.label}</div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700, marginTop: 8, lineClamp: 1 }}>{fact.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${OG_PALETTE.rule}`,
          marginTop: card.facts.length > 0 ? 22 : 0,
          paddingTop: 16,
          alignItems: "baseline",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", fontSize: 17, color: OG_PALETTE.muted }}>{card.footer}</div>
        <div style={{ display: "flex", ...strap, fontSize: 15, letterSpacing: "0.16em", color: OG_PALETTE.accent }}>{OG_HOST}</div>
      </div>
    </div>
  );
}
