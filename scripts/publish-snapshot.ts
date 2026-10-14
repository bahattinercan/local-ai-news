import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";

/**
 * Publishes data/feed.json to Vercel Blob (decision 2 reversed: no Postgres).
 * The app reads it through SNAPSHOT_URL, or discovers it via BLOB_READ_WRITE_TOKEN.
 */
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set — cannot publish the snapshot.");
  process.exit(1);
}

const path = join(process.cwd(), "data", "feed.json");
if (!existsSync(path)) {
  console.error(`No snapshot at ${path}. Run npm run ingest first.`);
  process.exit(1);
}

const body = readFileSync(path, "utf-8");
const blob = await put("feed.json", body, { access: "public", token, allowOverwrite: true });

console.log("SNAPSHOT PUBLISHED");
console.log(`url:      ${blob.url}`);
console.log(`pathname: ${blob.pathname}`);
console.log(`set SNAPSHOT_URL=${blob.url} in your environment`);
