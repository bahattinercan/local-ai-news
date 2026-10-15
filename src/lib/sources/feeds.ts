export interface FeedItem {
  /** Stable id from the feed, used as the dedupe key after prefixing. */
  id: string;
  title: string;
  summary: string | null;
  url: string;
  publishedAt: string;
  author: string | null;
}

/**
 * Reddit returns 403/429 to non-browser agents, so the browser-like UA is not
 * cosmetic: measured 2026-10-15, a plain fetch got no items while this returns
 * 25. Reddit also rate-limits bursts (three calls 2s apart all returned 429),
 * so callers must treat any non-200 as "keep what we already have".
 */
export const FEED_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
  Accept: "application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  "#8217": "'",
  "#8216": "'",
  "#8220": '"',
  "#8221": '"',
  "#8230": "…",
  "#x27": "'",
  "#x2F": "/"
};

export function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z#0-9]+);/gi, (match, name: string) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? match);
}

function stripMarkup(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    // A truncated payload can end mid-tag (`<a href="https://…`), which the
    // rule above cannot match. Drop the partial tail and a partial entity.
    .replace(/<[^>]*$/, "")
    .replace(/&[a-zA-Z#0-9]{0,8}$/, "");
}

/**
 * Feeds carry HTML in `content`/`description`. We keep a short plain-text
 * summary and never republish the body: the detail view links to the source.
 *
 * Order matters and Reddit is why. Its `<content>` holds *escaped* markup
 * (`&lt;p&gt;`), so stripping tags before decoding entities yields text that
 * still contains `<p>`; decoding first (twice) handles plain HTML, escaped
 * HTML and doubly escaped HTML with one code path.
 */
export function toPlainText(html: string): string {
  let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  for (let pass = 0; pass < 2; pass += 1) {
    text = decodeEntities(stripMarkup(text));
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Tag/text extraction that tolerates attributes, CDATA and self-closing tags. */
function blocks(xml: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "gi");
  return [...xml.matchAll(pattern)].map((match) => match[1]);
}

function tagText(block: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i");
  const match = block.match(pattern);
  if (!match) return null;
  const raw = match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
  return raw.length > 0 ? raw : null;
}

function linkHref(block: string): string | null {
  const links = [...block.matchAll(/<link\b([^>]*)\/?>/gi)].map((match) => match[1]);
  if (links.length === 0) return null;

  const href = (attrs: string): string | null => {
    const match = attrs.match(/href\s*=\s*"([^"]*)"/i) ?? attrs.match(/href\s*=\s*'([^']*)'/i);
    return match ? decodeEntities(match[1]) : null;
  };

  // prefer the alternate (human) link over e.g. rel="self" or an enclosure
  const alternate = links.find((attrs) => /rel\s*=\s*["']?alternate/i.test(attrs));
  return href(alternate ?? links[0]);
}

function firstText(block: string, tags: string[]): string | null {
  for (const tag of tags) {
    const value = tagText(block, tag);
    if (value) return value;
  }
  return null;
}

export function parseAtom(xml: string): FeedItem[] {
  return blocks(xml, "entry")
    .map((entry) => {
      const id = firstText(entry, ["id"]);
      const title = firstText(entry, ["title"]);
      const url = linkHref(entry);
      const published = firstText(entry, ["published", "updated"]);
      if (!id || !title || !url || !published) return null;

      const html = firstText(entry, ["content", "summary"]);
      const author = tagText(entry, "name");
      return {
        id,
        title: toPlainText(title),
        summary: html ? toPlainText(html).slice(0, 600) : null,
        url,
        publishedAt: new Date(published).toISOString(),
        author: author ? toPlainText(author) : null
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

export function parseRss(xml: string): FeedItem[] {
  return blocks(xml, "item")
    .map((item): FeedItem | null => {
      const title = firstText(item, ["title"]);
      const url = firstText(item, ["link"]) ?? linkHref(item);
      const published = firstText(item, ["pubDate", "published", "dc:date"]);
      const guid = firstText(item, ["guid"]);
      if (!title || !url || !published) return null;

      const description = firstText(item, ["description", "summary", "content:encoded"]);
      return {
        id: guid ?? url,
        title: toPlainText(title),
        summary: description ? toPlainText(description).slice(0, 600) : null,
        url: decodeEntities(url.trim()),
        publishedAt: new Date(published).toISOString(),
        author: null
      };
    })
    .filter((item): item is FeedItem => item !== null);
}

export function parseFeed(xml: string, format: "atom" | "rss"): FeedItem[] {
  return format === "atom" ? parseAtom(xml) : parseRss(xml);
}

export async function fetchFeed(
  url: string,
  format: "atom" | "rss",
  fetchImpl: typeof fetch = fetch
): Promise<FeedItem[]> {
  const response = await fetchImpl(url, { headers: FEED_HEADERS });
  if (!response.ok) {
    throw new Error(`feed ${url} returned ${response.status}`);
  }
  return parseFeed(await response.text(), format);
}
