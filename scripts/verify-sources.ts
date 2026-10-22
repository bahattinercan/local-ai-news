import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCES, type SourceDefinition } from "../src/lib/sources/registry.ts";
import { HfClient } from "../src/lib/sources/hf.ts";
import { fetchFeed } from "../src/lib/sources/feeds.ts";
import { printSourceHealth } from "../src/lib/ingest.ts";

const dry = process.argv.includes("--dry");

type Row = { key: string; status: number | string; items: number; note: string };

/**
 * Hugging Face endpoints each need a different call shape, so they stay an
 * explicit map. Everything else is driven from the registry, and a registry
 * entry with no check is reported as "unchecked" rather than silently omitted:
 * adding a source used to leave the CI health report quietly incomplete.
 */
const HF_CHECKS: Record<string, (_client: HfClient) => Promise<number>> = {
  hf_models: async (client) => (await client.listModels({ pipelineTag: "text-to-image", sort: "createdAt", limit: 5 })).items.length,
  hf_model_detail: async (client) => Object.keys(await client.getModel("unsloth/LTX-2.5-FP8")).length,
  hf_trending: async (client) => (await client.getTrending()).length,
  hf_daily_papers: async (client) => (await client.getDailyPapers()).length
};

async function checkOne(source: SourceDefinition, client: HfClient): Promise<Row> {
  const note = source.note ?? "";

  const hfCheck = HF_CHECKS[source.key];
  if (hfCheck) {
    try {
      return { key: source.key, status: 200, items: await hfCheck(client), note };
    } catch (error) {
      return { key: source.key, status: "fail", items: 0, note: (error as Error).message };
    }
  }

  if (source.format === "atom" || source.format === "rss") {
    try {
      const items = await fetchFeed(source.baseUrl, source.format);
      // A feed that answers 200 with zero items is not usable (gate G4).
      return items.length > 0
        ? { key: source.key, status: 200, items: items.length, note }
        : { key: source.key, status: "empty", items: 0, note: `${note} - 200 but no items` };
    } catch (error) {
      return { key: source.key, status: "fail", items: 0, note: (error as Error).message };
    }
  }

  return { key: source.key, status: "unchecked", items: 0, note: `${note} - no check implemented (format: ${source.format})` };
}

async function live(): Promise<Row[]> {
  const client = new HfClient();
  const rows: Row[] = [];

  for (const source of SOURCES) {
    if (!source.enabled) {
      rows.push({ key: source.key, status: "disabled", items: 0, note: source.note ?? "" });
      continue;
    }
    rows.push(await checkOne(source, client));
  }

  // Reddit rate-limits bursts, so a single 429 fail should not be read as
  // "the feed is gone" - print the caveat next to its row.
  return rows.map((row) =>
    row.key === "reddit_localllama" && row.status !== 200
      ? { ...row, note: `${row.note} - Reddit returns 429 on bursts; retry after a pause` }
      : row
  );
}

function fixture(): Row[] {
  const path = join(process.cwd(), "tests", "fixtures", "source-health.json");
  const data = JSON.parse(readFileSync(path, "utf-8")) as Row[];
  return data;
}

const rows = dry ? fixture() : await live();
printSourceHealth(rows);

const failed = rows.filter((row) => row.status === "fail" || row.status === "empty" || row.status === "unchecked");
const unchecked = rows.filter((row) => row.status === "unchecked");
console.log(`\n${rows.length} sources checked, ${failed.length} failed, ${unchecked.length} unchecked`);

if (!dry && failed.length > 0) process.exit(1);
