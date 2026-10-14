import { runIngest } from "../src/lib/ingest.ts";

function arg(name: string, fallback: number): number {
  const match = process.argv.find((a) => a.startsWith(`--${name}=`));
  return match ? Number(match.split("=")[1]) : fallback;
}

const dryRun = process.argv.includes("--dry");

const result = await runIngest({
  dryRun,
  maxPerCategory: arg("max-per-category", 200),
  pagesPerCategory: arg("pages", 2),
  windowDays: arg("window-days", 7),
  token: process.env.HF_TOKEN,
  maxRequests: 92
});

console.log("INGEST REPORT");
console.log(`mode:              ${dryRun ? "dry" : "write"}`);
console.log(`items scanned:     ${result.itemsTotal}`);
console.log(`items new:         ${result.itemsNew}`);
console.log(`gate passed:       ${result.itemsGatePassed}`);
console.log(`news rows:         ${result.newsCount}`);
console.log(`requests used:     ${result.requestsUsed} / 92 budget`);
console.log(`snapshot:          ${result.snapshotPath ?? "not written"}`);
console.log("\nCATEGORY DISTRIBUTION");
for (const [key, count] of Object.entries(result.categoryDistribution)) {
  console.log(`  ${key.padEnd(12)} ${count}`);
}
