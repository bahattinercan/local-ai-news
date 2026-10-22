import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRss } from "../src/lib/rss.ts";

test("RSS output is valid XML with escaped titles", () => {
  const xml = buildRss({
    title: "OpenWeight Radar — Video",
    link: "https://local-ai-news.vercel.app/en/feed.rss?category=video",
    description: "New video models",
    language: "en",
    items: [
      {
        title: "LTX-2.5 <FP8> & \"uncensored\"",
        link: "https://huggingface.co/unsloth/LTX-2.5-FP8",
        pubDate: "2026-10-13T01:52:47.000Z",
        description: "diffusers · fp8"
      }
    ]
  });

  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(xml.includes("<guid isPermaLink=\"true\">"));
  assert.ok(xml.includes("&lt;FP8&gt;"));
  assert.ok(xml.includes("&amp;"));
  assert.ok(xml.includes("Tue, 13 Oct 2026 01:52:47 GMT"));
  assert.ok(xml.includes("<atom:link"));
});

test("empty feed still produces a parseable channel", () => {
  const xml = buildRss({ title: "Empty", link: "https://example.com", description: "none", language: "tr", items: [] });
  assert.ok(xml.includes("<channel>"));
  assert.ok(xml.includes("</channel>"));
});
