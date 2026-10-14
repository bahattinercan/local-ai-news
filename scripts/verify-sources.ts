import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SOURCES } from "../src/lib/sources/registry.ts";
import { HfClient } from "../src/lib/sources/hf.ts";
import { printSourceHealth } from "../src/lib/ingest.ts";

const dry = process.argv.includes("--dry");

async function live(): Promise<Array<{ key: string; status: number | string; items: number; note: string }>> {
  const client = new HfClient();
  const rows: Array<{ key: string; status: number | string; items: number; note: string }> = [];

  const checks: Array<{ key: string; run: () => Promise<number> }> = [
    { key: "hf_models", run: async () => (await client.listModels({ pipelineTag: "text-to-image", sort: "createdAt", limit: 5 })).items.length },
    { key: "hf_model_detail", run: async () => Object.keys(await client.getModel("unsloth/LTX-2.5-FP8")).length },
    { key: "hf_trending", run: async () => (await client.getTrending()).length },
    { key: "hf_daily_papers", run: async () => (await client.getDailyPapers()).length }
  ];

  for (const check of checks) {
    try {
      const items = await check.run();
      rows.push({ key: check.key, status: 200, items, note: SOURCES.find((s) => s.key === check.key)?.note ?? "" });
    } catch (error) {
      rows.push({ key: check.key, status: "fail", items: 0, note: (error as Error).message });
    }
  }

  for (const known of ["hf_blog_rss", "hf_users", "hf_organizations"]) {
    rows.push({ key: known, status: "disabled", items: 0, note: SOURCES.find((s) => s.key === known)?.note ?? "" });
  }

  return rows;
}

function fixture(): Array<{ key: string; status: number | string; items: number; note: string }> {
  const path = join(process.cwd(), "tests", "fixtures", "source-health.json");
  const data = JSON.parse(readFileSync(path, "utf-8")) as Array<{ key: string; status: number | string; items: number; note: string }>;
  return data;
}

const rows = dry ? fixture() : await live();
printSourceHealth(rows);

const failed = rows.filter((row) => row.status === "fail");
console.log(`\n${rows.length} sources checked, ${failed.length} failed, requests used: ${dry ? 0 : 'see table'}`);

if (!dry && failed.length > 0) process.exit(1);
