export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  guid?: string;
}

export interface RssOptions {
  title: string;
  link: string;
  description: string;
  language: string;
  items: RssItem[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildRss(options: RssOptions): string {
  const items = options.items
    .map((item) => {
      const guid = item.guid ?? item.link;
      return [
        "    <item>",
        `      <title>${escapeXml(item.title)}</title>`,
        `      <link>${escapeXml(item.link)}</link>`,
        `      <guid isPermaLink="${guid.startsWith("http") ? "true" : "false"}">${escapeXml(guid)}</guid>`,
        `      <pubDate>${new Date(item.pubDate).toUTCString()}</pubDate>`,
        item.description ? `      <description>${escapeXml(item.description)}</description>` : "",
        "    </item>"
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(options.title)}</title>`,
    `    <link>${escapeXml(options.link)}</link>`,
    `    <description>${escapeXml(options.description)}</description>`,
    `    <language>${escapeXml(options.language)}</language>`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(options.link)}" rel="self" type="application/rss+xml"/>`,
    items,
    "  </channel>",
    "</rss>"
  ].join("\n");
}
