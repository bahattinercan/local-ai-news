import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyModel } from "../src/lib/classify/rules.ts";

const fixtures = JSON.parse(
  readFileSync(join(process.cwd(), "tests", "fixtures", "classify-fixtures.json"), "utf-8")
) as Array<{ id: string; pipelineTag: string | null; tags: string[]; expected: string }>;

let mismatches = 0;

console.log("CLASSIFY CHECK");
for (const fixture of fixtures) {
  const { primary } = classifyModel({
    externalId: fixture.id,
    pipelineTag: fixture.pipelineTag,
    name: fixture.id.split("/")[1] ?? fixture.id,
    author: fixture.id.split("/")[0],
    tags: fixture.tags
  });

  const ok = primary === fixture.expected;
  if (!ok) mismatches += 1;
  console.log(`${ok ? "ok  " : "FAIL"} ${fixture.id.padEnd(42)} ${primary.padEnd(12)} expected ${fixture.expected}`);
}

console.log(`\n${fixtures.length} fixtures, ${mismatches} mismatches`);
if (mismatches > 0) process.exit(1);
