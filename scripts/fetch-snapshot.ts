/**
 * Download the live snapshot the site actually serves, so measurements describe
 * production data instead of the stale `data/feed.json` in the repo.
 *
 *   npx tsx scripts/fetch-snapshot.ts [outPath]
 *
 * The Blob object is private, so this reads it with the read-write token rather
 * than over plain HTTP (a bare `curl "$SNAPSHOT_URL"` answers 403 Forbidden).
 * Writes to `.shots/live-snapshot.json` by default; `.shots/` is gitignored.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const out = process.argv[2] ?? ".shots/live-snapshot.json";
const url = process.env.SNAPSHOT_URL;
const token = process.env.BLOB_READ_WRITE_TOKEN;

async function main(): Promise<void> {
  if (!url) throw new Error("SNAPSHOT_URL is not set (load .env first)");

  let text: string | null = null;
  if (token) {
    const { get } = await import("@vercel/blob");
    const result = await get(url, { token, access: "private" });
    if (result && result.statusCode === 200) text = await new Response(result.stream).text();
    else console.warn(`blob read answered ${result?.statusCode ?? "nothing"}, falling back to plain fetch`);
  }
  if (text === null) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} for the snapshot url`);
    text = await response.text();
  }

  const parsed = JSON.parse(text) as { generatedAt?: string; models?: unknown[]; news?: unknown[] };
  if (!Array.isArray(parsed.models)) throw new Error("snapshot has no models array");

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  console.log(
    `${out}: generatedAt ${parsed.generatedAt ?? "?"} · ${parsed.models.length} models · ${parsed.news?.length ?? 0} news`
  );
}

main().catch((error) => {
  console.error((error as Error).message);
  process.exit(1);
});
