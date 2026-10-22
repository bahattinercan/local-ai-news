/**
 * Fill `cardSummary` on an existing snapshot without running a full ingest.
 *
 * A full `npm run ingest` spends its request budget on the category listings
 * first, so the 1 000-odd rows already in `data/feed.json` would wait several runs
 * for their model-card text. This reads the snapshot, fills the cards that are
 * still missing (`cardSummary === undefined`), and writes it back - the same write
 * `runIngest` performs, so the app and the publish job see one shape.
 *
 *   npm run cards-backfill -- --limit=40 [--dry] [--all] [--refresh]
 *
 * `--all` also fills cards for rows the gate rejected (the default targets
 * gate-passing models ordered by likes, because those are the pages readers open).
 * `--refresh` clears the stored excerpts first, so a change to the Markdown
 * cleanup (`lib/card-text.ts`) can be applied to text that is already stored.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { backfillCards } from "../src/lib/ingest.ts";
import { HfClient } from "../src/lib/sources/hf.ts";
import type { Snapshot } from "../src/lib/store.ts";

function arg(name: string, fallback: number): number {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? Number(match.split("=")[1]) : fallback;
}

const dryRun = process.argv.includes("--dry");
const refresh = process.argv.includes("--refresh");
const includeRejected = process.argv.includes("--all");
const limit = arg("limit", 40);
const path = join(process.cwd(), "data", "feed.json");

const snapshot = JSON.parse(readFileSync(path, "utf-8")) as Snapshot;
const candidates = includeRejected
  ? snapshot.models
  : snapshot.models.filter((model) => model.qualityPassed && !model.gated);
if (refresh) for (const model of candidates) model.cardSummary = undefined;
const missing = candidates.filter((model) => model.cardSummary === undefined);
console.log(`models: ${snapshot.models.length} · candidates missing a card: ${missing.length} · limit: ${limit}`);

const client = new HfClient({ token: process.env.HF_TOKEN, maxRequestsPerWindow: 400 });
const filled = await backfillCards(client, candidates, limit, { includeRejected });

console.log(`cards read:  ${client.requestsUsed} requests · excerpts stored: ${filled}`);
if (dryRun) {
  console.log("dry run: snapshot not written");
} else {
  writeFileSync(path, JSON.stringify(snapshot, null, 2));
  console.log(`snapshot written: ${path}`);
}
