import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEED_HEADERS, decodeEntities, parseFeed, toPlainText } from "../src/lib/sources/feeds.ts";

const FIXTURES = ["reddit_localllama", "gh_llama_cpp", "gh_ollama", "gh_vllm"];

function fixture(key: string): string {
  return readFileSync(join(process.cwd(), "tests", "fixtures", "feeds", `${key}.xml`), "utf-8");
}

test("every registered feed fixture parses into usable items", () => {
  for (const key of FIXTURES) {
    const items = parseFeed(fixture(key), "atom");

    assert.ok(items.length > 0, `${key}: parsed no items`);

    for (const item of items) {
      assert.ok(item.id.length > 0, `${key}: empty id`);
      assert.ok(item.title.length > 0, `${key}: empty title`);
      assert.ok(item.url.startsWith("https://"), `${key}: bad url ${item.url}`);
      assert.ok(!Number.isNaN(Date.parse(item.publishedAt)), `${key}: bad date ${item.publishedAt}`);
      assert.ok(Number.isFinite(Date.parse(item.publishedAt)), `${key}: unparseable date`);
    }
  }
});

test("summaries are plain text, never raw markup", () => {
  for (const key of FIXTURES) {
    for (const item of parseFeed(fixture(key), "atom")) {
      if (item.summary === null) continue;
      assert.ok(!item.summary.includes("<"), `${key}: summary still holds a tag`);
      assert.ok(!item.summary.includes("&lt;"), `${key}: summary holds an escaped tag`);
      assert.ok(item.summary.length <= 600, `${key}: summary exceeds the cap`);
    }
  }
});

test("runtime feeds link to release tags and the community feed to reddit", () => {
  for (const key of ["gh_llama_cpp", "gh_ollama", "gh_vllm"]) {
    const items = parseFeed(fixture(key), "atom");
    assert.ok(
      items.every((item) => item.url.includes("/releases/tag/")),
      `${key}: not a release link`
    );
  }

  const reddit = parseFeed(fixture("reddit_localllama"), "atom");
  assert.ok(
    reddit.every((item) => item.url.includes("reddit.com")),
    "reddit: link is not a reddit url"
  );
});

test("entity and markup handling", () => {
  assert.equal(decodeEntities("Muse &amp; Spark &lt;open&gt; &#39;x&#39; &quot;y&quot;"), "Muse & Spark <open> 'x' \"y\"");
  assert.equal(decodeEntities("caf&#233;"), "café");
  assert.equal(toPlainText("<p>Hello <b>world</b></p><br><script>evil()</script>"), "Hello world");
  assert.equal(toPlainText("a\n\n   b"), "a b");
});

test("rss 2.0 items parse with guid as the id", () => {
  const xml = `<rss><channel><item>
    <title>Ollama v0.1 &amp; friends</title>
    <link>https://example.com/a</link>
    <guid>tag:example.com,2026:a</guid>
    <pubDate>Wed, 15 Oct 2026 10:00:00 GMT</pubDate>
    <description><![CDATA[<p>Body text</p>]]></description>
  </item></channel></rss>`;

  const [item] = parseFeed(xml, "rss");
  assert.equal(item.id, "tag:example.com,2026:a");
  assert.equal(item.title, "Ollama v0.1 & friends");
  assert.equal(item.url, "https://example.com/a");
  assert.equal(item.summary, "Body text");
  assert.equal(item.publishedAt, "2026-10-15T10:00:00.000Z");
});

test("a malformed entry is dropped instead of producing a half item", () => {
  const xml = `<feed><entry><title>No link or date</title></entry></feed>`;
  assert.deepEqual(parseFeed(xml, "atom"), []);
});

test("feed requests carry the headers Reddit requires", () => {
  assert.match(FEED_HEADERS["User-Agent"], /Mozilla\/5\.0/);
  assert.match(FEED_HEADERS.Accept, /atom\+xml/);
});

// --- news detail id resolution (Next 16 keeps the segment percent-encoded) ---

import { newsIdCandidates } from "../src/lib/store.ts";

test("a percent-encoded news id resolves to the stored external id", () => {
  const encoded = encodeURIComponent("reddit_localllama:t3_1x6yk1f");
  assert.equal(encoded, "reddit_localllama%3At3_1x6yk1f");
  assert.deepEqual(newsIdCandidates(encoded), [encoded, "reddit_localllama:t3_1x6yk1f"]);
});

test("a release id containing a slash survives the round trip", () => {
  const externalId = "release:ZhengmingYu/DMAD";
  const encoded = encodeURIComponent(externalId);
  // without encoding, the slash would split the path into two segments
  assert.ok(encoded.includes("%2F"));
  assert.equal(newsIdCandidates(encoded).at(-1), externalId);
});

test("a plain id is returned once and a malformed escape does not throw", () => {
  assert.deepEqual(newsIdCandidates("2610.19696"), ["2610.19696"]);
  assert.deepEqual(newsIdCandidates("%E0%A4%A"), ["%E0%A4%A"]);
});
