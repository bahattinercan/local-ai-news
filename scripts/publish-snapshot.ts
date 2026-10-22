import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { put } from "@vercel/blob";

/* Scripts do not load .env the way the Next.js app does, so read it here. */
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^"|"$/g, "");
    }
  }
}

/**
 * Publishes data/feed.json to Vercel Blob (decision 2 reversed: no Postgres).
 * The app reads it through SNAPSHOT_URL, or discovers it via BLOB_READ_WRITE_TOKEN.
 */
const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error("BLOB_READ_WRITE_TOKEN is not set - cannot publish the snapshot.");
  process.exit(1);
}

const path = join(process.cwd(), "data", "feed.json");
if (!existsSync(path)) {
  console.error(`No snapshot at ${path}. Run npm run ingest first.`);
  process.exit(1);
}

const body = readFileSync(path, "utf-8");
let blob;
try {
  blob = await put("feed.json", body, { access: "public", token, allowOverwrite: true });
} catch (error) {
  if (error instanceof Error && error.message.includes("private access")) {
    console.warn("store is private - uploading with private access (the app reads it with the token)");
    blob = await put("feed.json", body, { access: "private", token, allowOverwrite: true });
  } else {
    throw error;
  }
}

console.log("SNAPSHOT PUBLISHED");
console.log(`url:      ${blob.url}`);
console.log(`pathname: ${blob.pathname}`);
console.log(`set SNAPSHOT_URL=${blob.url} in your environment`);
