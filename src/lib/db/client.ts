import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof createDb>;

function createDb(url: string) {
  return drizzle(neon(url), { schema });
}

let cached: Db | null = null;

export function getDb(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (!cached) cached = createDb(url);
  return cached;
}
